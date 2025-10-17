"use server";

import { adminDb } from './firebase-admin';
import { verifySession } from './session';
import type { ConfiguracoesNegocio } from './types';
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

        // Pular se já está expirado ou é gratuito
        if (businessData.planId === 'plano_expirado' || businessData.planId === 'plano_gratis') {
            return { expired: businessData.planId === 'plano_expirado' };
        }

        const expirationDate = toDate(businessData.access_expires_at);

        if (expirationDate && isPast(expirationDate)) {
            console.log(`Plano expirado detectado para: ${businessId}`);

            // Enviar webhook para desconectar WhatsApp
            if (businessData.whatsappConectado) {
                try {
                    await fetch('https://n8n.vitoria4u.site/webhook/d4a54dda-982c-4046-9dbc-c77a405c8474', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            token: businessData.tokenInstancia, 
                            id: businessId,
                            status: "disconnected"
                        }),
                    });
                } catch (error) {
                    console.error(`Falha ao enviar webhook:`, error);
                }
            }

            // Atualizar para plano expirado
            // Nota: O N8N é quem vai desconectar o WhatsApp e atualizar o status
            await businessDocRef.update({
                planId: 'plano_expirado',
                habilitarLembrete24h: false,
                habilitarLembrete2h: false,
                habilitarFeedback: false,
            });

            console.log(`Negócio ${businessId} movido para plano expirado.`);
            return { expired: true };
        }

        return { expired: false };
    } catch (error) {
        console.error('Erro ao verificar expiração:', error);
        return { expired: false };
    }
}
