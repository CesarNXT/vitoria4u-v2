import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-server';

// Inicializa o cliente do Mercado Pago com o seu Access Token
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function POST(request: Request) {
  console.log('MERCADOPAGO_ACCESS_TOKEN:', process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Carregado' : 'NÃO CARREGADO');
  try {
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const origin = `${proto}://${host}`;
    const body = await request.json();
    const { plan, userId, userEmail } = body;

    if (!plan || !userId || !userEmail) {
      return NextResponse.json({ error: 'Dados insuficientes para criar assinatura.' }, { status: 400 });
    }

    // NOVO: Usa mercadoPagoId se disponível, senão usa o id do plano
    const preapprovalPlanId = plan.mercadoPagoId || plan.id;

    if (!preapprovalPlanId) {
        return NextResponse.json({ error: 'ID do plano de checkout inválido. Configure o mercadoPagoId no admin.' }, { status: 400 });
    }

    // Se o plano é gratuito (price = 0), não cria checkout
    if (plan.price === 0) {
        return NextResponse.json({ error: 'Plano gratuito não requer checkout.' }, { status: 400 });
    }

    const checkoutUrl = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${preapprovalPlanId}`;

    // Adiciona a referência externa (ID do usuário) ao link para rastreamento
    const finalUrl = `${checkoutUrl}&external_reference=${userId}`;

    return NextResponse.json({ checkoutUrl: finalUrl });

  } catch (error) {
    console.error('Erro ao criar assinatura no Mercado Pago:', error);
    return NextResponse.json({ error: 'Falha ao criar assinatura.' }, { status: 500 });
  }
}