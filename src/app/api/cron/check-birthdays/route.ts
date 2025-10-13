
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
        
        // Por enquanto, apenas retornar sucesso sem processar
        // TODO: Implementar lógica de aniversários

        return NextResponse.json({ message: 'Birthday checks initiated.' });
    } catch (error) {
        logger.error('CRON Job (check-birthdays) failed', sanitizeForLog(error));
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
