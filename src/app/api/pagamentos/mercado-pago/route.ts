import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import type { Plano } from '@/lib/types';

// Inicializa o cliente do Mercado Pago com o seu Access Token
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function POST(request: Request) {
  // Verificar se o token está configurado
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    console.error('❌ MERCADOPAGO_ACCESS_TOKEN não configurado no .env');
    return NextResponse.json({ 
      error: 'Configuração do Mercado Pago ausente. Contate o suporte.' 
    }, { status: 500 });
  }
  
  // SEGURANÇA: Validar token de autenticação
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ Token de autenticação não fornecido');
    return NextResponse.json({ error: 'Token de autenticação não fornecido.' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Token de autenticação inválido.' }, { status: 401 });
  }
  
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

    // Verificar se é ambiente de produção com URL válida
    const isProduction = origin.includes('vitoria4u') || origin.includes('vercel.app') || proto === 'https';
    if (!planId) {
      console.error('❌ planId não fornecido');
      return NextResponse.json({ error: 'planId é obrigatório.' }, { status: 400 });
    }

    // 1. Buscar o plano no Firestore para garantir a integridade do preço
    const planDoc = await adminDb.collection('planos').doc(planId).get();

    if (!planDoc.exists) {
      console.error('❌ Plano não encontrado:', planId);
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
    }

    const plan = planDoc.data() as Plano;
    // 2. Se o plano é gratuito (price = 0), não cria checkout
    if (!plan.price || plan.price === 0) {
        console.error('❌ Plano gratuito');
        return NextResponse.json({ error: 'Plano gratuito não requer checkout.' }, { status: 400 });
    }

    const preference = new Preference(client);

    // Configurar preferência baseada no ambiente
    const preferenceBody: any = {
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
      external_reference: authenticatedUserId, // UID do token autenticado
    };

    // Apenas adicionar back_urls e auto_return em produção (URLs públicas)
    if (isProduction) {
      preferenceBody.back_urls = {
        success: `${origin}/pagamento/sucesso`,
        failure: `${origin}/pagamento/falha`,
        pending: `${origin}/pagamento/pendente`,
      };
      preferenceBody.auto_return = 'approved';
    }

    // 3. Criar a preferência com os dados seguros do banco de dados e do token
    const result = await preference.create({
      body: preferenceBody,
    });

    // Retorna a URL de checkout (init_point)
    return NextResponse.json({ checkoutUrl: result.init_point });

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERRO FATAL ao criar preferência de pagamento');
    console.error('Tipo:', error.constructor.name);
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    
    // Se for erro do Mercado Pago, mostrar detalhes
    if (error.cause) {
      console.error('Causa:', JSON.stringify(error.cause, null, 2));
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return NextResponse.json({ 
      error: 'Falha ao criar preferência de pagamento.',
      details: error.message 
    }, { status: 500 });
  }
}