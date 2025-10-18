
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { ConfiguracoesNegocio } from '@/lib/types';
import { isPast } from 'date-fns';
import { WhatsAppAPIClient } from '@/lib/whatsapp-api';

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
            // 1. Deletar instância WhatsApp diretamente
            if (business.whatsappConectado && business.tokenInstancia) {
                try {
                    const client = new WhatsAppAPIClient(businessId, business.tokenInstancia);
                    await client.deleteInstance();
                } catch (error) {
                    // Silencioso - pode já estar deletada
                }
            }

            // 2. Atualizar o documento do negócio no Firestore
            const businessDocRef = adminDb.collection('negocios').doc(businessId);
            await businessDocRef.update({
                planId: 'plano_expirado',
                whatsappConectado: false,
                tokenInstancia: null,
                habilitarLembrete24h: false,
                habilitarLembrete2h: false,
                habilitarFeedback: false,
            });
            updatedCount++;
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
