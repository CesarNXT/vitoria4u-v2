"use server";

/**
 * 📅 AGENDAMENTOS - AUTOMAÇÕES E NOTIFICAÇÕES
 * 
 * ⚠️ IMPORTANTE - 2 TIPOS DE MENSAGENS:
 * 
 * 1️⃣ NOTIFICAÇÕES DO SISTEMA (Token Fixo):
 *    - Usa token: b2e97825-2d28-4646-ae38-3357fcbf0e20
 *    - SEMPRE funciona (instância do sistema sempre conectada)
 *    - NÃO precisa que usuário esteja conectado
 *    - Exemplos: novo agendamento, cancelamento
 * 
 * 2️⃣ MENSAGENS DO USUÁRIO (Token Dinâmico):
 *    - Usa: businessSettings.tokenInstancia
 *    - SÓ funciona se whatsappConectado === true
 *    - PRECISA que usuário esteja conectado
 *    - Exemplos: lembretes 24h/2h, feedback, notificação profissional
 */

import type { Agendamento, ConfiguracoesNegocio, Plano, PlanFeature } from "@/lib/types";
import { add, format, parse, isDate } from 'date-fns';
import { adminDb } from "@/lib/firebase-admin";
import { checkFeatureAccess } from "@/lib/server-utils";
import { logger, sanitizeForLog } from "@/lib/logger";
import { 
    notifyNewAppointment, 
    notifyCancelledAppointment,
    notifyProfessionalNewAppointment,
    notifyProfessionalCancellation,
    notifyFeedbackRequest,
    notifyClientAppointmentConfirmation
} from "@/lib/notifications";

// ✅ N8N REMOVIDO - Agora usa código nativo em notifications.ts

function getAppointmentDateTime(dateValue: any, startTime: string): Date {
    let datePart: Date;

    if (!dateValue || !startTime) {
        throw new Error("Campo date ou startTime ausente ou inválido.");
    }
    
    if (typeof dateValue === "object" && "seconds" in dateValue) {
        datePart = new Date(dateValue.seconds * 1000);
    } else if (isDate(dateValue)) {
        datePart = dateValue;
    } else if (typeof dateValue === 'string') {
        const parsed = new Date(dateValue);
        if (!isNaN(parsed.getTime())) {
            datePart = parsed;
        } else {
            const parsedFallback = parse(dateValue, 'yyyy-MM-dd', new Date());
             if (!isNaN(parsedFallback.getTime())) {
                datePart = parsedFallback;
            } else {
                throw new RangeError("Invalid time value (string de data inválida).");
            }
        }
    } else {
        throw new RangeError("Invalid time value (tipo de dateValue desconhecido).");
    }

    if (isNaN(datePart.getTime())) {
        throw new RangeError("Invalid time value (dateValue resultou em data inválida).");
    }
    
    const [hours, minutes] = startTime.split(':').map(Number);
    
    const resultDate = new Date(datePart.getFullYear(), datePart.getMonth(), datePart.getDate(), hours, minutes);

    return resultDate;
}

/**
 * Envia notificação para o profissional
 * 
 * ⚠️ USA TOKEN DO USUÁRIO (businessSettings.tokenInstancia)
 * SÓ funciona se whatsappConectado === true
 */
