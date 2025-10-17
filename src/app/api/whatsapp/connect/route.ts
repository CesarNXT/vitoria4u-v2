import { NextRequest, NextResponse } from 'next/server';

const N8N_WEBHOOK_URL = 'https://n8n.vitoria4u.site/webhook/7e403c23-f6bc-43bc-98d0-3376dbae6eba';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Fazer a requisição para o N8N do servidor (sem CORS)
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Falha ao conectar com N8N' },
        { status: response.status }
      );
    }

    const data = await response.text();
    
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Erro ao conectar WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição' },
      { status: 500 }
    );
  }
}
