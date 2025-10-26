"use server";

import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';
const N8N_WEBHOOK_URL = process.env.N8N_WHATSAPP_WEBHOOK_URL || '';

/**
 * Ativar/Desativar webhook da IA no UAZAPI
 */
export async function toggleIAWebhookAction(iaAtiva: boolean) {
  try {
    // Verificar autenticação
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie?.value) {
      return {
        success: false,
        error: 'Não autenticado'
      };
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie.value);
    const userId = decodedClaims.uid;

    // Buscar businessId
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.businessId) {
      return {
        success: false,
        error: 'Usuário não vinculado a um negócio'
      };
    }

    const businessId = userData.businessId;

    // Buscar token da instância
    const businessDoc = await adminDb.collection('negocios').doc(businessId).get();
    const businessData = businessDoc.data();

    if (!businessData?.tokenInstancia) {
      return {
        success: false,
        error: 'Token da instância não encontrado. Reconecte seu WhatsApp.'
      };
    }

    if (!N8N_WEBHOOK_URL) {
      return {
        success: false,
        error: 'URL do webhook N8N não configurada. Configure a variável N8N_WEBHOOK_URL no .env'
      };
    }

    const token = businessData.tokenInstancia;

    // Configurar webhook na UAZAPI
    // Modo simples: sem ID, sem action
    const webhookPayload = {
      enabled: iaAtiva, // true = ativa, false = desativa
      url: N8N_WEBHOOK_URL,
      events: ['messages'], // Apenas mensagens
      excludeMessages: ['wasSentByApi', 'isGroupYes'], // Evitar loops e grupos
    };

    console.log(`${iaAtiva ? '✅ Ativando' : '❌ Desativando'} webhook da IA para negócio ${businessId}`);
    console.log('Payload:', webhookPayload);

    const response = await fetch(`${API_BASE}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erro ao configurar webhook:', errorData);
      return {
        success: false,
        error: errorData.message || `Erro ao ${iaAtiva ? 'ativar' : 'desativar'} webhook`
      };
    }

    const result = await response.json();
    console.log('Webhook configurado com sucesso:', result);

    return {
      success: true,
      message: iaAtiva 
        ? 'IA ativada! O webhook está recebendo mensagens.' 
        : 'IA desativada! O webhook foi desligado.'
    };

  } catch (error: any) {
    console.error('Erro ao configurar webhook da IA:', error);
    return {
      success: false,
      error: error.message || 'Erro ao configurar webhook'
    };
  }
}
