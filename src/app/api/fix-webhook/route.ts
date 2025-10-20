import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { WhatsAppAPI } from '@/lib/whatsapp-api-simple';

/**
 * Rota temporária para corrigir webhook do WhatsApp
 * Configura a URL correta do N8N
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId é obrigatório como query parameter' },
        { status: 400 }
      );
    }

    console.log('🔧 Corrigindo webhook para:', businessId);

    // 1. Buscar configurações do negócio
    const businessDoc = await adminDb.collection('negocios').doc(businessId).get();
    
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Negócio não encontrado' },
        { status: 404 }
      );
    }

    const businessData = businessDoc.data();

    if (!businessData?.whatsappConectado || !businessData?.tokenInstancia) {
      return NextResponse.json(
        { error: 'WhatsApp não está conectado' },
        { status: 400 }
      );
    }

    // 2. Configurar webhook correta
    const api = new WhatsAppAPI(businessId, businessData.tokenInstancia);
    
    // URL FIXA E CORRETA da webhook N8N
    const webhookUrl = 'https://n8n.vitoria4u.site/webhook/c0b43248-7690-4273-af55-8a11612849da';
    
    console.log('🤖 Configurando webhook N8N:', webhookUrl);
    await api.setupWebhook(webhookUrl);

    console.log('✅ Webhook corrigida com sucesso!');

    return NextResponse.json({
      success: true,
      message: 'Webhook configurada com sucesso',
      webhookUrl,
      businessId
    });

  } catch (error) {
    console.error('❌ Erro ao corrigir webhook:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
