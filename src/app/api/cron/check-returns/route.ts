import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { addDays, isSameDay, startOfDay } from 'date-fns';
import { notifyReturn } from '@/lib/notifications';

// ✅ Agora usa código nativo (notifyReturn)
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
                            
                            // Envia mensagem de retorno (código nativo)
                            await notifyReturn({
                                tokenInstancia: businessData.tokenInstancia,
                                telefoneCliente: client.phone,
                                nomeCliente: client.name,
                                nomeEmpresa: businessData.nome,
                                nomeServico: service.name,
                                diasRetorno: service.returnInDays,
                                categoriaEmpresa: businessData.categoria
                            });
                            
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
