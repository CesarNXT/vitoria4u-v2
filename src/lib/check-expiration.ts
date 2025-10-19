"use server";

import { adminDb } from './firebase-admin';
import { verifySession } from './session';
import type { ConfiguracoesNegocio } from './types';
import { isPast } from 'date-fns';
import { WhatsAppAPIClient } from './whatsapp-api';

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

/**
 * Verifica se o plano do usuário atual expirou e atualiza automaticamente
 * Deve ser chamada em cada carregamento de página do dashboard
 */
export async function checkAndUpdateExpiration() {
    try {
        const decodedToken = await verifySession();
        
        if (!decodedToken) {
            return { expired: false };
        }

        const businessId = decodedToken.uid;
        const businessDocRef = adminDb.collection('negocios').doc(businessId);
        const businessDoc = await businessDocRef.get();

        if (!businessDoc.exists) {
            return { expired: false };
        }

        const businessData = businessDoc.data() as ConfiguracoesNegocio;

        // Pular se já é gratuito (não expira)
        if (businessData.planId === 'plano_gratis') {
            return { expired: false };
        }

        const expirationDate = toDate(businessData.access_expires_at);

        if (expirationDate && isPast(expirationDate)) {
            // Deletar instância WhatsApp (automações são pagas)
            if (businessData.whatsappConectado && businessData.tokenInstancia) {
                try {
                    const client = new WhatsAppAPIClient(businessId, businessData.tokenInstancia);
                    await client.deleteInstance();
                } catch (error) {
                    // Silencioso - pode já estar deletada
                }
            }

            // ✅ VOLTAR PARA PLANO GRÁTIS (sistema continua funcionando)
            // Apenas automações são desabilitadas (WhatsApp, lembretes, IA)
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

            return { expired: true };
        }

        return { expired: false };
    } catch (error) {
        console.error('Erro ao verificar expiração:', error);
        return { expired: false };
    }
}
