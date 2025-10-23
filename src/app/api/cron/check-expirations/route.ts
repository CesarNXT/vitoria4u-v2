import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { ConfiguracoesNegocio } from '@/lib/types';
import { isPast } from 'date-fns';
import { WhatsAppAPIClient } from '@/lib/whatsapp-api';

function toDate(value: any): Date | null {
    if (!value) return null;
    if (value.toDate) return value.toDate();
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
    const now = new Date();
    
    const businessesSnapshot = await adminDb.collection('negocios')
      .where('planId', '!=', 'plano_gratis')
      .get();
    
    let updatedCount = 0;
    const totalReads = businessesSnapshot.size;

    const BATCH_SIZE = 30;
    const businesses = businessesSnapshot.docs;
    
    for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
      const batch = businesses.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (businessDoc) => {
        const business = businessDoc.data() as ConfiguracoesNegocio;
        const businessId = businessDoc.id;

        if (business.planId === 'plano_gratis') {
          return;
        }
        
        const expirationDate = toDate(business.access_expires_at);

        if (!expirationDate || !isPast(expirationDate)) {
          return;
        }
        
        try {
          if (business.whatsappConectado && business.tokenInstancia) {
            try {
              const client = new WhatsAppAPIClient(businessId, business.tokenInstancia);
              await client.deleteInstance();
            } catch (error) {
              console.warn(`Erro ao deletar instância WhatsApp: ${businessId}`);
            }
          }

          const businessDocRef = adminDb.collection('negocios').doc(businessId);
          await businessDocRef.update({
            planId: 'plano_gratis',
            whatsappConectado: false,
            tokenInstancia: null,
            habilitarLembrete24h: false,
            habilitarLembrete2h: false,
            habilitarFeedback: false,
            habilitarAniversario: false,
            iaAtiva: false,
          });
          
          updatedCount++;
        } catch (error) {
          console.error(`Erro ao processar ${businessId}:`, error);
        }
      }));
    }
    
    return NextResponse.json({ 
      message: `Verificação concluída. ${updatedCount} planos expirados detectados e atualizados.`,
      updatedBusinesses: updatedCount,
      totalChecked: businessesSnapshot.size,
      totalReads
    });

  } catch (error) {
    console.error('Erro ao verificar expirações:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
