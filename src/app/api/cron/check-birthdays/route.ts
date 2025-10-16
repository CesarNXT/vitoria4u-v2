
import { NextResponse } from 'next/server';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { logger, sanitizeForLog } from '@/lib/logger';

const N8N_BIRTHDAY_WEBHOOK_URL = 'https://n8n.vitoria4u.site/webhook/d0b69658-05f6-4b6c-8cf1-ba0f604b6cb2';

async function callWebhook(payload: any) {
    try {
        const response = await fetch(N8N_BIRTHDAY_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            logger.error('Birthday webhook call failed', { status: response.status });
        }
    } catch (error) {
        logger.error('Error calling birthday webhook', sanitizeForLog(error));
    }
}

export async function GET(request: Request) {
    const authToken = (request.headers.get('authorization') || '').split('Bearer ')[1];

    if (authToken !== process.env.CRON_SECRET) {
        return new Response('Unauthorized', { status: 401 });
    }
    
    try {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        const firestore = getFirestore(app);

        const businessesSnapshot = await getDocs(collection(firestore, 'negocios'));
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
                logger.debug('Birthday messages disabled for business', { businessId, businessName: businessData.nome });
                continue;
            }

            // Array para acumular aniversariantes desta empresa
            const birthdayClients = [];

            // Buscar todos os clientes do negócio
            const clientsSnapshot = await getDocs(collection(firestore, `negocios/${businessId}/clientes`));
            
            for (const clientDoc of clientsSnapshot.docs) {
                const clientData = clientDoc.data();
                
                // Verificar se o cliente tem data de nascimento
                if (clientData.birthDate) {
                    const birthDate = new Date(clientData.birthDate);
                    const birthMonth = birthDate.getMonth() + 1;
                    const birthDay = birthDate.getDate();
                    
                    // Verificar se é aniversário hoje
                    if (birthMonth === todayMonth && birthDay === todayDay) {
                        birthdayClients.push({
                            nome: clientData.name,
                            telefone: clientData.phone,
                            dataNascimento: clientData.birthDate
                        });
                        birthdayCount++;
                    }
                }
            }

            // Se houver aniversariantes nesta empresa, envia 1 webhook com todos
            if (birthdayClients.length > 0) {
                const payload = {
                    nomeEmpresa: businessData.nome,
                    tokenInstancia: businessData.tokenInstancia,
                    instancia: businessId,
                    categoriaEmpresa: businessData.categoria,
                    aniversariantes: birthdayClients,
                    totalAniversariantes: birthdayClients.length
                };
                
                logger.info('Sending birthday batch', { 
                    businessId,
                    businessName: businessData.nome,
                    count: birthdayClients.length
                });
                
                await callWebhook(payload);
                businessesProcessed++;
            }
        }

        logger.success(`CRON Job (check-birthdays) finished. Found ${birthdayCount} birthdays in ${businessesProcessed} businesses.`);
        return NextResponse.json({ 
            message: `Birthday checks completed. Found ${birthdayCount} birthdays in ${businessesProcessed} businesses.`,
            birthdayCount,
            businessesProcessed
        });
    } catch (error) {
        logger.error('CRON Job (check-birthdays) failed', sanitizeForLog(error));
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
