import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const NOTIFICATION_INSTANCE_TOKEN = 'b2e97825-2d28-4646-ae38-3357fcbf0e20';
const WHATSAPP_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN || '';

/**
 * Webhook para receber eventos do WhatsApp API
 * Eventos: connection.update, messages.upsert, etc
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📱 Webhook WhatsApp recebido:', JSON.stringify(body, null, 2));

    // Extrair dados do evento (estrutura UazAPI)
    const { EventType, instance } = body;

    if (!EventType || !instance) {
      return NextResponse.json(
        { error: 'Evento ou instância não fornecidos' },
        { status: 400 }
      );
    }

    // Processar evento de conexão
    if (EventType === 'connection') {
      await handleConnectionUpdate(instance);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error('❌ Erro no webhook WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}

/**
 * Processa atualização de status de conexão
 */
async function handleConnectionUpdate(instance: any) {
  try {
    const { name: instanceId, status, token: instanceToken } = instance;
    
    console.log(`📡 Atualização de conexão - BusinessId: ${instanceId}, Status: ${status}`);

    // Apenas processar quando realmente conectado ou desconectado
    const isConnected = status === 'connected' || status === 'open';
    const isDisconnected = status === 'disconnected' || status === 'close';

    if (!isConnected && !isDisconnected) {
      // Estado intermediário (connecting), ignorar
      console.log(`⏳ Estado intermediário: ${status} - aguardando...`);
      return;
    }
    
    // Buscar todas as instâncias para pegar dados completos
    const response = await fetch(`${WHATSAPP_API_URL}/instance/all`, {
      headers: {
        'Accept': 'application/json',
        'admintoken': ADMIN_TOKEN
      }
    });
    
    if (!response.ok) {
      throw new Error('Erro ao buscar instâncias');
    }
    
    const instances = await response.json();
    const fullInstance = instances.find((inst: any) => inst.name === instanceId);
    
    if (!fullInstance) {
      console.warn(`⚠️ Instância ${instanceId} não encontrada`);
      return;
    }
    
    // instanceId já é o businessId direto
    const businessId = instanceId;
    const businessRef = adminDb.collection('negocios').doc(businessId);
    const businessDoc = await businessRef.get();
    
    if (!businessDoc.exists) {
      console.warn(`⚠️ Negócio ${businessId} não encontrado`);
      return;
    }
    
    const businessData = businessDoc.data();
    const businessPhone = businessData?.telefone?.toString();

    // Atualizar Firestore
    await businessRef.update({
      whatsappConectado: isConnected,
      updatedAt: new Date(),
    });

    console.log(`✅ Firestore atualizado - ${instanceId}: whatsappConectado = ${isConnected}`);

    // Se DESCONECTOU: deletar instância e enviar notificação
    if (isDisconnected) {
      console.log('🗑️ Deletando instância desconectada...');
      
      // Deletar instância
      const deleteResponse = await fetch(`${WHATSAPP_API_URL}/instance`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'token': instanceToken || fullInstance.token
        }
      });
      
      if (deleteResponse.ok) {
        console.log('✅ Instância deletada');
      }
      
      // Enviar notificação de desconexão
      if (businessPhone) {
        await sendNotification(businessPhone, '❌Whatsapp Desconectado❌');
      }
    }
    
    // Se CONECTOU: enviar notificação
    if (isConnected && businessPhone) {
      await sendNotification(businessPhone, '✅Whatsapp Conectado✅');
    }
  } catch (error) {
    console.error('❌ Erro ao processar atualização de conexão:', error);
  }
}

/**
 * Envia notificação via instância de notificações
 */
async function sendNotification(phone: string, message: string) {
  try {
    // Remover caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');

    const url = `${WHATSAPP_API_URL}/send/text?id=${NOTIFICATION_INSTANCE_TOKEN}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro ao enviar notificação:', error);
    } else {
      console.log(`✅ Notificação enviada para ${cleanPhone}`);
    }
  } catch (error) {
    console.error('❌ Erro ao enviar notificação WhatsApp:', error);
  }
}
