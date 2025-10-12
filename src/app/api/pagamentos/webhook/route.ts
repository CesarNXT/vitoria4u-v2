import { MercadoPagoConfig, MerchantOrder, PreApproval, Payment } from 'mercadopago';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Plano } from '@/lib/types'; // Importa o tipo Plano
import crypto from 'crypto';
import { logger, sanitizeForLog } from '@/lib/logger';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET!;

// Função para verificar a assinatura do webhook (Documentação oficial MercadoPago v1)
function verifySignature(request: Request, rawBody: string, dataId: string) {
    logger.debug('🔍 Verificando assinatura do webhook');
    
    const signature = request.headers.get('x-signature');
    const requestId = request.headers.get('x-request-id');
    
    logger.debug('Headers recebidos', {
        signature: signature ? 'presente' : 'ausente',
        requestId: requestId ? 'presente' : 'ausente',
        dataId: dataId || 'não fornecido'
    });
    
    if (!signature || !requestId) {
        logger.error('❌ Headers x-signature ou x-request-id ausentes');
        return false;
    }

    // Extrair partes da assinatura
    const parts = signature.split(',');
    const ts = parts.find(part => part.startsWith('ts='))?.split('=')[1];
    const hash = parts.find(part => part.startsWith('v1='))?.split('=')[1];

    if (!ts || !hash) {
        logger.error('❌ Não foi possível extrair ts ou hash da assinatura');
        logger.error('Assinatura recebida', { signature });
        return false;
    }

    // 🔑 FORMATO CORRETO segundo documentação MercadoPago:
    // manifest = "id:{data.id};request-id:{x-request-id};ts:{ts};"
    // Note: usa data.id (não request-id duplicado) + NÃO inclui rawBody
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    
    logger.debug('📝 Manifest criado', { manifest });
    
    const signedMessage = crypto.createHmac('sha256', webhookSecret)
        .update(manifest)
        .digest('hex');

    const isValid = crypto.timingSafeEqual(Buffer.from(signedMessage), Buffer.from(hash));
    
    // 🐛 DEBUG: Detalhes da validação
    if (!isValid) {
        logger.error('🔍 DEBUG da assinatura FALHOU', {
            dataId,
            requestId,
            timestamp: ts,
            secretConfigured: webhookSecret ? 'SIM' : 'NÃO',
            secretLength: webhookSecret ? webhookSecret.length : 0
        });
    }
    
    logger.info(`🔐 Assinatura ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    
    return isValid;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const body = JSON.parse(rawBody);

  const { type: bodyType, data: bodyData, action } = body;
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  
  // Priorizar dados da URL sobre o body (mais confiável)
  const type = url.searchParams.get('type') || bodyType;
  const dataId = url.searchParams.get('data.id') || bodyData?.id;

  // 🔒 SEGURANÇA: Validação de assinatura do MercadoPago
  if (!verifySignature(request, rawBody, dataId || '')) {
    logger.error('🚨 WEBHOOK REJEITADO: Assinatura inválida detectada');
    logger.error('Verifique se o MERCADOPAGO_WEBHOOK_SECRET está correto');
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 403 });
  }
  
  logger.success('✅ Webhook validado com sucesso');

  logger.info('Webhook recebido', sanitizeForLog({ 
    typeFromUrl: url.searchParams.get('type'),
    typeFromBody: bodyType,
    typeFinal: type,
    action, 
    dataId, 
    userId, 
    url: request.url 
  }));

  try {
    // NOVO: Tratar webhooks de pagamento único (Checkout Pro)
    if (type === 'payment') {
        logger.info('🔔 Processando webhook de pagamento único', { id: dataId });
        const payment = new Payment(client);
        const paymentData = await payment.get({ id: dataId });

        logger.info('📦 Dados do pagamento recebido', sanitizeForLog({ 
            id: paymentData.id, 
            status: paymentData.status, 
            external_reference: paymentData.external_reference,
            order_id: paymentData.order?.id,
            payment_method: paymentData.payment_method_id,
            payment_type: paymentData.payment_type_id
        }));

        // Log detalhado do additional_info para debug
        logger.debug('📋 Additional Info', sanitizeForLog((paymentData as any).additional_info));

        // Apenas processa se o pagamento foi aprovado
        if (paymentData.status === 'approved') {
            const userId = paymentData.external_reference;
            
            // Tenta múltiplas formas de obter o planId
            let planId = (paymentData.additional_info as any)?.items?.[0]?.id;
            
            // Fallback: tentar pegar do metadata
            if (!planId) {
                logger.warn('⚠️ planId não encontrado em additional_info.items, tentando metadata');
                planId = (paymentData as any).metadata?.plan_id;
            }
            
            // Fallback: tentar pegar da description se formatado como JSON
            if (!planId && paymentData.description) {
                logger.warn('⚠️ planId não encontrado em metadata, tentando description');
                try {
                    const descData = JSON.parse(paymentData.description);
                    planId = descData.planId;
                } catch (e) {
                    // description não é JSON, ignorar
                }
            }

            logger.info('🔍 Extraído - userId e planId', sanitizeForLog({ userId, planId }));

            if (userId && planId) {
                const userDocRef = adminDb.collection('negocios').doc(userId);
                const planDocRef = adminDb.collection('planos').doc(planId);

                const [userDoc, planDoc] = await Promise.all([userDocRef.get(), planDocRef.get()]);

                if (userDoc.exists && planDoc.exists) {
                    const planData = planDoc.data() as Plano;
                    const durationInDays = planData.durationInDays || 30; // Fallback para 30 dias

                    const accessExpiresAt = new Date();
                    accessExpiresAt.setDate(accessExpiresAt.getDate() + durationInDays);

                    await userDocRef.update({
                        planId: planId, // Garante que o planId do usuário está atualizado
                        mp: { 
                            lastPaymentId: paymentData.id,
                            lastPaymentStatus: paymentData.status,
                            paymentMethod: paymentData.payment_method_id,
                            paymentType: paymentData.payment_type_id,
                        },
                        access_expires_at: accessExpiresAt,
                    });
                    logger.success(`Acesso liberado para o usuário por ${durationInDays} dias`, { userId, expiresAt: accessExpiresAt.toISOString() });
                } else {
                    if (!userDoc.exists) logger.error(`Usuário não encontrado`, { userId });
                    if (!planDoc.exists) logger.error(`Plano não encontrado`, { planId });
                }
            } else {
                logger.error('Pagamento aprovado mas faltam dados', sanitizeForLog({ userId, planId }));
            }
        } else {
            logger.info(`Pagamento com status não processado`, { status: paymentData.status });
        }
    }
    // Tratar webhooks de assinatura (preapproval) - LÓGICA ANTIGA
    else if (type === 'preapproval' || type === 'subscription_preapproval') {
        logger.info('Processando webhook de assinatura', { id: dataId });
        const preapproval = new PreApproval(client);
        const subscription = await preapproval.get({ id: dataId });
        logger.debug('Assinatura encontrada', { id: subscription.id, status: subscription.status });

        const externalReference = subscription.external_reference;
        
        // Priorizar userId da URL, depois external_reference da assinatura
        const finalUserId = userId || externalReference;
        logger.debug('UserId final usado', { finalUserId });

        if (finalUserId) {
            const userDocRef = adminDb.collection('negocios').doc(finalUserId);
            
            // Buscar o plano correto pelo reason ou preapproval_plan_id
            let planName = subscription.reason; // Usar reason como fallback
            
            try {
                // Tentar buscar o plano pelo preapproval_plan_id se disponível
                const preapprovalPlanId = (subscription as any).preapproval_plan_id;
                if (preapprovalPlanId) {
                    const plansRef = adminDb.collection('planos');
                    const plansSnapshot = await plansRef.get();
                    
                    plansSnapshot.forEach((doc: any) => {
                        const planData = doc.data();
                        if (planData.mercadoPagoId === preapprovalPlanId || doc.id === preapprovalPlanId) {
                            planName = planData.name;
                        }
                    });
                }
            } catch (error) {
                logger.warn('Erro ao buscar plano, usando reason como fallback', sanitizeForLog(error));
            }

            // Acessamos como 'any' para contornar a tipagem incorreta do SDK
            const nextInvoiceDate = (subscription as any).next_invoice_date;
            // Garante que o valor seja null se a data não existir, para evitar erro no Firestore
            const accessExpiresAt = nextInvoiceDate ? new Date(nextInvoiceDate) : null;

            await userDocRef.update({
                planId: planName, // Salva o nome do plano
                mp: { // Usando um objeto para agrupar dados do MP
                    preapprovalId: subscription.id,
                    status: subscription.status,
                },
                access_expires_at: accessExpiresAt,
            });
            logger.success(`Assinatura atualizada`, { status: subscription.status, userId: finalUserId, planName });
        }
    }
    // Tratar webhooks de pagamento autorizado de assinatura
    else if (type === 'subscription_authorized_payment' || type === 'payment') {
        logger.info('Processando webhook de pagamento autorizado', { id: dataId });
        
        try {
            // Primeiro, tentar buscar como pagamento
            const payment = new Payment(client);
            const paymentData = await payment.get({ id: dataId });
            // Acessar preapproval_id usando type assertion pois não está na tipagem oficial
            const preapprovalId = (paymentData as any).preapproval_id;
            
            logger.debug('Pagamento encontrado', sanitizeForLog({ 
                id: paymentData.id, 
                status: paymentData.status, 
                external_reference: paymentData.external_reference,
                preapproval_id: preapprovalId 
            }));

            // Para pagamentos de assinatura, usar o preapproval_id para buscar a assinatura
            if (preapprovalId) {
                logger.debug('Buscando assinatura relacionada ao pagamento', { preapprovalId });
                const preapproval = new PreApproval(client);
                const subscription = await preapproval.get({ id: preapprovalId });
                
                const externalReference = subscription.external_reference || paymentData.external_reference;
                const finalUserId = userId || externalReference;
                
                logger.debug('Dados da assinatura relacionada', sanitizeForLog({
                    id: subscription.id,
                    status: subscription.status,
                    external_reference: externalReference,
                    userId: finalUserId
                }));

                if (finalUserId && paymentData.status === 'approved') {
                    const userDocRef = adminDb.collection('negocios').doc(finalUserId);
                    
                    // Buscar o plano correto pelo reason ou preapproval_plan_id
                    let planName = subscription.reason; // Usar reason como fallback
                    
                    try {
                        // Tentar buscar o plano pelo preapproval_plan_id se disponível
                        const preapprovalPlanId = (subscription as any).preapproval_plan_id;
                        if (preapprovalPlanId) {
                            const plansRef = adminDb.collection('planos');
                            const plansSnapshot = await plansRef.get();
                            
                            plansSnapshot.forEach((doc: any) => {
                                const planData = doc.data();
                                if (planData.mercadoPagoId === preapprovalPlanId || doc.id === preapprovalPlanId) {
                                    planName = planData.name;
                                }
                            });
                        }
                    } catch (error) {
                        logger.warn('Erro ao buscar plano, usando reason como fallback', sanitizeForLog(error));
                    }
                    
                    const nextInvoiceDate = (subscription as any).next_invoice_date;
                    const accessExpiresAt = nextInvoiceDate ? new Date(nextInvoiceDate) : null;

                    await userDocRef.update({
                        planId: planName, // Usar o nome do plano
                        mp: {
                            preapprovalId: subscription.id,
                            status: subscription.status,
                            lastPaymentId: paymentData.id,
                            lastPaymentStatus: paymentData.status,
                        },
                        access_expires_at: accessExpiresAt,
                    });
                    logger.success('Pagamento aprovado para assinatura', { subscriptionId: subscription.id, userId: finalUserId, planName });
                }
            } else {
                logger.info('Pagamento não está relacionado a uma assinatura');
            }
        } catch (paymentError) {
            logger.debug('ID não é um pagamento, tentando buscar plano pelo mercadoPagoId', { dataId });
            
            // Se não for um pagamento, buscar o plano pelo mercadoPagoId
            if (userId) {
                try {
                    // Buscar o plano que tem este mercadoPagoId
                    const plansRef = adminDb.collection('planos');
                    const plansSnapshot = await plansRef.get();
                    
                    let planName = null;
                    plansSnapshot.forEach((doc: any) => {
                        const planData = doc.data();
                        if (planData.mercadoPagoId === dataId || doc.id === dataId) {
                            planName = planData.name;
                        }
                    });
                    
                    if (planName) {
                        logger.info('Plano encontrado', { planName, mercadoPagoId: dataId });
                        const userDocRef = adminDb.collection('negocios').doc(userId);
                        
                        await userDocRef.update({
                            planId: planName, // Usar o nome do plano, não o ID do MercadoPago
                            mp: {
                                status: 'active',
                                lastUpdated: new Date(),
                                mercadoPagoId: dataId,
                            },
                        });
                        logger.success('Plano ativado', { planName, userId });
                    } else {
                        logger.warn('Plano não encontrado, usando fallback', { mercadoPagoId: dataId });
                        // Fallback: usar o dataId como planId (comportamento anterior)
                        const userDocRef = adminDb.collection('negocios').doc(userId);
                        await userDocRef.update({
                            planId: dataId,
                            mp: {
                                status: 'active',
                                lastUpdated: new Date(),
                            },
                        });
                        logger.success('Plano ativado (fallback)', { planId: dataId, userId });
                    }
                } catch (planSearchError) {
                    logger.error('Erro ao buscar plano', sanitizeForLog(planSearchError));
                    throw paymentError; // Re-throw o erro original se não conseguir processar
                }
            } else {
                logger.error('Não foi possível processar: nem pagamento nem userId válido');
                throw paymentError; // Re-throw o erro original se não conseguir processar
            }
        }
    }
    else {
        logger.warn('Tipo de webhook não reconhecido', { type });
        return NextResponse.json({ 
            received: true, 
            message: `Tipo de webhook '${type}' não é processado por este endpoint` 
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Erro ao processar webhook do Mercado Pago', sanitizeForLog(error));

    // Salva o webhook falho no Firestore para análise posterior
    try {
      const erroredWebhooksRef = adminDb.collection('errored_webhooks');
      await erroredWebhooksRef.add({
        error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        body: body,
        headers: JSON.stringify(Object.fromEntries(request.headers.entries())),
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (dbError) {
      console.error('Falha ao salvar o webhook com erro no Firestore:', dbError);
    }

    return NextResponse.json({ error: 'Falha no processamento do webhook.' }, { status: 500 });
  }
}
