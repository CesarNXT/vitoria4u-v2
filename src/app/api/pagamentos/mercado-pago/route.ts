import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { Plano } from '@/lib/types';

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
    const { planId, userId, userEmail } = body;

    if (!planId || !userId || !userEmail) {
      return NextResponse.json({ error: 'Dados insuficientes para criar o pagamento (planId, userId, userEmail).' }, { status: 400 });
    }

    // 1. Buscar o plano no Firestore para garantir a integridade do preço
    const planDoc = await adminDb.collection('planos').doc(planId).get();

    if (!planDoc.exists) {
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
    }

    const plan = planDoc.data() as Plano;

    // 2. Se o plano é gratuito (price = 0), não cria checkout
    if (!plan.price || plan.price === 0) {
        return NextResponse.json({ error: 'Plano gratuito não requer checkout.' }, { status: 400 });
    }

    const preference = new Preference(client);

    // 3. Criar a preferência com os dados seguros do banco de dados
    const result = await preference.create({
      body: {
        items: [
          {
            id: planId, // Usa o ID do plano
            title: plan.name,
            quantity: 1,
            unit_price: plan.price, // Preço seguro do Firestore
          },
        ],
        payer: {
          email: userEmail,
        },
        back_urls: {
          success: `${origin}/dashboard/pagamento/sucesso`,
          failure: `${origin}/dashboard/pagamento/falha`,
          pending: `${origin}/dashboard/pagamento/pendente`,
        },
        auto_return: 'approved',
        external_reference: userId, // Associa o pagamento ao ID do usuário
      },
    });

    // Retorna a URL de checkout (init_point)
    return NextResponse.json({ checkoutUrl: result.init_point });

  } catch (error) {
    console.error('Erro ao criar preferência de pagamento no Mercado Pago:', error);
    return NextResponse.json({ error: 'Falha ao criar preferência de pagamento.' }, { status: 500 });
  }
}