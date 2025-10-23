import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

/**
 * Webhook: Solicitar Feedback
 * Envia mensagem solicitando avaliação (Google ou Redes Sociais)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      tokenInstancia, 
      telefoneCliente, 
      nomeCliente, 
      feedbackPlatform, 
      feedbackLink 
    } = body;

    if (!tokenInstancia || !telefoneCliente || !nomeCliente || !feedbackPlatform || !feedbackLink) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    let message: string;

    // Lógica condicional: Google vs Redes Sociais
    if (feedbackPlatform === 'google') {
      // Mensagem para avaliação no Google
      message = `✨ Olá, ${nomeCliente.split(' ')[0]}! Tudo bem?\n\nEsperamos que sua experiência conosco tenha sido excelente! 💛\nA sua opinião é muito importante e nos ajuda a continuar melhorando nossos serviços.\n\n⭐ Deixe sua avaliação aqui:\n${feedbackLink}\n\nAgradecemos pela confiança! 🙏`;
    } else {
      // Mensagem para compartilhar em redes sociais
      message = `💛 Olá, ${nomeCliente.split(' ')[0]}! Tudo bem?\n\nFicamos muito felizes em tê-lo(a) conosco! 😄\nSe quiser, compartilhe sua experiência nas redes sociais e marque nosso perfil. Vamos adorar ver seu feedback! ✨\n\n📸 ${feedbackLink}\n\nMuito obrigado(a) pela preferência! 🙌`;
    }

    // Enviar mensagem via WhatsApp
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

    if (!response.ok) {
      throw new Error(`Erro ao enviar mensagem: ${response.status}`);
    }

    return NextResponse.json({ success: true, sent: true, platform: feedbackPlatform });
  } catch (error) {
    console.error('❌ Erro ao solicitar feedback:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar solicitação' },
      { status: 500 }
    );
  }
}
