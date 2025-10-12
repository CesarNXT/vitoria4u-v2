import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logger, sanitizeForLog } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/booking/appointment
 * 
 * Cria um agendamento na página pública.
 * Valida telefone + businessId antes de criar.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { 
            businessId, 
            clientId, 
            serviceId, 
            professionalId, 
            date, 
            startTime,
            clientPhone 
        } = body;

        // Validação básica
        if (!businessId || !clientId || !serviceId || !professionalId || !date || !startTime) {
            return NextResponse.json(
                { error: 'Todos os campos são obrigatórios' },
                { status: 400 }
            );
        }

        // Verificar se o cliente existe e pertence ao negócio
        const clientRef = adminDb.collection('negocios').doc(businessId).collection('clientes').doc(clientId);
        const clientDoc = await clientRef.get();

        if (!clientDoc.exists) {
            return NextResponse.json(
                { error: 'Cliente não encontrado' },
                { status: 404 }
            );
        }

        const clientData = clientDoc.data();
        if (!clientData) {
            return NextResponse.json(
                { error: 'Dados do cliente não encontrados' },
                { status: 404 }
            );
        }

        // Validar telefone (segurança adicional - aceita múltiplos formatos)
        if (clientPhone) {
            const phoneStr = String(clientPhone).replace(/\D/g, '');
            
            // Preparar variações
            let phone11 = phoneStr;
            let phone13 = phoneStr;
            
            if (phoneStr.length === 13 && phoneStr.startsWith('55')) {
                phone11 = phoneStr.substring(2);
            } else if (phoneStr.length === 11) {
                phone13 = `55${phoneStr}`;
            }
            
            // Verifica se alguma variação corresponde ao telefone do cliente
            const clientPhoneValue = clientData.phone;
            const isValid = clientPhoneValue === parseInt(phone13, 10) ||
                           clientPhoneValue === phone13 ||
                           clientPhoneValue === parseInt(phone11, 10) ||
                           clientPhoneValue === phone11;
            
            if (!isValid) {
                return NextResponse.json(
                    { error: 'Telefone não corresponde ao cliente' },
                    { status: 403 }
                );
            }
        }

        // Buscar dados do serviço
        const serviceRef = adminDb.collection('negocios').doc(businessId).collection('servicos').doc(serviceId);
        const serviceDoc = await serviceRef.get();

        if (!serviceDoc.exists) {
            return NextResponse.json(
                { error: 'Serviço não encontrado' },
                { status: 404 }
            );
        }

        const serviceData = serviceDoc.data();
        if (!serviceData) {
            return NextResponse.json(
                { error: 'Dados do serviço não encontrados' },
                { status: 404 }
            );
        }

        // Buscar dados do profissional
        const professionalRef = adminDb.collection('negocios').doc(businessId).collection('profissionais').doc(professionalId);
        const professionalDoc = await professionalRef.get();

        if (!professionalDoc.exists) {
            return NextResponse.json(
                { error: 'Profissional não encontrado' },
                { status: 404 }
            );
        }

        const professionalData = professionalDoc.data();
        if (!professionalData) {
            return NextResponse.json(
                { error: 'Dados do profissional não encontrados' },
                { status: 404 }
            );
        }

        // Verificar conflito de horário
        const appointmentsRef = adminDb.collection('negocios').doc(businessId).collection('agendamentos');
        const appointmentDate = new Date(date);
        const appointmentDateISO = appointmentDate.toISOString();
        
        const existingAppointments = await appointmentsRef
            .where('profissional.id', '==', professionalId)
            .where('status', '==', 'Agendado')
            .get();
        
        // Verificar conflito de horário
        const hasConflict = existingAppointments.docs.some(doc => {
            const appt = doc.data();
            
            // Converter date para Date object (pode ser Timestamp, Date ou string)
            let apptDate: Date;
            if (appt.date && typeof appt.date.toDate === 'function') {
                // É um Firestore Timestamp
                apptDate = appt.date.toDate();
            } else if (appt.date instanceof Date) {
                // Já é um Date
                apptDate = appt.date;
            } else {
                // É uma string ISO
                apptDate = new Date(appt.date);
            }
            
            if (apptDate.toDateString() === appointmentDate.toDateString() && appt.startTime === startTime) {
                return true;
            }
            return false;
        });

        if (hasConflict) {
            return NextResponse.json(
                { error: 'Este horário já está ocupado' },
                { status: 409 }
            );
        }

        // Criar agendamento
        const appointmentData = {
            cliente: {
                id: clientId,
                name: clientData.name,
                phone: clientData.phone,
            },
            servico: {
                id: serviceId,
                name: serviceData.name,
                duration: serviceData.duration,
                price: serviceData.price,
                returnInDays: serviceData.returnInDays || null,
            },
            profissional: {
                id: professionalId,
                name: professionalData.name,
            },
            date: appointmentDateISO, // String ISO
            startTime,
            status: 'Agendado',
            createdAt: FieldValue.serverTimestamp(),
            instanciaWhatsapp: businessId,
        };

        const newAppointmentRef = await appointmentsRef.add(appointmentData);

        logger.success('Agendamento criado via booking', sanitizeForLog({ 
            appointmentId: newAppointmentRef.id, 
            businessId,
            clientName: clientData.name 
        }));

        // Enviar webhooks (se configurado)
        try {
            // Não enviaremos webhooks na criação via booking por enquanto
            // Para evitar complexidade de buscar todos os dados necessários
        } catch (webhookError) {
            logger.error('Erro ao enviar webhook de criação', sanitizeForLog(webhookError));
            // Não falhar a request por causa do webhook
        }

        return NextResponse.json({ 
            success: true, 
            appointmentId: newAppointmentRef.id,
            message: 'Agendamento criado com sucesso'
        });

    } catch (error: any) {
        logger.error('Erro ao criar agendamento via booking', sanitizeForLog({
            message: error.message,
            stack: error.stack
        }));
        return NextResponse.json(
            { error: 'Erro ao processar solicitação', details: error.message },
            { status: 500 }
        );
    }
}
