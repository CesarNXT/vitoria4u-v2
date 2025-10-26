"use server";

import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';
const N8N_WEBHOOK_URL = process.env.N8N_WHATSAPP_WEBHOOK_URL || '';

// Validar sessão
async function validateSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  
  if (!sessionCookie?.value) {
    throw new Error('Não autenticado');
  }

  const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie.value);
  return decodedClaims.uid;
}

// Buscar businessId (userId = businessId)
async function getBusinessId(userId: string): Promise<string> {
  const businessDoc = await adminDb.collection('negocios').doc(userId).get();
  if (!businessDoc.exists) {
    throw new Error('Negócio não encontrado');
  }
  return userId;
}

/**
 * Ativar/Desativar webhook da IA no UAZAPI
 */
export async function toggleIAWebhookAction(iaAtiva: boolean) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

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
        error: 'IA não configurada no servidor. Entre em contato com o suporte.'
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
      console.error('Erro ao configurar IA:', errorData);
      return {
        success: false,
        error: errorData.message || `Erro ao ${iaAtiva ? 'ativar' : 'desativar'} IA`
      };
    }

    const result = await response.json();
    console.log('IA configurada com sucesso:', result);

    return {
      success: true,
      message: iaAtiva 
        ? 'IA ativada com sucesso!' 
        : 'IA desativada.'
    };

  } catch (error: any) {
    console.error('Erro ao configurar IA:', error);
    return {
      success: false,
      error: error.message || 'Erro ao configurar IA'
    };
  }
}
