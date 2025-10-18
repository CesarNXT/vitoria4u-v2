import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { addHours, isBefore, isAfter } from 'date-fns';

const WHATSAPP_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

/**
 * Cron Job: Lembretes 2h Antes
 * Roda a cada 5 minutos e envia lembretes para agendamentos que acontecem em ~2h
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔔 Iniciando cron: Lembretes 2h antes');

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os negócios com WhatsApp conectado
    const negociosSnapshot = await adminDb
      .collection('negocios')
      .where('whatsappConectado', '==', true)
      .get();

    if (negociosSnapshot.empty) {
      console.log('⚠️ Nenhum negócio com WhatsApp conectado');
      return NextResponse.json({ success: true, sent: 0 });
    }

    let totalSent = 0;
    const now = new Date();
    const targetStart = addHours(now, 1.75); // 1h45min no futuro
    const targetEnd = addHours(now, 2.25);   // 2h15min no futuro

    // Para cada negócio
    for (const negocioDoc of negociosSnapshot.docs) {
      const negocioId = negocioDoc.id;
      const negocioData = negocioDoc.data();
      const tokenInstancia = negocioData.tokenInstancia;

      if (!tokenInstancia) {
        console.log(`⚠️ Negócio ${negocioId} sem token de instância`);
        continue;
      }

      // Buscar agendamentos deste negócio
      const agendamentosSnapshot = await adminDb
        .collection('negocios')
        .doc(negocioId)
        .collection('agendamentos')
        .where('status', '==', 'Agendado')
        .get();

      if (agendamentosSnapshot.empty) continue;

      // Para cada agendamento
      for (const agendamentoDoc of agendamentosSnapshot.docs) {
        const agendamento = agendamentoDoc.data();
        const agendamentoId = agendamentoDoc.id;

        // Verificar se já enviou lembrete 2h
        if (agendamento.lembrete2hEnviado) {
          continue;
        }

        // Parsear data/hora do agendamento
        const dataHora = agendamento.dataHora; // Assume Date object ou Timestamp
        const agendamentoDate = dataHora.toDate ? dataHora.toDate() : new Date(dataHora);

        // Verificar se está na janela de 2h (1h45min a 2h15min)
        if (isAfter(agendamentoDate, targetStart) && isBefore(agendamentoDate, targetEnd)) {
          // Enviar lembrete
          const nomeCliente = agendamento.cliente?.nome || 'Cliente';
          const nomeServico = agendamento.servico?.nome || 'Atendimento';
          const startTime = agendamento.startTime || agendamentoDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          const message = `*🔔Lembrete de Atendimento🔔*\n\nOlá, ${nomeCliente} Seu atendimento de ${nomeServico} será *hoje às ${startTime}.*\n\n👉 *Se estiver tudo certo, não precisa responder esta mensagem.*`;

          const telefoneCliente = agendamento.cliente?.telefone || agendamento.telefone;

          if (!telefoneCliente) {
            console.log(`⚠️ Agendamento ${agendamentoId} sem telefone`);
            continue;
          }

          try {
            const response = await fetch(`${WHATSAPP_API_URL}/send/text`, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'token': tokenInstancia
              },
              body: JSON.stringify({
                number: telefoneCliente,
                text: message
              })
            });

            if (response.ok) {
              // Marcar como enviado
              await adminDb
                .collection('negocios')
                .doc(negocioId)
                .collection('agendamentos')
                .doc(agendamentoId)
                .update({
                  lembrete2hEnviado: true,
                  lembrete2hEnviadoEm: new Date()
                });

              totalSent++;
              console.log(`✅ Lembrete 2h enviado: ${nomeCliente} - ${agendamentoId}`);
            } else {
              console.error(`❌ Erro ao enviar para ${telefoneCliente}: ${response.status}`);
            }
          } catch (error) {
            console.error(`❌ Erro ao enviar lembrete:`, error);
          }
        }
      }
    }

    console.log(`✅ Cron finalizado. Total enviado: ${totalSent}`);

    return NextResponse.json({ success: true, sent: totalSent });
  } catch (error) {
    console.error('❌ Erro no cron de lembretes 2h:', error);
    return NextResponse.json(
      { error: 'Erro ao processar lembretes' },
      { status: 500 }
    );
  }
}
