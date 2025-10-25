import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logger, sanitizeForLog } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';
import { sendCancellationHooks } from '@/app/(dashboard)/agendamentos/actions';

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
        
        // Validar tamanho - aceita 11 dígitos (DDD + número) ou 13 dígitos (DDI + DDD + número)
        if (phoneStr.length !== 11 && phoneStr.length !== 13) {
            return NextResponse.json(
                { error: 'Celular deve ter 11 dígitos (DDD + número). Exemplo: 11999887766' },
                { status: 400 }
            );
        }

        // Se já vem com 13 dígitos (DDI 55), usar como está
        // Se vem com 11 dígitos, adicionar DDI 55
        const phone11 = phoneStr.length === 13 ? phoneStr.substring(2) : phoneStr;
        const phone13 = phoneStr.length === 13 ? phoneStr : `55${phoneStr}`;

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

        // ✅ Enviar webhook de cancelamento (notificação gestor + notificação profissional + notificação cliente)
        try {
            // Buscar configurações do negócio para enviar webhooks
            const businessRef = adminDb.collection('negocios').doc(businessId);
            const businessDoc = await businessRef.get();
            
            if (businessDoc.exists) {
                const businessData = businessDoc.data();
                
                // Adicionar o ID ao businessSettings
                const businessSettings = {
                    ...businessData,
                    id: businessId
                };
                
                // Preparar agendamento completo para webhooks
                const fullAppointment = {
                    id: appointmentId,
                    cliente: appointmentData.cliente,
                    servico: appointmentData.servico,
                    profissional: appointmentData.profissional,
                    date: appointmentData.date,
                    startTime: appointmentData.startTime,
                    status: 'Cancelado',
                };
                
                // Enviar webhooks (notificação gestor + notificação profissional)
                await sendCancellationHooks(businessSettings as any, fullAppointment as any);
                logger.success('Webhooks de cancelamento enviados', { appointmentId });
                
                // 📱 ENVIAR CONFIRMAÇÃO DE CANCELAMENTO PARA O CLIENTE (LINK EXTERNO)
                // Cliente que cancela pelo link recebe confirmação automática
                if ((businessSettings as any).whatsappConectado && (businessSettings as any).tokenInstancia) {
                    try {
                        const { notifyClientCancellation } = await import('@/lib/notifications');
                        const { format } = await import('date-fns');
                        
                        // Formatar data/hora
                        let appointmentDate: Date;
                        if (appointmentData.date?.toDate) {
                            appointmentDate = appointmentData.date.toDate();
                        } else if (appointmentData.date instanceof Date) {
                            appointmentDate = appointmentData.date;
                        } else {
                            appointmentDate = new Date(appointmentData.date);
                        }
                        
                        const [hours, minutes] = appointmentData.startTime.split(':').map(Number);
                        appointmentDate.setHours(hours ?? 0, minutes ?? 0, 0, 0);
                        const dataHoraFormatada = format(appointmentDate, "dd/MM/yyyy 'às' HH:mm");
                        
                        await notifyClientCancellation({
                            tokenInstancia: (businessSettings as any).tokenInstancia,
                            telefoneCliente: appointmentData.cliente.phone?.toString() || '',
                            nomeCliente: appointmentData.cliente.name,
                            nomeEmpresa: (businessSettings as any).nome,
                            categoriaEmpresa: (businessSettings as any).categoria,
                            nomeServico: appointmentData.servico.name,
                            dataHoraAtendimento: dataHoraFormatada,
                            nomeProfissional: appointmentData.profissional?.name,
                        });
                        logger.success('Confirmação de cancelamento enviada ao cliente', { appointmentId });
                    } catch (confirmError: any) {
                        // Não bloqueia se falhar
                        logger.error('Erro ao enviar confirmação de cancelamento ao cliente', sanitizeForLog(confirmError));
                    }
                }
            }
        } catch (webhookError) {
            logger.error('Erro ao enviar webhook de cancelamento', sanitizeForLog(webhookError));
            console.error('Detalhes do erro webhook:', webhookError);
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
