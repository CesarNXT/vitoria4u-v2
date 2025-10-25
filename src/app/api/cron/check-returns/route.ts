import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { addDays, isSameDay, startOfDay } from 'date-fns';
import { notifyReturn } from '@/lib/notifications';

/**
 * 🔍 Verificar se cliente tem agendamento futuro
 * Evita enviar retornos se o cliente já tem outro agendamento próximo
 */
async function hasUpcomingAppointment(
  businessId: string,
  clientePhone: string | number,
  appointmentDate: Date
): Promise<boolean> {
  try {
    const futureDate = addDays(startOfDay(appointmentDate), 5); // Verifica 5 dias a frente
    
    const snapshot = await adminDb
      .collection(`negocios/${businessId}/agendamentos`)
      .where('cliente.phone', '==', clientePhone)
      .where('status', '==', 'Agendado')
      .where('date', '>', appointmentDate)
      .where('date', '<=', futureDate)
      .limit(1)
      .get();
    
    return !snapshot.empty;
  } catch (error) {
    console.error('Erro ao verificar agendamentos futuros:', error);
    return false;
  }
}

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
        const today = startOfDay(new Date());
        
        const businessesSnapshot = await adminDb.collection('negocios')
            .where('whatsappConectado', '==', true)
            .get();
        
        let returnCount = 0;
        let businessesProcessed = 0;
        let totalReads = businessesSnapshot.size;
        
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

                const appointmentsSnapshot = await adminDb
                    .collection(`negocios/${businessId}/agendamentos`)
                    .where('status', '==', 'Finalizado')
                    .get();
                
                totalReads += appointmentsSnapshot.size;

                const returnPromises = appointmentsSnapshot.docs.map(async (appointmentDoc) => {
                    const appointmentData = appointmentDoc.data();
                    const service = appointmentData.servico;

                    if (!service || typeof service.returnInDays !== 'number' || service.returnInDays <= 0) {
                        return;
                    }
                    
                    const appointmentDate = toDate(appointmentData.date);
                    if (!appointmentDate) {
                        return;
                    }

                    const returnDate = addDays(startOfDay(appointmentDate), service.returnInDays);
                    
                    if (!isSameDay(today, returnDate)) {
                        return;
                    }
                    
                    const client = appointmentData.cliente;
                    
                    // 🔍 VERIFICAR SE TEM AGENDAMENTO FUTURO
                    const hasFutureAppointment = await hasUpcomingAppointment(
                        businessId,
                        client.phone,
                        appointmentDate
                    );

                    if (hasFutureAppointment) {
                        // Cliente já tem agendamento próximo, não enviar retorno
                        return;
                    }
                    
                    try {
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
                        console.error(`Erro ao enviar retorno para ${client.name}:`, error);
                    }
                });
                
                await Promise.all(returnPromises);

                if (businessHasReturns) {
                    businessesProcessed++;
                }
            }));
        }
        
        return NextResponse.json({ 
            message: `Return checks completed. Found ${returnCount} returns in ${businessesProcessed} businesses.`,
            returnCount,
            businessesProcessed,
            totalReads
        });
    } catch (error: any) {
        console.error('CRON Job (check-returns) failed:', error);
        return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
