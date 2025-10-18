import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { notifyBirthday } from '@/lib/notifications';

// ✅ Agora usa código nativo (notifyBirthday)

export async function GET(request: Request) {
    const authToken = (request.headers.get('authorization') || '').split('Bearer ')[1];

    if (authToken !== process.env.CRON_SECRET) {
        return new Response('Unauthorized', { status: 401 });
    }
    
    try {
        const businessesSnapshot = await adminDb.collection('negocios').get();
        const today = new Date();
        const todayMonth = today.getMonth() + 1; // getMonth() retorna 0-11
        const todayDay = today.getDate();
        
        let birthdayCount = 0;
        let businessesProcessed = 0;

        for (const businessDoc of businessesSnapshot.docs) {
            const businessData = businessDoc.data();
            const businessId = businessDoc.id;

            // Só processar se o negócio tem WhatsApp conectado E a funcionalidade de aniversário habilitada
            if (!businessData.whatsappConectado || !businessData.tokenInstancia) {
                continue;
            }
            
            // Verificar se a funcionalidade de mensagem de aniversário está habilitada
            if (businessData.habilitarAniversario === false) {
                console.log(`Birthday messages disabled for business: ${businessId} (${businessData.nome})`);
                continue;
            }

            // Buscar todos os clientes do negócio
            const clientsSnapshot = await adminDb.collection(`negocios/${businessId}/clientes`).get();
            
            for (const clientDoc of clientsSnapshot.docs) {
                const clientData = clientDoc.data();
                
                // Verificar se o cliente tem data de nascimento
                if (clientData.birthDate) {
                    const birthDate = new Date(clientData.birthDate);
                    const birthMonth = birthDate.getMonth() + 1;
                    const birthDay = birthDate.getDate();
                    
                    // Verificar se é aniversário hoje
                    if (birthMonth === todayMonth && birthDay === todayDay) {
                        // Envia mensagem de aniversário (código nativo)
                        await notifyBirthday({
                            tokenInstancia: businessData.tokenInstancia,
                            telefoneCliente: clientData.phone,
                            nomeCliente: clientData.name,
                            nomeEmpresa: businessData.nome,
                            categoriaEmpresa: businessData.categoria
                        });
                        
                        birthdayCount++;
                    }
                }
            }

            if (birthdayCount > 0) {
                businessesProcessed++;
            }
        }

        console.log(`✅ CRON Job (check-birthdays) finished. Found ${birthdayCount} birthdays in ${businessesProcessed} businesses.`);
        return NextResponse.json({ 
            message: `Birthday checks completed. Found ${birthdayCount} birthdays in ${businessesProcessed} businesses.`,
            birthdayCount,
            businessesProcessed
        });
    } catch (error) {
        console.error('❌ CRON Job (check-birthdays) failed:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