async function sendProfessionalNotification(
    businessSettings: ConfiguracoesNegocio,
    appointment: Agendamento,
    status: 'Novo Agendamento' | 'Agendamento Cancelado' | 'Agendamento Excluído',
    criadoPor?: string
): Promise<void> {
    logger.debug('🔔 Iniciando notificação profissional', { 
        status, 
        professionalName: appointment.profissional?.name,
        professionalPhone: appointment.profissional?.phone 
    });

    // ⚠️ CRÍTICO: Verifica se usuário está conectado (usa token do usuário)
    if (!businessSettings.whatsappConectado) {
        logger.debug('❌ WhatsApp não conectado - notificação profissional cancelada');
        return;
    }

    const hasAccess = await checkFeatureAccess(businessSettings, 'lembrete_profissional');
    if (!hasAccess) {
        logger.debug('❌ Sem acesso à feature lembrete_profissional');
        return;
    }

    if (!appointment.profissional?.phone) {
        logger.debug('❌ Profissional sem telefone cadastrado');
        return;
    }

    // Verifica se o profissional tem notificações ativadas (padrão: true para profissionais antigos)
    const notificationsEnabled = appointment.profissional.notificarAgendamentos ?? true;
    if (!notificationsEnabled) {
        logger.debug('🔕 Notificação de profissional desabilitada', { professionalId: appointment.profissional.id });
        return;
    }

    if (appointment.profissional.phone === businessSettings.telefone) {
        logger.debug('❌ Telefone do profissional é igual ao do gestor - não enviando duplicado');
        return;
    }

    const appointmentDateTime = getAppointmentDateTime(appointment.date, appointment.startTime);
    const dataHoraAtendimento = format(appointmentDateTime, 'dd/MM/yyyy HH:mm');

    // 👔 NOTIFICAÇÃO DO PROFISSIONAL (Token do Usuário - verifica se conectado)
    // Avisa o profissional sobre novo agendamento ou cancelamento
    
    if (!businessSettings.tokenInstancia) {
        logger.debug('❌ Token da instância não encontrado - não é possível notificar profissional');
        return;
    }

    const notificationData = {
        tokenInstancia: businessSettings.tokenInstancia,
        telefoneProfissional: appointment.profissional.phone,
        nomeProfissional: appointment.profissional.name,
        nomeCliente: appointment.cliente.name,
        nomeServico: appointment.servico.name,
        dataHoraAtendimento: dataHoraAtendimento,
        criadoPor: criadoPor,
        telefoneCliente: appointment.cliente.phone?.toString(),
    };
    
    if (status === 'Novo Agendamento') {
        logger.debug('🔔 Notificando profissional (novo agendamento)', { 
            professionalPhone: appointment.profissional.phone 
        });
        await notifyProfessionalNewAppointment(notificationData);
    } else {
        logger.debug('🔔 Notificando profissional (cancelamento)', { 
            professionalPhone: appointment.profissional.phone 
        });
        await notifyProfessionalCancellation(notificationData);
    }
}

export async function sendCreationHooks(
    businessSettings: ConfiguracoesNegocio,
    appointment: Agendamento,
    criadoPor?: string,
    isFromPanel?: boolean // true = criado pelo painel, false/undefined = link externo
): Promise<void> {
    
    const appointmentDateTime = getAppointmentDateTime(appointment.date, appointment.startTime);
    const dataHoraAtendimento = format(appointmentDateTime, 'dd/MM/yyyy HH:mm');
    
    // 🔧 NOTIFICAÇÃO DO SISTEMA (Token Fixo - SEMPRE funciona)
    // Avisa o gestor que um novo agendamento foi criado
    await notifyNewAppointment({
        telefoneEmpresa: businessSettings.telefone?.toString() || '',
        nomeCliente: appointment.cliente.name,
        nomeServico: appointment.servico.name,
        dataHoraAtendimento: dataHoraAtendimento,
        telefoneCliente: appointment.cliente.phone?.toString(),
        isFromPanel: isFromPanel, // Diferencia "Gestor" vs "Cliente"
    });

    // 👤 MENSAGENS DO USUÁRIO (Token Dinâmico - SÓ se conectado)
    
    // Lembretes e notificação ao profissional (automações pagas)
    await sendProfessionalNotification(businessSettings, appointment, 'Novo Agendamento', criadoPor);
    
    // ✅ Lembretes 24h e 2h agora são gerenciados via createReminders()
    // Os reminders são criados no Firestore (collection: scheduled_reminders)
    // e processados pelo cron job /api/cron/send-reminders
    // Veja: src/lib/scheduled-reminders.ts e src/app/(dashboard)/agendamentos/page.tsx
}

/**
 * Envia confirmação de agendamento para o CLIENTE
 * Deve ser chamado SEPARADAMENTE após sendCreationHooks
 * Só envia se whatsappConectado === true E notificarClienteAgendamento === true
 */
export async function sendClientConfirmation(
    businessSettings: ConfiguracoesNegocio,
    appointment: Agendamento
): Promise<void> {
    // Verifica se WhatsApp está conectado
    if (!businessSettings.whatsappConectado) {
        logger.debug('❌ WhatsApp não conectado - confirmação para cliente cancelada');
        throw new Error('WhatsApp não conectado. Conecte seu WhatsApp para enviar confirmações.');
    }

    // Verifica se token existe
    if (!businessSettings.tokenInstancia) {
        logger.debug('❌ Token de instância ausente');
        throw new Error('Token de instância não encontrado.');
    }

    // Verifica se o plano tem acesso à feature
    const hasAccess = await checkFeatureAccess(businessSettings, 'notificacao_cliente_agendamento');
    if (!hasAccess) {
        logger.debug('❌ Plano não tem acesso à feature notificacao_cliente_agendamento');
        throw new Error('Seu plano não inclui confirmações automáticas para clientes. Faça upgrade para ativar esta funcionalidade.');
    }

    const appointmentDateTime = getAppointmentDateTime(appointment.date, appointment.startTime);
    const dataHoraAtendimento = format(appointmentDateTime, "dd/MM/yyyy 'às' HH:mm");

    await notifyClientAppointmentConfirmation({
        tokenInstancia: businessSettings.tokenInstancia,
        telefoneCliente: appointment.cliente.phone?.toString() || '',
        nomeCliente: appointment.cliente.name,
        nomeEmpresa: businessSettings.nome,
        nomeServico: appointment.servico.name,
        dataHoraAtendimento: dataHoraAtendimento,
        nomeProfissional: appointment.profissional?.name,
    });
    
    logger.debug('✅ Confirmação enviada para cliente com sucesso');
}

