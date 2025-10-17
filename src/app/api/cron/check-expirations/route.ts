
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { ConfiguracoesNegocio } from '@/lib/types';
import { isPast } from 'date-fns';

// Helper para converter Firestore Timestamp ou string para Date
function toDate(value: any): Date | null {
    if (!value) return null;
    if (value.toDate) return value.toDate(); // Firestore Timestamp
    if (typeof value === 'string' || typeof value === 'number') {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}


export async function GET(request: Request) {
  const authToken = (request.headers.get('authorization') || '').split('Bearer ')[1];

  if (authToken !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const businessesSnapshot = await adminDb.collection('negocios').get();
    let updatedCount = 0;

    for (const businessDoc of businessesSnapshot.docs) {
        const business = businessDoc.data() as ConfiguracoesNegocio;
        const businessId = businessDoc.id;

        // Pular negócios que já estão no plano expirado ou gratuito
        if (business.planId === 'plano_expirado' || business.planId === 'plano_gratis') {
            continue;
        }
        
        const expirationDate = toDate(business.access_expires_at);

        // Se a data de expiração existe e já passou
        if (expirationDate && isPast(expirationDate)) {
            console.log(`Plano expirado detectado para o negócio: ${businessId}`);

            // 1. Enviar webhook para remover instância do WhatsApp
            if (business.whatsappConectado) {
                try {
                    const webhookPayload = { 
                        token: business.tokenInstancia, 
                        id: businessId,
                        status: "disconnected"
                    };
                    
                    console.log('📤 Enviando webhook:', webhookPayload);
                    
                    const response = await fetch('https://n8n.vitoria4u.site/webhook/d4a54dda-982c-4046-9dbc-c77a405c8474', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(webhookPayload),
                    });
                    
                    console.log('✅ Webhook enviado com sucesso. Status:', response.status);
                } catch (error) {
                    console.error(`Falha ao enviar webhook para ${businessId}:`, error);
                }
            }

            // 2. Atualizar o documento do negócio no Firestore para o plano expirado
            // Remove acesso a todas as funcionalidades pagas
            // Nota: O N8N é quem vai desconectar o WhatsApp e atualizar o status
            const businessDocRef = adminDb.collection('negocios').doc(businessId);
            await businessDocRef.update({
                planId: 'plano_expirado',
                // Desabilita todas as automações
                habilitarLembrete24h: false,
                habilitarLembrete2h: false,
                habilitarFeedback: false,
            });
            updatedCount++;
            console.log(`Negócio ${businessId} movido para plano expirado.`);
        }
    }

    return NextResponse.json({ 
      message: `Verificação concluída. ${updatedCount} planos expirados detectados e atualizados.`,
      updatedBusinesses: updatedCount 
    });

  } catch (error) {
    console.error('Erro ao verificar expirações:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
