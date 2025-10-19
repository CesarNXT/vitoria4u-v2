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
    
    console.log('🔄 CRON Job (check-returns) started - OPTIMIZED VERSION');
    
    try {
        const today = startOfDay(new Date());
        
        // 🔥 OTIMIZAÇÃO 1: Query apenas negócios com WhatsApp conectado
        const businessesSnapshot = await adminDb.collection('negocios')
            .where('whatsappConectado', '==', true)
            .get();
        
        console.log(`🏪 Found ${businessesSnapshot.size} businesses with WhatsApp`);
        
        let returnCount = 0;
        let businessesProcessed = 0;
        let totalReads = businessesSnapshot.size;
        
        // 🔥 OTIMIZAÇÃO 2: Processar em paralelo (lotes de 15)
        const BATCH_SIZE = 15;
        const businesses = businessesSnapshot.docs;
        
        for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
            const batch = businesses.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (businessDoc) => {
                const businessData = businessDoc.data();
                const businessId = businessDoc.id;

                if (!businessData.tokenInstancia) {
                    return;
                }

                let businessHasReturns = false;

                // 🔥 OTIMIZAÇÃO 3: Query apenas agendamentos finalizados
                // TODO: Adicionar filtro por data para reduzir ainda mais (requer índice composto)
                const appointmentsSnapshot = await adminDb
                    .collection(`negocios/${businessId}/agendamentos`)
                    .where('status', '==', 'Finalizado')
                    .get();
                
                totalReads += appointmentsSnapshot.size;

                // Processar agendamentos em paralelo
                const returnPromises = appointmentsSnapshot.docs.map(async (appointmentDoc) => {
                    const appointmentData = appointmentDoc.data();
                    const service = appointmentData.servico;

                    // Check if the service has a return period defined
                    if (!service || typeof service.returnInDays !== 'number' || service.returnInDays <= 0) {
                        return;
                    }
                    
                    const appointmentDate = toDate(appointmentData.date);
                    if (!appointmentDate) {
                        return;
                    }

                    // Calculate the exact return date
                    const returnDate = addDays(startOfDay(appointmentDate), service.returnInDays);
                    
                    // Check if today is the day for the return reminder
                    if (!isSameDay(today, returnDate)) {
                        return;
                    }
                    
                    const client = appointmentData.cliente;
                    
                    try {
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
                    } catch (error) {
                        console.error(`❌ Error sending return to ${client.name}:`, error);
                    }
                });
                
                await Promise.all(returnPromises);

                if (businessHasReturns) {
                    businessesProcessed++;
                }
            }));
        }

        console.log(`✅ CRON Job (check-returns) finished`);
        console.log(`🔔 Returns sent: ${returnCount}`);
        console.log(`🏪 Businesses processed: ${businessesProcessed}/${businessesSnapshot.size}`);
        console.log(`📊 Firebase reads: ${totalReads} (OPTIMIZED!)`);
        
        return NextResponse.json({ 
            message: `Return checks completed. Found ${returnCount} returns in ${businessesProcessed} businesses.`,
            returnCount,
            businessesProcessed,
            totalReads
        });
    } catch (error: any) {
        console.error('❌ CRON Job (check-returns) failed:', error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
