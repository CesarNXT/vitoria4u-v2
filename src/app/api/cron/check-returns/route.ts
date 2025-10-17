
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { addDays, isSameDay, startOfDay } from 'date-fns';

const N8N_RETURN_WEBHOOK_URL = 'https://n8n.vitoria4u.site/webhook/c01c14e1-beea-4ee4-b58d-ea8b433ff6df';

async function callWebhook(payload: any) {
    try {
        const response = await fetch(N8N_RETURN_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            console.error('Return webhook call failed', { status: response.status });
        } else {
            console.log('✅ Return webhook sent successfully');
        }
    } catch (error) {
        console.error('Error calling return webhook', error);
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
    
    console.log('🔄 CRON Job (check-returns) started');
    
    try {
        const businessesSnapshot = await adminDb.collection('negocios').get();
        
        const today = startOfDay(new Date());
        let returnCount = 0;
        let businessesProcessed = 0;
        
        for (const businessDoc of businessesSnapshot.docs) {
            const businessData = businessDoc.data();
            const businessId = businessDoc.id;

            // Only proceed if the business has WhatsApp connected
            if (!businessData.whatsappConectado || !businessData.tokenInstancia) {
                continue;
            }

            console.log(`Checking returns for business: ${businessId} (${businessData.nome})`);

            let businessHasReturns = false;

            // Query appointments that are 'Finalizado' (completed)
            const appointmentsSnapshot = await adminDb
                .collection(`negocios/${businessId}/agendamentos`)
                .where('status', '==', 'Finalizado')
                .get();

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
                            
                            // Envia 1 webhook para cada cliente de retorno
                            const payload = {
                                nomeEmpresa: businessData.nome,
                                tokenInstancia: businessData.tokenInstancia,
                                instancia: businessId,
                                categoriaEmpresa: businessData.categoria,
                                nomeCliente: client.name,
                                telefoneCliente: client.phone,
                                nomeServico: service.name,
                                diasRetorno: service.returnInDays
                            };
                            
                            console.log(`🔄 Sending return webhook for ${client.name} at ${businessData.nome}`);
                            
                            await callWebhook(payload);
                            returnCount++;
                            businessHasReturns = true;
                        }
                    }
                }
            }

            if (businessHasReturns) {
                businessesProcessed++;
            }
        }

        console.log(`✅ CRON Job (check-returns) finished. Found ${returnCount} returns in ${businessesProcessed} businesses.`);
        return NextResponse.json({ 
            message: `Return checks completed. Found ${returnCount} returns in ${businessesProcessed} businesses.`,
            returnCount,
            businessesProcessed
        });
    } catch (error: any) {
        console.error('❌ CRON Job (check-returns) failed:', error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
