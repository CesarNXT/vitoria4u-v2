
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const N8N_BIRTHDAY_WEBHOOK_URL = 'https://n8n.vitoria4u.site/webhook/d0b69658-05f6-4b6c-8cf1-ba0f604b6cb2';

async function callWebhook(payload: any) {
    try {
        const response = await fetch(N8N_BIRTHDAY_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            console.error('Birthday webhook call failed', { status: response.status });
        } else {
            console.log('✅ Birthday webhook sent successfully');
        }
    } catch (error) {
        console.error('Error calling birthday webhook', error);
    }
}

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
                        // Envia 1 webhook para cada aniversariante
                        const payload = {
                            nomeEmpresa: businessData.nome,
                            tokenInstancia: businessData.tokenInstancia,
                            instancia: businessId,
                            categoriaEmpresa: businessData.categoria,
                            nomeCliente: clientData.name,
                            telefoneCliente: clientData.phone,
                            dataNascimento: clientData.birthDate
                        };
                        
                        console.log(`🎂 Sending birthday webhook for ${clientData.name} at ${businessData.nome}`);
                        
                        await callWebhook(payload);
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