/**
 * Envia APENAS webhooks de lembretes (24h e 2h) sem o webhook de criação
 * Usado quando um agendamento é EDITADO
 */
export async function sendReminderHooksOnly(
    businessSettings: ConfiguracoesNegocio,
    appointment: Agendamento
): Promise<void> {
    const appointmentDateTime = getAppointmentDateTime(appointment.date, appointment.startTime);
    const dataHoraAtendimento = format(appointmentDateTime, 'dd/MM/yyyy HH:mm');

    // ✅ Lembretes 24h e 2h agora são gerenciados via updateReminders()
    // Os reminders são atualizados no Firestore (collection: scheduled_reminders)
    // e processados pelo cron job /api/cron/send-reminders
    // Veja: src/lib/scheduled-reminders.ts e src/app/(dashboard)/agendamentos/page.tsx
    
    logger.debug('✅ Lembretes serão processados pelo sistema de scheduled_reminders');
}

export async function sendCompletionHooks(
    businessSettings: ConfiguracoesNegocio,
    appointment: Agendamento
): Promise<void> {
    // 💬 Solicitar feedback pós-atendimento (Token do Usuário)
    if (businessSettings.whatsappConectado && await checkFeatureAccess(businessSettings, 'feedback_pos_atendimento')) {
        if (businessSettings.habilitarFeedback && businessSettings.feedbackLink && businessSettings.tokenInstancia) {
            await notifyFeedbackRequest({
                tokenInstancia: businessSettings.tokenInstancia,
                telefoneCliente: appointment.cliente.phone,
                nomeCliente: appointment.cliente.name,
                nomeEmpresa: businessSettings.nome,
                nomeServico: appointment.servico.name,
                feedbackPlatform: (businessSettings.feedbackPlatform as 'google' | 'instagram' | 'facebook') || 'google',
                feedbackLink: businessSettings.feedbackLink
            });
        }
    }
}

export async function sendCancellationHooks(
    businessSettings: ConfiguracoesNegocio,
    appointment: Agendamento,
    isFromPanel: boolean = false
): Promise<void> {

    const appointmentDateTime = getAppointmentDateTime(appointment.date, appointment.startTime);
    const dataHoraAtendimento = format(appointmentDateTime, 'dd/MM/yyyy HH:mm');

    // Notificação de cancelamento (para o gestor) - SEMPRE ENVIA (DIRETO, SEM N8N)
    await notifyCancelledAppointment({
        telefoneEmpresa: businessSettings.telefone?.toString() || '',
        nomeCliente: appointment.cliente.name,
        nomeServico: appointment.servico.name,
        dataHoraAtendimento: dataHoraAtendimento,
        isFromPanel: isFromPanel,
    });
    
    // Notificação para o profissional (automação paga)
    await sendProfessionalNotification(businessSettings, appointment, 'Agendamento Cancelado');
}

export async function sendDeletionHooks(
    businessSettings: ConfiguracoesNegocio,
    appointment: Agendamento
): Promise<void> {
    const { notifyDeletedAppointment } = await import('@/lib/notifications');
    
    const appointmentDateTime = getAppointmentDateTime(appointment.date, appointment.startTime);
    const dataHoraAtendimento = format(appointmentDateTime, 'dd/MM/yyyy HH:mm');

    // Notificação de exclusão (para o gestor) - SEMPRE ENVIA (DIRETO, SEM N8N)
    await notifyDeletedAppointment({
        telefoneEmpresa: businessSettings.telefone?.toString() || '',
        nomeCliente: appointment.cliente.name,
        nomeServico: appointment.servico.name,
        dataHoraAtendimento: dataHoraAtendimento,
    });
    
    // Notificação para o profissional (automação paga)
    await sendProfessionalNotification(businessSettings, appointment, 'Agendamento Excluído');
}
