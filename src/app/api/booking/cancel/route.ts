import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logger, sanitizeForLog } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/booking/cancel
 * 
 * Cancela um agendamento na página pública.
 * Valida telefone do cliente antes de cancelar.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, appointmentId, clientPhone } = body;

        // Validação básica
        if (!businessId || !appointmentId || !clientPhone) {
            return NextResponse.json(
                { error: 'businessId, appointmentId e clientPhone são obrigatórios' },
                { status: 400 }
            );
        }

        // Validar telefone (aceita 11 ou 13 dígitos)
        const phoneStr = String(clientPhone).replace(/\D/g, '');
        
        // Validar tamanho
        if (phoneStr.length !== 11 && phoneStr.length !== 13) {
            return NextResponse.json(
                { error: 'Telefone inválido' },
                { status: 400 }
            );
        }

        // Preparar variações do telefone
        let phone11 = phoneStr;
        let phone13 = phoneStr;
        
        if (phoneStr.length === 13 && phoneStr.startsWith('55')) {
            phone11 = phoneStr.substring(2);
        } else if (phoneStr.length === 11) {
            phone13 = `55${phoneStr}`;
        }

        // Buscar o agendamento
        const appointmentRef = adminDb.collection('negocios').doc(businessId).collection('agendamentos').doc(appointmentId);
        const appointmentDoc = await appointmentRef.get();

        if (!appointmentDoc.exists) {
            return NextResponse.json(
                { error: 'Agendamento não encontrado' },
                { status: 404 }
            );
        }

        const appointmentData = appointmentDoc.data();
        if (!appointmentData) {
            return NextResponse.json(
                { error: 'Dados do agendamento não encontrados' },
                { status: 404 }
            );
        }

        // Verificar se o telefone do cliente corresponde (múltiplos formatos)
        const clientPhoneValue = appointmentData.cliente.phone;
        const isValid = clientPhoneValue === parseInt(phone13, 10) ||
                       clientPhoneValue === phone13 ||
                       clientPhoneValue === parseInt(phone11, 10) ||
                       clientPhoneValue === phone11;
        
        if (!isValid) {
            return NextResponse.json(
                { error: 'Você não tem permissão para cancelar este agendamento' },
                { status: 403 }
            );
        }

        // Verificar se já está cancelado
        if (appointmentData.status === 'Cancelado') {
            return NextResponse.json(
                { error: 'Este agendamento já foi cancelado' },
                { status: 400 }
            );
        }

        // Cancelar agendamento
        await appointmentRef.update({
            status: 'Cancelado',
            canceledAt: FieldValue.serverTimestamp(),
            canceledBy: 'Cliente (página pública)',
        });

        logger.info('Agendamento cancelado via booking', sanitizeForLog({ 
            appointmentId, 
            businessId,
            clientName: appointmentData.cliente.name 
        }));

        // Enviar webhook de cancelamento (se configurado)
        try {
            // Não enviaremos webhooks no cancelamento via booking por enquanto
            // Para evitar complexidade
        } catch (webhookError) {
            logger.error('Erro ao enviar webhook de cancelamento', sanitizeForLog(webhookError));
            // Não falhar a request por causa do webhook
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Agendamento cancelado com sucesso'
        });

    } catch (error: any) {
        logger.error('Erro ao cancelar agendamento via booking', sanitizeForLog(error));
        return NextResponse.json(
            { error: 'Erro ao processar solicitação', details: error.message },
            { status: 500 }
        );
    }
}
