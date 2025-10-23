import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

/**
 * Webhook: Notificar Profissional - Cancelamento
 * Envia mensagem para o telefone do profissional quando há cancelamento
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { tokenInstancia, telefoneProfissional, nomeProfissional, nomeCliente, nomeServico, dataHoraAtendimento } = body;

    if (!tokenInstancia || !telefoneProfissional || !nomeProfissional || !nomeCliente || !nomeServico || !dataHoraAtendimento) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Enviar mensagem via WhatsApp (usando token da instância do negócio)
    const firstName = nomeProfissional.split(' ')[0];
    const message = `⚠️ *Oi, ${firstName}!* ⚠️\n\n❌ Um agendamento foi cancelado.\n\n📅 *Data e Hora*\n${dataHoraAtendimento}\n\n👤 *Cliente*\n${nomeCliente}\n\n💼 *Procedimento*\n${nomeServico}\n\nVocê tem um horário livre! 🕐`;

    const response = await fetch(`${WHATSAPP_API_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': tokenInstancia
      },
      body: JSON.stringify({
        number: telefoneProfissional,
        text: message
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao enviar mensagem: ${response.status}`);
    }

    return NextResponse.json({ success: true, sent: true });
  } catch (error) {
    console.error('❌ Erro ao notificar profissional:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar notificação' },
      { status: 500 }
    );
  }
}
