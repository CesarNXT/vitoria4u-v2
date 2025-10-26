import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { ConfiguracoesNegocio } from '@/lib/types';
import { isPast, differenceInDays } from 'date-fns';
import { WhatsAppAPIClient } from '@/lib/whatsapp-api';

// 📱 Configurações da Vitoria4U para enviar notificações
const VITORIA_PHONE = '5581995207521'; // Número da Vitoria
const VITORIA_TOKEN = process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN; // Token admin
const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

// 💬 Mensagens de remarketing por dias restantes
const EXPIRATION_MESSAGES = {
  3: (businessName: string, planName: string) => 
    `⚠️ *Atenção ${businessName}!*\n\n` +
    `Seu plano *${planName}* expira em *3 dias*!\n\n` +
    `📅 Não perca o acesso a:\n` +
    `✅ Lembretes automáticos 24h e 2h\n` +
    `✅ Notificações de aniversário\n` +
    `✅ Feedback automatizado\n` +
    `✅ Inteligência Artificial\n\n` +
    `💳 *Renove agora e mantenha suas automações ativas!*\n\n` +
    `Acesse: https://vitoria4u.com.br/planos`,
  
  2: (businessName: string, planName: string) =>
    `⏰ *${businessName}, faltam apenas 2 dias!*\n\n` +
    `Seu plano *${planName}* está prestes a expirar.\n\n` +
    `❌ Após a expiração você perderá:\n` +
    `• Todas as automações de WhatsApp\n` +
    `• Conexão com sua instância\n` +
    `• Lembretes de agendamentos\n` +
    `• Histórico de campanhas\n\n` +
    `💎 *Renove hoje e evite interrupções!*\n\n` +
    `Acesse: https://vitoria4u.com.br/planos`,
  
  1: (businessName: string, planName: string) =>
    `🚨 *ÚLTIMO DIA, ${businessName}!*\n\n` +
    `Seu plano *${planName}* expira *HOJE*!\n\n` +
    `⚠️ A partir de amanhã:\n` +
    `❌ Sua instância WhatsApp será desconectada\n` +
    `❌ Todas as automações serão desativadas\n` +
    `❌ Lembretes não serão mais enviados\n\n` +
    `💳 *Esta é sua última chance de renovar sem perder nada!*\n\n` +
    `Acesse AGORA: https://vitoria4u.com.br/planos`,
  
  0: (businessName: string, planName: string) =>
    `😔 *${businessName}, seu plano expirou*\n\n` +
    `Infelizmente seu plano *${planName}* expirou hoje.\n\n` +
    `📋 O que aconteceu:\n` +
    `✅ Você foi migrado para o Plano Gratuito\n` +
    `✅ Sua instância WhatsApp foi desconectada\n` +
    `✅ Todas as automações foram desativadas\n\n` +
    `💡 *Quer reativar seus recursos?*\n` +
    `Renove seu plano e recupere tudo!\n\n` +
    `Acesse: https://vitoria4u.com.br/planos`
};

// 🔔 Função para enviar notificação via WhatsApp
async function sendExpirationNotification(
  businessPhone: number,
  businessName: string,
  planName: string,
  daysLeft: number
): Promise<boolean> {
  try {
    if (!VITORIA_TOKEN) {
      console.warn('⚠️ [NOTIFICATION] Token da Vitoria não configurado');
      return false;
    }

    const message = EXPIRATION_MESSAGES[daysLeft as keyof typeof EXPIRATION_MESSAGES];
    if (!message) return false;

    const phoneFormatted = `${businessPhone}@s.whatsapp.net`;
    const messageText = message(businessName, planName);

    console.log(`📱 [NOTIFICATION] Enviando notificação de ${daysLeft} dias para ${businessName}`);

    const response = await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': VITORIA_TOKEN
      },
      body: JSON.stringify({
        number: phoneFormatted,
        text: messageText
      })
    });

    if (response.ok) {
      console.log(`✅ [NOTIFICATION] Notificação enviada com sucesso`);
      return true;
    } else {
      console.warn(`⚠️ [NOTIFICATION] Falha ao enviar: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ [NOTIFICATION] Erro ao enviar notificação:`, error);
    return false;
  }
}

