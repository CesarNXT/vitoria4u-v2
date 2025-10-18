import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { notifyReminder24h, notifyReminder2h } from '@/lib/notifications';

/**
 * CRON JOB: Processa e envia lembretes agendados
 * 
 * Roda a cada 15 minutos
 * Busca APENAS reminders que devem executar AGORA
 * Custo: ~100-200 leituras por execução (super eficiente!)
 */
export async function GET(request: Request) {
  // Verificar autenticação do cron
  const authToken = (request.headers.get('authorization') || '').split('Bearer ')[1];

  if (authToken !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const agora = new Date();
  let processados = 0;
  let enviados = 0;
  let cancelados = 0;
  let erros = 0;

  try {
    // Buscar APENAS reminders pendentes que devem executar AGORA
    const reminders = await adminDb
      .collection('scheduled_reminders')
      .where('status', '==', 'pending')
      .where('executeAt', '<=', agora)
      .limit(100) // Processa 100 por vez
      .get();

    if (reminders.empty) {
      return NextResponse.json({ 
        message: 'Nenhum lembrete para enviar',
        processados: 0,
        enviados: 0,
        timestamp: agora 
      });
    }

    for (const reminderDoc of reminders.docs) {
      const reminder = reminderDoc.data();
      processados++;

      try {
        // 1. Verificar se agendamento ainda existe e está ativo
        const agendamentoDoc = await adminDb.doc(reminder.agendamentoPath).get();

        if (!agendamentoDoc.exists) {
          // Agendamento foi deletado
          await reminderDoc.ref.update({
            status: 'cancelled',
            cancelReason: 'appointment_deleted',
            cancelledAt: agora
          });
          cancelados++;
          continue;
        }

        const agendamento = agendamentoDoc.data();

        // 2. Verificar se agendamento ainda está ativo
        if (agendamento?.status !== 'Agendado' && agendamento?.status !== 'Confirmado') {
          // Foi cancelado ou status mudou
          await reminderDoc.ref.update({
            status: 'cancelled',
            cancelReason: `appointment_status_${agendamento?.status}`,
            cancelledAt: agora
          });
          cancelados++;
          continue;
        }

        // 3. Verificar se WhatsApp ainda está conectado
        const businessDoc = await adminDb.doc(`negocios/${reminder.businessId}`).get();
        const businessData = businessDoc.data();

        if (!businessData?.whatsappConectado || !businessData?.tokenInstancia) {
          await reminderDoc.ref.update({
            status: 'cancelled',
            cancelReason: 'whatsapp_disconnected',
            cancelledAt: agora
          });
          cancelados++;
          continue;
        }

        // 4. Verificar se funcionalidade está habilitada
        const is24h = reminder.type === '24h';
        const is2h = reminder.type === '2h';

        if (is24h && businessData.habilitarLembrete24h === false) {
          await reminderDoc.ref.update({
            status: 'cancelled',
            cancelReason: 'feature_disabled_24h',
            cancelledAt: agora
          });
          cancelados++;
          continue;
        }

        if (is2h && businessData.habilitarLembrete2h === false) {
          await reminderDoc.ref.update({
            status: 'cancelled',
            cancelReason: 'feature_disabled_2h',
            cancelledAt: agora
          });
          cancelados++;
          continue;
        }

        // 5. Enviar lembrete
        const payload = {
          ...reminder.payload,
          tokenInstancia: businessData.tokenInstancia // Token atual
        };

        if (is24h) {
          await notifyReminder24h(payload);
          await agendamentoDoc.ref.update({ 
            lembrete24hEnviado: true,
            lembrete24hEnviadoEm: agora
          });
        } else if (is2h) {
          await notifyReminder2h(payload);
          await agendamentoDoc.ref.update({ 
            lembrete2hEnviado: true,
            lembrete2hEnviadoEm: agora
          });
        }

        // 6. Marcar reminder como enviado
        await reminderDoc.ref.update({
          status: 'sent',
          sentAt: agora
        });

        enviados++;

      } catch (error: any) {
        erros++;
        
        // Marcar como erro mas não parar o processamento
        await reminderDoc.ref.update({
          status: 'error',
          errorMessage: error.message || 'Unknown error',
          errorAt: agora,
          retryCount: (reminder.retryCount || 0) + 1
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processamento concluído`,
      processados,
      enviados,
      cancelados,
      erros,
      timestamp: agora
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: agora
    }, { status: 500 });
  }
}
