import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import type { Plano } from '@/lib/types';

// Inicializa o cliente do Mercado Pago com o seu Access Token
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function POST(request: Request) {
  console.log('MERCADOPAGO_ACCESS_TOKEN:', process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Carregado' : 'NÃO CARREGADO');
  
  // SEGURANÇA: Validar token de autenticação
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Token de autenticação não fornecido.' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  let decodedToken;
  
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return NextResponse.json({ error: 'Token de autenticação inválido.' }, { status: 401 });
  }

  try {

    // Usar o UID do token, não o userId do body (previne manipulação)
    const authenticatedUserId = decodedToken.uid;
    const authenticatedUserEmail = decodedToken.email || '';

    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const origin = `${proto}://${host}`;
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'planId é obrigatório.' }, { status: 400 });
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

    // 3. Criar a preferência com os dados seguros do banco de dados e do token
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
          email: authenticatedUserEmail, // Email do token autenticado
        },
        back_urls: {
          success: `${origin}/pagamento/sucesso`,
          failure: `${origin}/pagamento/falha`,
          pending: `${origin}/pagamento/pendente`,
        },
        auto_return: 'approved',
        external_reference: authenticatedUserId, // UID do token autenticado
      },
    });

    // Retorna a URL de checkout (init_point)
    return NextResponse.json({ checkoutUrl: result.init_point });

  } catch (error) {
    console.error('Erro ao criar preferência de pagamento no Mercado Pago:', error);
    return NextResponse.json({ error: 'Falha ao criar preferência de pagamento.' }, { status: 500 });
  }
}