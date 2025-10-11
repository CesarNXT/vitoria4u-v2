
import { NextResponse } from 'next/server';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

const N8N_BIRTHDAY_WEBHOOK_URL = 'https://n8n.vitoria4u.site/webhook/d0b69658-05f6-4b6c-8cf1-ba0f604b6cb2';

async function callWebhook(payload: any) {
    try {
        await fetch(N8N_BIRTHDAY_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Error calling birthday webhook:', error);
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
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();

        for (const businessDoc of businessesSnapshot.docs) {
            const businessData = businessDoc.data();

            // Pular negócios no plano gratuito
            if (businessData.planId === 'plano_gratis') {
                continue;
            }

            const clientsSnapshot = await getDocs(collection(firestore, `negocios/${businessDoc.id}/clientes`));

            for (const clientDoc of clientsSnapshot.docs) {
                const clientData = clientDoc.data();
                if (clientData.birthDate) {
                    const birthDate = clientData.birthDate.toDate();
                    if (birthDate.getMonth() + 1 === todayMonth && birthDate.getDate() === todayDay) {
                        const payload = {
                            nomeCliente: clientData.name,
                            nomeEmpresa: businessData.nome,
                            tokenInstancia: businessData.tokenInstancia,
                            instancia: businessDoc.id, // Use business ID as instance
                            telefoneCliente: clientData.phone,
                            categoriaEmpresa: businessData.categoria,
                        };
                        await callWebhook(payload);
                    }
                }
            }
        }

        return NextResponse.json({ message: 'Birthday checks initiated.' });
    } catch (error) {
        console.error('CRON Job (check-birthdays) failed:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
