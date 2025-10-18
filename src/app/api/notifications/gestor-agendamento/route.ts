import { NextRequest, NextResponse } from 'next/server';

const NOTIFICATION_TOKEN = 'b2e97825-2d28-4646-ae38-3357fcbf0e20';
const WHATSAPP_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

/**
 * Webhook: Notificar Gestor - Novo Agendamento
 * Envia mensagem para o telefone da empresa quando há novo agendamento
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📢 Novo agendamento - Notificando gestor:', body);

    const { telefoneEmpresa, nomeCliente, nomeServico, dataHoraAtendimento } = body;

    if (!telefoneEmpresa || !nomeCliente || !nomeServico || !dataHoraAtendimento) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Enviar mensagem via WhatsApp
    const message = `*📢Novo Agendamento Recebido📢*\n\n*📅 Data e hora:* ${dataHoraAtendimento}\n\n*👤 Cliente:* ${nomeCliente}\n*💼 Procedimento:* ${nomeServico}`;

    const response = await fetch(`${WHATSAPP_API_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': NOTIFICATION_TOKEN
      },
      body: JSON.stringify({
        number: telefoneEmpresa,
        text: message
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao enviar mensagem: ${response.status}`);
    }

    console.log('✅ Notificação enviada para gestor:', telefoneEmpresa);

    return NextResponse.json({ success: true, sent: true });
  } catch (error) {
    console.error('❌ Erro ao notificar gestor:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar notificação' },
      { status: 500 }
    );
  }
}
