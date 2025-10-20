import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { addDays, isSameDay, startOfDay } from 'date-fns';
import { notifyReturn } from '@/lib/notifications';

// 🧪 VERSÃO DE TESTE - SEM AUTENTICAÇÃO
// Acesse: http://localhost:3000/api/test/check-returns

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
    console.log('🧪 TEST: check-returns iniciado');
    
    try {
        const today = startOfDay(new Date());
        console.log('📅 Data de hoje:', today.toISOString());
        
        // Buscar negócios com WhatsApp
        const businessesSnapshot = await adminDb.collection('negocios')
            .where('whatsappConectado', '==', true)
            .get();
        
        console.log(`🏪 Negócios com WhatsApp: ${businessesSnapshot.size}`);
        
        const results = {
            today: today.toISOString(),
            businessesChecked: businessesSnapshot.size,
            appointmentsChecked: 0,
            returnsFound: 0,
            returnsSent: 0,
            errors: [] as string[],
            details: [] as any[]
        };
        
        for (const businessDoc of businessesSnapshot.docs) {
            const businessData = businessDoc.data();
            const businessId = businessDoc.id;
            
            console.log(`\n🏢 Negócio: ${businessData.nome} (${businessId})`);

            if (!businessData.tokenInstancia) {
                console.log('  ⚠️ Sem token de instância');
                continue;
            }

            // Buscar agendamentos finalizados
            const appointmentsSnapshot = await adminDb
                .collection(`negocios/${businessId}/agendamentos`)
                .where('status', '==', 'Finalizado')
                .get();
            
            results.appointmentsChecked += appointmentsSnapshot.size;
            console.log(`  📋 Agendamentos finalizados: ${appointmentsSnapshot.size}`);

            for (const appointmentDoc of appointmentsSnapshot.docs) {
                const appointmentData = appointmentDoc.data();
                const service = appointmentData.servico;

                // Verificar se tem período de retorno
                if (!service || typeof service.returnInDays !== 'number' || service.returnInDays <= 0) {
                    continue;
                }
                
                const appointmentDate = toDate(appointmentData.date);
                if (!appointmentDate) {
                    continue;
                }

                // Calcular data de retorno
                const returnDate = addDays(startOfDay(appointmentDate), service.returnInDays);
                const isReturnDay = isSameDay(today, returnDate);
                
                const detail = {
                    appointmentId: appointmentDoc.id,
                    cliente: appointmentData.cliente.name,
                    servico: service.name,
                    dataAgendamento: appointmentDate.toISOString(),
                    diasRetorno: service.returnInDays,
                    dataRetorno: returnDate.toISOString(),
                    isReturnDay,
                    telefone: appointmentData.cliente.phone
                };
                
                results.details.push(detail);
                
                if (isReturnDay) {
                    results.returnsFound++;
                    console.log(`  🔔 RETORNO ENCONTRADO!`);
                    console.log(`     Cliente: ${appointmentData.cliente.name}`);
                    console.log(`     Serviço: ${service.name}`);
                    console.log(`     Data agendamento: ${appointmentDate.toISOString()}`);
                    console.log(`     Dias retorno: ${service.returnInDays}`);
                    console.log(`     Data retorno: ${returnDate.toISOString()}`);
                    
                    try {
                        await notifyReturn({
                            tokenInstancia: businessData.tokenInstancia,
                            telefoneCliente: appointmentData.cliente.phone,
                            nomeCliente: appointmentData.cliente.name,
                            nomeEmpresa: businessData.nome,
                            nomeServico: service.name,
                            diasRetorno: service.returnInDays,
                            categoriaEmpresa: businessData.categoria
                        });
                        
                        results.returnsSent++;
                        console.log(`     ✅ Mensagem enviada!`);
                    } catch (error: any) {
                        const errorMsg = `Erro ao enviar para ${appointmentData.cliente.name}: ${error.message}`;
                        results.errors.push(errorMsg);
                        console.error(`     ❌ ${errorMsg}`);
                    }
                }
            }
        }

        console.log(`\n✅ TEST FINALIZADO`);
        console.log(`📊 Resultados:`);
        console.log(`   - Negócios verificados: ${results.businessesChecked}`);
        console.log(`   - Agendamentos verificados: ${results.appointmentsChecked}`);
        console.log(`   - Retornos encontrados: ${results.returnsFound}`);
        console.log(`   - Mensagens enviadas: ${results.returnsSent}`);
        console.log(`   - Erros: ${results.errors.length}`);
        
        return NextResponse.json(results);
    } catch (error: any) {
        console.error('❌ Erro no teste:', error);
        return NextResponse.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
}
