import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logger, sanitizeForLog } from '@/lib/logger';

/**
 * POST /api/booking/check-client
 * 
 * Verifica se um cliente existe pelo telefone na página pública.
 * Retorna dados do cliente se existir, senão retorna null.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, phone } = body;

        // Validação básica
        if (!businessId || !phone) {
            return NextResponse.json(
                { error: 'businessId e phone são obrigatórios' },
                { status: 400 }
            );
        }

        // Validar telefone (aceita 11 ou 13 dígitos)
        const originalPhoneStr = String(phone).replace(/\D/g, '');
        
        // Validar tamanho
        if (originalPhoneStr.length !== 11 && originalPhoneStr.length !== 13) {
            return NextResponse.json(
                { error: 'Telefone deve ter 11 ou 13 dígitos' },
                { status: 400 }
            );
        }

        // Preparar variações do telefone para busca
        let phone11digits = originalPhoneStr;
        let phone13digits = originalPhoneStr;
        
        if (originalPhoneStr.length === 13 && originalPhoneStr.startsWith('55')) {
            phone11digits = originalPhoneStr.substring(2);
        } else if (originalPhoneStr.length === 11) {
            phone13digits = `55${originalPhoneStr}`;
        }

        const clientsRef = adminDb.collection(`negocios/${businessId}/clientes`);
        
        // Buscar cliente por telefone (tenta todos os formatos possíveis)
        // Tentativa 1: Como número com 13 dígitos (formato atual do banco)
        let clientSnapshot = await clientsRef.where('phone', '==', parseInt(phone13digits, 10)).limit(1).get();

        // Tentativa 2: Como string com 13 dígitos
        if (clientSnapshot.empty) {
            clientSnapshot = await clientsRef.where('phone', '==', phone13digits).limit(1).get();
        }

        // Tentativa 3: Como número com 11 dígitos
        if (clientSnapshot.empty) {
            clientSnapshot = await clientsRef.where('phone', '==', parseInt(phone11digits, 10)).limit(1).get();
        }

        // Tentativa 4: Como string com 11 dígitos
        if (clientSnapshot.empty) {
            clientSnapshot = await clientsRef.where('phone', '==', phone11digits).limit(1).get();
        }

        if (clientSnapshot.empty) {
            return NextResponse.json({ 
                exists: false,
                client: null
            });
        }

        const clientDoc = clientSnapshot.docs[0];
        const clientData = clientDoc.data();

        // Converter Firestore Timestamp para ISO string
        const client = {
            id: clientDoc.id,
            name: clientData.name,
            phone: clientData.phone,
            birthDate: clientData.birthDate?.toDate?.()?.toISOString() || clientData.birthDate,
            status: clientData.status,
            avatarUrl: clientData.avatarUrl || null,
            instanciaWhatsapp: clientData.instanciaWhatsapp,
        };

        logger.info('Cliente encontrado via booking', sanitizeForLog({ clientId: client.id, businessId }));

        return NextResponse.json({ 
            exists: true,
            client
        });

    } catch (error: any) {
        logger.error('Erro ao verificar cliente via booking', sanitizeForLog(error));
        return NextResponse.json(
            { error: 'Erro ao processar solicitação', details: error.message },
            { status: 500 }
        );
    }
}
