import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { WhatsAppAPI } from '@/lib/whatsapp-api-simple';
import { checkFeatureAccess } from '@/lib/server-utils';
import { ConfiguracoesNegocio } from '@/lib/types';

/**
 * API para corrigir/configurar webhook do WhatsApp
 * - SE o plano TEM IA → Configura webhook do N8N
 * - SE o plano NÃO TEM IA → Remove webhook
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

    console.log('🔧 Verificando/corrigindo webhook para:', businessId);

    // 1. Buscar configurações do negócio
    const businessDoc = await adminDb.collection('negocios').doc(businessId).get();
    
    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Negócio não encontrado' },
        { status: 404 }
      );
    }

    const businessData = businessDoc.data() as ConfiguracoesNegocio;

    if (!businessData?.whatsappConectado || !businessData?.tokenInstancia) {
      return NextResponse.json(
        { error: 'WhatsApp não está conectado' },
        { status: 400 }
      );
    }

    // 2. Verificar se plano tem feature de IA
    const hasIAFeature = await checkFeatureAccess(businessData, 'atendimento_whatsapp_ia');
    console.log('🤖 Feature de IA disponível:', hasIAFeature);

    // 3. Configurar webhook baseado na feature
    const api = new WhatsAppAPI(businessId, businessData.tokenInstancia);
    
    if (hasIAFeature) {
      // URL FIXA E CORRETA da webhook N8N
      const webhookUrl = 'https://n8n.vitoria4u.site/webhook/c0b43248-7690-4273-af55-8a11612849da';
      
      console.log('🤖 Configurando webhook N8N:', webhookUrl);
      await api.setupWebhook(webhookUrl);
      console.log('✅ Webhook configurada com sucesso!');

      return NextResponse.json({
        success: true,
        message: 'Webhook do N8N configurada com sucesso (IA ativa)',
        webhookUrl,
        hasIA: true,
        businessId
      });
    } else {
      // Plano SEM IA - remover webhook
      console.log('⏭️ Plano sem IA - removendo webhook');
      await api.setupWebhook('');
      console.log('✅ Webhook removida!');

      return NextResponse.json({
        success: true,
        message: 'Webhook removida (plano sem IA)',
        webhookUrl: null,
        hasIA: false,
        businessId
      });
    }

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
