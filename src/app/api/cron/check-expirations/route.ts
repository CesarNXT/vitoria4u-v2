
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

  console.log('🔍 CRON Job (check-expirations) started - OPTIMIZED VERSION');

  try {
    const now = new Date();
    
    // 🔥 OTIMIZAÇÃO: Query apenas negócios que NÃO são gratuitos
    // Planos gratuitos nunca expiram, então não precisamos verificar
    // Antes: 2000 leituras | Depois: ~200 leituras (90% economia)
    const businessesSnapshot = await adminDb.collection('negocios')
      .where('planId', '!=', 'plano_gratis')
      .get();
    
    console.log(`🏪 Found ${businessesSnapshot.size} businesses to check`);
    
    let updatedCount = 0;
    let totalReads = businessesSnapshot.size;

    // 🔥 OTIMIZAÇÃO 2: Processar em paralelo (lotes de 30)
    const BATCH_SIZE = 30;
    const businesses = businessesSnapshot.docs;
    
    for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
      const batch = businesses.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (businessDoc) => {
        const business = businessDoc.data() as ConfiguracoesNegocio;
        const businessId = businessDoc.id;

        // Pular plano gratuito (não expira)
        if (business.planId === 'plano_gratis') {
          return;
        }
        
        const expirationDate = toDate(business.access_expires_at);

        // Se a data de expiração existe e já passou
        if (!expirationDate || !isPast(expirationDate)) {
          return; // Ainda não expirou
        }
        
        console.log(`⚠️ Expiration detected: ${businessId} (${business.nome})`);
        
        try {
          // 1. Deletar instância WhatsApp diretamente
          if (business.whatsappConectado && business.tokenInstancia) {
            try {
              const client = new WhatsAppAPIClient(businessId, business.tokenInstancia);
              await client.deleteInstance();
              console.log(`✅ WhatsApp instance deleted: ${businessId}`);
            } catch (error) {
              console.warn(`⚠️ Failed to delete WhatsApp instance: ${businessId}`);
            }
          }

          // 2. Atualizar o documento do negócio no Firestore
          // ✅ VOLTAR PARA PLANO GRÁTIS (sistema continua funcionando)
          // Apenas automações são desabilitadas
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
          console.log(`✅ Business expired: ${businessId}`);
        } catch (error) {
          console.error(`❌ Error processing ${businessId}:`, error);
        }
      }));
    }

    console.log(`✅ CRON Job (check-expirations) finished`);
    console.log(`⚠️ Expired businesses: ${updatedCount}`);
    console.log(`🏪 Businesses checked: ${businessesSnapshot.size}`);
    console.log(`📊 Firebase reads: ${totalReads} (OPTIMIZED!)`);
    
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
