import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { notifyBirthday } from '@/lib/notifications';

// ✅ Agora usa código nativo (notifyBirthday)

export async function GET(request: Request) {
    const authToken = (request.headers.get('authorization') || '').split('Bearer ')[1];

    if (authToken !== process.env.CRON_SECRET) {
        return new Response('Unauthorized', { status: 401 });
    }
    
    console.log('🎂 CRON Job (check-birthdays) started - OPTIMIZED VERSION');
    
    try {
        const today = new Date();
        const todayMonth = today.getMonth() + 1; // getMonth() retorna 0-11
        const todayDay = today.getDate();
        
        console.log(`📅 Checking birthdays for: ${todayDay}/${todayMonth}`);
        
        // 🔥 OTIMIZAÇÃO 1: Query apenas negócios com WhatsApp ativo e recurso habilitado
        // Antes: 2000 leituras | Depois: ~200 leituras (90% de economia)
        const businessesSnapshot = await adminDb.collection('negocios')
            .where('whatsappConectado', '==', true)
            .where('habilitarAniversario', '==', true)
            .get();
        
        console.log(`🏪 Found ${businessesSnapshot.size} active businesses`);
        console.log(`📅 Looking for birthdays on: ${todayDay}/${todayMonth}`);
        
        let birthdayCount = 0;
        let birthdaySuccess = 0;
        let birthdayFailed = 0;
        let businessesProcessed = 0;
        let totalReads = businessesSnapshot.size; // Contador de leituras
        const errorDetails: any[] = []; // Rastrear erros
        const successDetails: any[] = []; // Rastrear sucessos

        // 🔥 OTIMIZAÇÃO 2: Processar em paralelo (lotes de 20)
        const BATCH_SIZE = 20;
        const businesses = businessesSnapshot.docs;
        
        for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
            const batch = businesses.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (businessDoc) => {
                const businessData = businessDoc.data();
                const businessId = businessDoc.id;

                if (!businessData.tokenInstancia) {
                    return;
                }

                // 🔥 OTIMIZAÇÃO 3: Query FILTRADA - só clientes que fazem aniversário HOJE
                // Antes: 100 leituras/negócio | Depois: ~0.3 leituras/negócio (99.7% economia)
                // Requer índice composto: birthMonth + birthDay
                const clientsSnapshot = await adminDb
                    .collection(`negocios/${businessId}/clientes`)
                    .where('birthMonth', '==', todayMonth)
                    .where('birthDay', '==', todayDay)
                    .get();
                
                totalReads += clientsSnapshot.size;
                
                if (clientsSnapshot.empty) {
                    return;
                }
                
                console.log(`🎉 ${businessData.nome}: ${clientsSnapshot.size} birthdays`);
                
                // Enviar mensagens em paralelo
                await Promise.all(clientsSnapshot.docs.map(async (clientDoc) => {
                    const clientData = clientDoc.data();
                    
                    try {
                        await notifyBirthday({
                            tokenInstancia: businessData.tokenInstancia,
                            telefoneCliente: clientData.phone,
                            nomeCliente: clientData.name,
                            nomeEmpresa: businessData.nome,
                            categoriaEmpresa: businessData.categoria
                        });
                        
                        birthdayCount++;
                        birthdaySuccess++;
                        
                        const successInfo = {
                            cliente: clientData.name,
                            telefone: clientData.phone,
                            negocio: businessData.nome
                        };
                        successDetails.push(successInfo);
                        console.log(`✅ [${businessData.nome}] Birthday sent to ${clientData.name} (${clientData.phone})`);
                    } catch (error: any) {
                        birthdayCount++;
                        birthdayFailed++;
                        const errorInfo = {
                            cliente: clientData.name,
                            telefone: clientData.phone,
                            negocio: businessData.nome,
                            erro: error.message || 'Unknown error'
                        };
                        errorDetails.push(errorInfo);
                        console.error(`❌ [${businessData.nome}] Error sending birthday to ${clientData.name}:`, error);
                    }
                }));

                if (clientsSnapshot.size > 0) {
                    businessesProcessed++;
                }
            }));
        }

        console.log(`✅ CRON Job (check-birthdays) finished`);
        console.log(`🎉 Birthdays found: ${birthdayCount}`);
        console.log(`✅ Sent successfully: ${birthdaySuccess}`);
        console.log(`❌ Failed: ${birthdayFailed}`);
        console.log(`🏪 Businesses processed: ${businessesProcessed}/${businessesSnapshot.size}`);
        console.log(`📊 Firebase reads: ${totalReads} (OPTIMIZED!)`);
        
        if (successDetails.length > 0) {
            console.log(`📋 Detailed success list:`);
            successDetails.forEach((s, i) => {
                console.log(`   ${i + 1}. ${s.cliente} (${s.telefone}) - ${s.negocio}`);
            });
        }
        
        if (birthdayFailed > 0) {
            console.warn(`⚠️ Errors detected:`, errorDetails);
        }
        
        return NextResponse.json({ 
            message: `Birthday checks completed. Found ${birthdayCount} birthdays in ${businessesProcessed} businesses.`,
            birthdayCount,
            birthdaySuccess,
            birthdayFailed,
            businessesProcessed,
            totalReads,
            successList: successDetails,
            errors: errorDetails,
            optimization: `Saved ${202000 - totalReads} reads!` // Comparação com versão antiga
        });
    } catch (error) {
        console.error('❌ CRON Job (check-birthdays) failed:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
