import { MercadoPagoConfig, MerchantOrder, PreApproval, Payment } from 'mercadopago';
import { NextResponse } from 'next/server';
import { doc, updateDoc, serverTimestamp, addDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-server';
import type { Plano } from '@/lib/types'; // Importa o tipo Plano
import crypto from 'crypto';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET!;

// Função para verificar a assinatura do webhook
function verifySignature(request: Request, rawBody: string) {
    const signature = request.headers.get('x-signature');
    const requestId = request.headers.get('x-request-id');
    if (!signature || !requestId) return false;

    const parts = signature.split(',');
    const ts = parts.find(part => part.startsWith('ts='))?.split('=')[1];
    const hash = parts.find(part => part.startsWith('v1='))?.split('=')[1];

    if (!ts || !hash) return false;

    const manifest = `id:${requestId};request-id:${requestId};ts:${ts};`;
    const signedMessage = crypto.createHmac('sha256', webhookSecret)
        .update(manifest + rawBody)
        .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signedMessage), Buffer.from(hash));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const body = JSON.parse(rawBody);

  // A verificação de assinatura está desativada temporariamente para depuração
  // if (!verifySignature(request, rawBody)) {
  //   return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 403 });
  // }

  const { type: bodyType, data: bodyData, action } = body;
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  
  // Priorizar dados da URL sobre o body (mais confiável)
  const type = url.searchParams.get('type') || bodyType;
  const dataId = url.searchParams.get('data.id') || bodyData?.id;

  console.log('Webhook recebido:', { 
    typeFromUrl: url.searchParams.get('type'),
    typeFromBody: bodyType,
    typeFinal: type,
    action, 
    dataId, 
    userId, 
    url: request.url 
  });

  try {
    // NOVO: Tratar webhooks de pagamento único (Checkout Pro)
    if (type === 'payment') {
        console.log('Processando webhook de pagamento único com ID:', dataId);
        const payment = new Payment(client);
        const paymentData = await payment.get({ id: dataId });

        console.log('Dados do pagamento recebido:', { 
            id: paymentData.id, 
            status: paymentData.status, 
            external_reference: paymentData.external_reference,
            order_id: paymentData.order?.id
        });

        // Apenas processa se o pagamento foi aprovado
        if (paymentData.status === 'approved') {
            const userId = paymentData.external_reference;
            // Corrige o acesso aos itens do carrinho e o tipo
            const planId = (paymentData.additional_info as any)?.items?.[0]?.id;

            if (userId && planId) {
                const userDocRef = doc(firestore, 'negocios', userId);
                const planDocRef = doc(firestore, 'planos', planId);

                const [userDoc, planDoc] = await Promise.all([getDoc(userDocRef), getDoc(planDocRef)]);

                if (userDoc.exists() && planDoc.exists()) {
                    const planData = planDoc.data() as Plano;
                    const durationInDays = planData.durationInDays || 30; // Fallback para 30 dias

                    const accessExpiresAt = new Date();
                    accessExpiresAt.setDate(accessExpiresAt.getDate() + durationInDays);

                    await updateDoc(userDocRef, {
                        planId: planId, // Garante que o planId do usuário está atualizado
                        mp: { 
                            lastPaymentId: paymentData.id,
                            lastPaymentStatus: paymentData.status,
                            paymentMethod: paymentData.payment_method_id,
                            paymentType: paymentData.payment_type_id,
                        },
                        access_expires_at: accessExpiresAt,
                    });
                    console.log(`Acesso liberado para o usuário ${userId} por ${durationInDays} dias, até ${accessExpiresAt.toISOString()}`);
                } else {
                    if (!userDoc.exists()) console.error(`Usuário com ID ${userId} não encontrado no Firestore.`);
                    if (!planDoc.exists()) console.error(`Plano com ID ${planId} não encontrado no Firestore.`);
                }
            } else {
                console.error('Pagamento aprovado, mas sem external_reference (userId) ou ID do plano.');
            }
        }
    }
    // Tratar webhooks de assinatura (preapproval) - LÓGICA ANTIGA
    else if (type === 'preapproval' || type === 'subscription_preapproval') {
        console.log('Processando webhook de assinatura com ID:', dataId);
        const preapproval = new PreApproval(client);
        const subscription = await preapproval.get({ id: dataId });
        console.log('Assinatura encontrada:', { id: subscription.id, status: subscription.status, external_reference: subscription.external_reference });

        const externalReference = subscription.external_reference;
        
        // Priorizar userId da URL, depois external_reference da assinatura
        const finalUserId = userId || externalReference;
        console.log('UserId final usado:', finalUserId);

        if (finalUserId) {
            const userDocRef = doc(firestore, 'negocios', finalUserId);
            
            // Buscar o plano correto pelo reason ou preapproval_plan_id
            let planName = subscription.reason; // Usar reason como fallback
            
            try {
                // Tentar buscar o plano pelo preapproval_plan_id se disponível
                const preapprovalPlanId = (subscription as any).preapproval_plan_id;
                if (preapprovalPlanId) {
                    const plansRef = collection(firestore, 'planos');
                    const plansSnapshot = await getDocs(plansRef);
                    
                    plansSnapshot.forEach(doc => {
                        const planData = doc.data();
                        if (planData.mercadoPagoId === preapprovalPlanId || doc.id === preapprovalPlanId) {
                            planName = planData.name;
                        }
                    });
                }
            } catch (error) {
                console.log('Erro ao buscar plano, usando reason como fallback:', error);
            }

            // Acessamos como 'any' para contornar a tipagem incorreta do SDK
            const nextInvoiceDate = (subscription as any).next_invoice_date;
            // Garante que o valor seja null se a data não existir, para evitar erro no Firestore
            const accessExpiresAt = nextInvoiceDate ? new Date(nextInvoiceDate) : null;

            await updateDoc(userDocRef, {
                planId: planName, // Salva o nome do plano
                mp: { // Usando um objeto para agrupar dados do MP
                    preapprovalId: subscription.id,
                    status: subscription.status,
                },
                access_expires_at: accessExpiresAt,
            });
            console.log(`Assinatura ${subscription.status} para o usuário: ${finalUserId} com o plano ${planName}`);
        }
    }
    // Tratar webhooks de pagamento autorizado de assinatura
    else if (type === 'subscription_authorized_payment' || type === 'payment') {
        console.log('Processando webhook de pagamento autorizado com ID:', dataId);
        
        try {
            // Primeiro, tentar buscar como pagamento
            const payment = new Payment(client);
            const paymentData = await payment.get({ id: dataId });
            // Acessar preapproval_id usando type assertion pois não está na tipagem oficial
            const preapprovalId = (paymentData as any).preapproval_id;
            
            console.log('Pagamento encontrado:', { 
                id: paymentData.id, 
                status: paymentData.status, 
                external_reference: paymentData.external_reference,
                preapproval_id: preapprovalId 
            });

            // Para pagamentos de assinatura, usar o preapproval_id para buscar a assinatura
            if (preapprovalId) {
                console.log('Buscando assinatura relacionada ao pagamento:', preapprovalId);
                const preapproval = new PreApproval(client);
                const subscription = await preapproval.get({ id: preapprovalId });
                
                const externalReference = subscription.external_reference || paymentData.external_reference;
                const finalUserId = userId || externalReference;
                
                console.log('Dados da assinatura relacionada:', {
                    id: subscription.id,
                    status: subscription.status,
                    external_reference: externalReference,
                    userId: finalUserId
                });

                if (finalUserId && paymentData.status === 'approved') {
                    const userDocRef = doc(firestore, 'negocios', finalUserId);
                    
                    // Buscar o plano correto pelo reason ou preapproval_plan_id
                    let planName = subscription.reason; // Usar reason como fallback
                    
                    try {
                        // Tentar buscar o plano pelo preapproval_plan_id se disponível
                        const preapprovalPlanId = (subscription as any).preapproval_plan_id;
                        if (preapprovalPlanId) {
                            const plansRef = collection(firestore, 'planos');
                            const plansSnapshot = await getDocs(plansRef);
                            
                            plansSnapshot.forEach(doc => {
                                const planData = doc.data();
                                if (planData.mercadoPagoId === preapprovalPlanId || doc.id === preapprovalPlanId) {
                                    planName = planData.name;
                                }
                            });
                        }
                    } catch (error) {
                        console.log('Erro ao buscar plano, usando reason como fallback:', error);
                    }
                    
                    const nextInvoiceDate = (subscription as any).next_invoice_date;
                    const accessExpiresAt = nextInvoiceDate ? new Date(nextInvoiceDate) : null;

                    await updateDoc(userDocRef, {
                        planId: planName, // Usar o nome do plano
                        mp: {
                            preapprovalId: subscription.id,
                            status: subscription.status,
                            lastPaymentId: paymentData.id,
                            lastPaymentStatus: paymentData.status,
                        },
                        access_expires_at: accessExpiresAt,
                    });
                    console.log(`Pagamento aprovado para assinatura ${subscription.id} do usuário: ${finalUserId} com plano: ${planName}`);
                }
            } else {
                console.log('Pagamento não está relacionado a uma assinatura');
            }
        } catch (paymentError) {
            console.log('ID não é um pagamento, tentando buscar plano pelo mercadoPagoId:', dataId);
            
            // Se não for um pagamento, buscar o plano pelo mercadoPagoId
            if (userId) {
                try {
                    // Buscar o plano que tem este mercadoPagoId
                    const plansRef = collection(firestore, 'planos');
                    const plansSnapshot = await getDocs(plansRef);
                    
                    let planName = null;
                    plansSnapshot.forEach(doc => {
                        const planData = doc.data();
                        if (planData.mercadoPagoId === dataId || doc.id === dataId) {
                            planName = planData.name;
                        }
                    });
                    
                    if (planName) {
                        console.log('Plano encontrado:', planName, 'para mercadoPagoId:', dataId);
                        const userDocRef = doc(firestore, 'negocios', userId);
                        
                        await updateDoc(userDocRef, {
                            planId: planName, // Usar o nome do plano, não o ID do MercadoPago
                            mp: {
                                status: 'active',
                                lastUpdated: new Date(),
                                mercadoPagoId: dataId,
                            },
                        });
                        console.log(`Plano ${planName} ativado para o usuário: ${userId}`);
                    } else {
                        console.log('Plano não encontrado para mercadoPagoId:', dataId);
                        // Fallback: usar o dataId como planId (comportamento anterior)
                        const userDocRef = doc(firestore, 'negocios', userId);
                        await updateDoc(userDocRef, {
                            planId: dataId,
                            mp: {
                                status: 'active',
                                lastUpdated: new Date(),
                            },
                        });
                        console.log(`Plano ${dataId} ativado para o usuário: ${userId} (fallback)`);
                    }
                } catch (planSearchError) {
                    console.error('Erro ao buscar plano:', planSearchError);
                    throw paymentError; // Re-throw o erro original se não conseguir processar
                }
            } else {
                console.log('Não foi possível processar: nem pagamento nem userId válido');
                throw paymentError; // Re-throw o erro original se não conseguir processar
            }
        }
    }
    else {
        console.log('Tipo de webhook não reconhecido:', type);
        return NextResponse.json({ 
            received: true, 
            message: `Tipo de webhook '${type}' não é processado por este endpoint` 
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook do Mercado Pago:', error);

    // Salva o webhook falho no Firestore para análise posterior
    try {
      const erroredWebhooksRef = collection(firestore, 'errored_webhooks');
      await addDoc(erroredWebhooksRef, {
        error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        body: body,
        headers: JSON.stringify(Object.fromEntries(request.headers.entries())),
        receivedAt: serverTimestamp(),
      });
    } catch (dbError) {
      console.error('Falha ao salvar o webhook com erro no Firestore:', dbError);
    }

    return NextResponse.json({ error: 'Falha no processamento do webhook.' }, { status: 500 });
  }
}
