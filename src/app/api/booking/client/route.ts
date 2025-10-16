import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logger, sanitizeForLog } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/booking/client
 * 
 * Cria ou atualiza um cliente na página pública de agendamento.
 * Não requer autenticação - valida apenas via telefone e businessId.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, name, phone, birthDate, planoSaude } = body;

        // Validação básica
        if (!businessId || !name || !phone) {
            return NextResponse.json(
                { error: 'businessId, name e phone são obrigatórios' },
                { status: 400 }
            );
        }

        // Validar telefone (aceita 11 ou 13 dígitos)
        const originalPhoneStr = String(phone).replace(/\D/g, '');
        
        // Validar tamanho - aceita 11 dígitos (DDD + número) ou 13 dígitos (DDI + DDD + número)
        if (originalPhoneStr.length !== 11 && originalPhoneStr.length !== 13) {
            return NextResponse.json(
                { error: 'Celular deve ter 11 dígitos (DDD + número). Exemplo: 11999887766' },
                { status: 400 }
            );
        }

        // Se já vem com 13 dígitos (DDI 55), usar como está
        // Se vem com 11 dígitos, adicionar DDI 55
        const phone11digits = originalPhoneStr.length === 13 ? originalPhoneStr.substring(2) : originalPhoneStr;
        const phone13digits = originalPhoneStr.length === 13 ? originalPhoneStr : `55${originalPhoneStr}`;

        // Salvar sempre com 13 dígitos como número (padrão do sistema)
        const numericPhone = parseInt(phone13digits, 10);

        // Verificar se o negócio existe
        const businessRef = adminDb.collection('negocios').doc(businessId);
        const businessDoc = await businessRef.get();
        
        if (!businessDoc.exists) {
            return NextResponse.json(
                { error: 'Negócio não encontrado' },
                { status: 404 }
            );
        }

        // Verificar se cliente já existe (busca em múltiplos formatos)
        const clientsRef = adminDb.collection(`negocios/${businessId}/clientes`);
        
        // Tentativa 1: Como número com 13 dígitos
        let existingClients = await clientsRef.where('phone', '==', numericPhone).get();

        // Tentativa 2: Como string com 13 dígitos
        if (existingClients.empty) {
            existingClients = await clientsRef.where('phone', '==', phone13digits).get();
        }

        // Tentativa 3: Como número com 11 dígitos
        if (existingClients.empty) {
            existingClients = await clientsRef.where('phone', '==', parseInt(phone11digits, 10)).get();
        }

        // Tentativa 4: Como string com 11 dígitos
        if (existingClients.empty) {
            existingClients = await clientsRef.where('phone', '==', phone11digits).get();
        }

        let clientId: string;
        let clientData: any = {
            name,
            phone: numericPhone, // Salvar como número
            birthDate: birthDate || null, // String ISO ou null
            status: 'Ativo',
            instanciaWhatsapp: businessId,
            createdAt: FieldValue.serverTimestamp(),
        };

        // Adicionar plano de saúde se fornecido
        if (planoSaude) {
            clientData.planoSaude = planoSaude;
        }

        if (!existingClients.empty) {
            // Atualizar cliente existente
            const existingClient = existingClients.docs[0];
            clientId = existingClient.id;
            
            // Atualizar dados + normalizar telefone para número
            const updateData: any = {
                name,
                phone: numericPhone, // Normalizar telefone para número
                birthDate: birthDate || null, // String ISO ou null
            };

            // Atualizar plano de saúde se fornecido
            if (planoSaude) {
                updateData.planoSaude = planoSaude;
            } else {
                // Se não forneceu plano, remover o plano existente
                updateData.planoSaude = null;
            }

            await clientsRef.doc(clientId).update(updateData);

            logger.info('Cliente atualizado via booking (telefone normalizado)', sanitizeForLog({ clientId, businessId }));
        } else {
            // Criar novo cliente
            const newClientRef = await clientsRef.add(clientData);
            clientId = newClientRef.id;

            logger.success('Cliente criado via booking', sanitizeForLog({ clientId, businessId }));
        }

        return NextResponse.json({ 
            success: true, 
            clientId,
            message: existingClients.empty ? 'Cliente criado' : 'Cliente atualizado'
        });

    } catch (error: any) {
        logger.error('Erro ao gerenciar cliente via booking', sanitizeForLog(error));
        return NextResponse.json(
            { error: 'Erro ao processar solicitação', details: error.message },
            { status: 500 }
        );
    }
}
