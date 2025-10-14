
import { NextResponse } from 'next/server';
import { getFirestore, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { addDays, isSameDay, startOfDay } from 'date-fns';
import { logger, sanitizeForLog } from '@/lib/logger';

const N8N_RETURN_WEBHOOK_URL = 'https://n8n.vitoria4u.site/webhook/c01c14e1-beea-4ee4-b58d-ea8b433ff6df';

async function callWebhook(payload: any) {
    try {
        const response = await fetch(N8N_RETURN_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            logger.error('Webhook call failed', { status: response.status });
        }
    } catch (error) {
        logger.error('Error calling return webhook', sanitizeForLog(error));
    }
}

// Helper to convert Firestore Timestamp or string to Date
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
    logger.info('CRON Job (check-returns) started');
    try {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        const firestore = getFirestore(app);

        const businessesSnapshot = await getDocs(collection(firestore, 'negocios'));
        
        const today = startOfDay(new Date());
        let returnCount = 0;
        let businessesProcessed = 0;
        
        for (const businessDoc of businessesSnapshot.docs) {
            const businessData = businessDoc.data();
            const businessId = businessDoc.id;

            // Only proceed if the business has the feature enabled
            if (!businessData.whatsappConectado) {
                continue;
            }

            logger.debug('Checking returns for business', { businessId, name: businessData.nome });

            // Array para acumular retornos desta empresa
            const returnClients = [];

            const appointmentsRef = collection(firestore, `negocios/${businessId}/agendamentos`);
            // We only care about appointments that were 'Finalizado' (completed)
            const q = query(appointmentsRef, where('status', '==', 'Finalizado'));
            const appointmentsSnapshot = await getDocs(q);

            for (const appointmentDoc of appointmentsSnapshot.docs) {
                const appointmentData = appointmentDoc.data();
                const service = appointmentData.servico;

                // Check if the service has a return period defined
                if (service && typeof service.returnInDays === 'number' && service.returnInDays > 0) {
                    const appointmentDate = toDate(appointmentData.date);

                    if (appointmentDate) {
                        // Calculate the exact return date
                        const returnDate = addDays(startOfDay(appointmentDate), service.returnInDays);
                        
                        // Check if today is the day for the return reminder
                        if (isSameDay(today, returnDate)) {
                            const client = appointmentData.cliente;
                            returnClients.push({
                                nomeCliente: client.name,
                                telefoneCliente: client.phone,
                                nomeServico: service.name,
                                diasRetorno: service.returnInDays
                            });
                            returnCount++;
                        }
                    }
                }
            }

            // Se houver retornos nesta empresa, envia 1 webhook com todos
            if (returnClients.length > 0) {
                const payload = {
                    nomeEmpresa: businessData.nome,
                    tokenInstancia: businessData.tokenInstancia,
                    instancia: businessId,
                    categoriaEmpresa: businessData.categoria,
                    retornos: returnClients,
                    totalRetornos: returnClients.length
                };
                
                logger.info('Sending return batch', { 
                    businessId,
                    businessName: businessData.nome,
                    count: returnClients.length
                });
                
                await callWebhook(payload);
                businessesProcessed++;
            }
        }

        logger.success(`CRON Job (check-returns) finished. Found ${returnCount} returns in ${businessesProcessed} businesses.`);
        return NextResponse.json({ 
            message: `Return checks completed. Found ${returnCount} returns in ${businessesProcessed} businesses.`,
            returnCount,
            businessesProcessed
        });
    } catch (error: any) {
        logger.error('CRON Job (check-returns) failed', sanitizeForLog(error));
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