function toDate(value: any): Date | null {
    if (!value) return null;
    if (value.toDate) return value.toDate();
    if (typeof value === 'string' || typeof value === 'number') {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}

export async function GET(request: Request) {
  console.log('🔄 [CHECK-EXPIRATIONS] ========================================');
  console.log('🔄 [CHECK-EXPIRATIONS] Iniciando verificação de planos expirados');
  console.log('🔄 [CHECK-EXPIRATIONS] Data/Hora:', new Date().toISOString());
  
  const authToken = (request.headers.get('authorization') || '').split('Bearer ')[1];

  if (authToken !== process.env.CRON_SECRET) {
    console.log('❌ [CHECK-EXPIRATIONS] Autenticação falhou - Token inválido');
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('✅ [CHECK-EXPIRATIONS] Autenticação bem-sucedida');

  try {
    const now = new Date();
    console.log('📅 [CHECK-EXPIRATIONS] Verificando planos com data < ', now.toISOString());
    console.log('📅 [CHECK-EXPIRATIONS] Timestamp atual:', now.getTime());
    
    // Buscar TODOS os negócios (não apenas != plano_gratis)
    const businessesSnapshot = await adminDb.collection('negocios').get();
    
    console.log(`📊 [CHECK-EXPIRATIONS] Total de negócios no banco: ${businessesSnapshot.size}`);
    
    // Filtrar manualmente os que não são plano_gratis
    const paidBusinesses = businessesSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.planId && data.planId !== 'plano_gratis';
    });
    
    console.log(`📊 [CHECK-EXPIRATIONS] Negócios com planos pagos: ${paidBusinesses.length}`);
    
    let updatedCount = 0;
    const totalReads = businessesSnapshot.size;

    const BATCH_SIZE = 30;
    const businesses = paidBusinesses; // Usar apenas negócios com planos pagos
    
    console.log(`🔄 [CHECK-EXPIRATIONS] Processando ${businesses.length} negócios em batches de ${BATCH_SIZE}...`);
    
    if (businesses.length === 0) {
      console.log('⏭️ [CHECK-EXPIRATIONS] Nenhum negócio com plano pago encontrado');
    }
    
    for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
      const batch = businesses.slice(i, i + BATCH_SIZE);
      console.log(`📦 [CHECK-EXPIRATIONS] Processando batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(businesses.length / BATCH_SIZE)} (${batch.length} negócios)`);
      
      await Promise.all(batch.map(async (businessDoc) => {
        const business = businessDoc.data() as ConfiguracoesNegocio;
        const businessId = businessDoc.id;
        const businessName = business.nome || 'Sem nome';

        console.log(`🔍 [CHECK-EXPIRATIONS] Verificando: ${businessName} (${businessId})`);
        console.log(`   └─ Plano atual: ${business.planId}`);
        console.log(`   └─ Tipo do access_expires_at:`, typeof business.access_expires_at);
        console.log(`   └─ Valor raw do access_expires_at:`, business.access_expires_at);

        if (business.planId === 'plano_gratis') {
          console.log(`   └─ ⏭️ Já está no plano gratuito, pulando...`);
          return;
        }
        
        const expirationDate = toDate(business.access_expires_at);
        
        if (!expirationDate) {
          console.log(`   └─ ⚠️ Sem data de expiração definida ou inválida`);
          console.log(`   └─ ⚠️ Valor original:`, business.access_expires_at);
          return;
        }

        console.log(`   └─ 📅 Expira em: ${expirationDate.toISOString()}`);
        console.log(`   └─ 📅 Timestamp expiração: ${expirationDate.getTime()}`);
        
        const daysLeft = differenceInDays(expirationDate, now);
        const isExpired = isPast(expirationDate);
        
        console.log(`   └─ 🕐 Está expirado? ${isExpired ? 'SIM ❌' : 'NÃO ✅'}`);
        console.log(`   └─ ⏰ Dias restantes: ${daysLeft}`);

        // 🔔 SISTEMA DE NOTIFICAÇÕES (3, 2, 1 dias antes + dia da expiração)
        if (!isExpired && (daysLeft === 3 || daysLeft === 2 || daysLeft === 1)) {
          console.log(`   └─ 🔔 Dia de notificar! (${daysLeft} dias restantes)`);
          
          // Verificar se já notificou hoje
          const lastNotification = (business as any).last_expiration_notification;
          const lastNotificationDate = lastNotification ? toDate(lastNotification) : null;
          const alreadyNotifiedToday = lastNotificationDate && 
            differenceInDays(now, lastNotificationDate) === 0;
          
          if (alreadyNotifiedToday) {
            console.log(`   └─ ⏭️ Já notificado hoje, pulando...`);
          } else {
            console.log(`   └─ 📱 Enviando notificação de remarketing...`);
            
            const planName = business.planId === 'plano_mensal' ? 'Plano Mensal' :
                           business.planId === 'plano_anual' ? 'Plano Anual' :
                           business.planId === 'premium' ? 'Premium' : business.planId;
            
            const notificationSent = await sendExpirationNotification(
              business.telefone,
              business.nome,
              planName,
              daysLeft
            );
            
            if (notificationSent) {
              // Salvar timestamp da última notificação
              await businessDoc.ref.update({
                last_expiration_notification: now
              });
              console.log(`   └─ ✅ Notificação enviada e timestamp salvo`);
            }
          }
          
          return; // Não expirou ainda, apenas notificou
        }
        
        if (!isExpired) {
          console.log(`   └─ ⏰ Faltam ${daysLeft} dias para expirar (fora do período de notificação)`);
          return;
        }
        
        console.log(`   └─ ⚠️ PLANO EXPIRADO! Iniciando downgrade...`);
        
        try {
          // 📱 GARANTIR DELEÇÃO DA INSTÂNCIA WHATSAPP
          if (business.whatsappConectado && business.tokenInstancia) {
            console.log(`   └─ 📱 WhatsApp CONECTADO. DELETANDO instância para liberar recursos...`);
            try {
              const client = new WhatsAppAPIClient(businessId, business.tokenInstancia);
              await client.deleteInstance();
              console.log(`   └─ ✅ Instância WhatsApp DELETADA com sucesso`);
            } catch (error) {
              console.error(`   └─ ❌ ERRO CRÍTICO ao deletar instância WhatsApp:`, error);
              // Mesmo com erro, continuar com downgrade
            }
          } else {
            console.log(`   └─ 📱 WhatsApp não conectado (ok)`);
          }

          // 🔔 Enviar notificação de expiração
          console.log(`   └─ 📱 Enviando notificação de expiração...`);
          const planName = business.planId === 'plano_mensal' ? 'Plano Mensal' :
                         business.planId === 'plano_anual' ? 'Plano Anual' :
                         business.planId === 'premium' ? 'Premium' : business.planId;
          
          await sendExpirationNotification(
            business.telefone,
            business.nome,
            planName,
            0 // Dia da expiração
          );

          console.log(`   └─ 🔄 Atualizando para plano gratuito...`);
          const businessDocRef = adminDb.collection('negocios').doc(businessId);
          await businessDocRef.update({
            planId: 'plano_gratis',
            whatsappConectado: false,
            tokenInstancia: null,
            habilitarLembrete24h: false,
            habilitarLembrete2h: false,
            habilitarFeedback: false,
            habilitarAniversario: false,
            iaAtiva: false,
            last_expiration_notification: now, // Registrar notificação final
          });
          
          console.log(`   └─ ✅ Downgrade concluído: ${businessName} → plano_gratis`);
          console.log(`   └─ ✅ Notificação de expiração enviada`);
          updatedCount++;
        } catch (error) {
          console.error(`   └─ ❌ Erro ao processar ${businessId}:`, error);
        }
      }));
    }
    
    console.log('🎯 [CHECK-EXPIRATIONS] ========================================');
    console.log('📊 [CHECK-EXPIRATIONS] RESUMO FINAL:');
    console.log(`   ├─ Total no banco: ${businessesSnapshot.size} negócios`);
    console.log(`   ├─ Com planos pagos: ${paidBusinesses.length} negócios`);
    console.log(`   ├─ Planos expirados: ${updatedCount}`);
    console.log(`   ├─ Firestore reads: ${totalReads}`);
    console.log(`   └─ Status: ${updatedCount > 0 ? '✅ Downgrades realizados' : '✅ Nenhum plano expirado'}`);
    console.log('🎯 [CHECK-EXPIRATIONS] Verificação concluída com sucesso!');
    console.log('🔄 [CHECK-EXPIRATIONS] ========================================');
    
    return NextResponse.json({ 
      success: true,
      message: `Verificação concluída. ${updatedCount} planos expirados detectados e atualizados.`,
      totalBusinesses: businessesSnapshot.size,
      paidBusinesses: paidBusinesses.length,
      updatedBusinesses: updatedCount,
      totalReads,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [CHECK-EXPIRATIONS] ERRO CRÍTICO:', error);
    console.error('❌ [CHECK-EXPIRATIONS] Stack trace:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
