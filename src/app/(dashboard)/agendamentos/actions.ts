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
    notifyFeedbackRequest
} from "@/lib/notifications";

const N8N_BASE_URL = "https://n8n.vitoria4u.site/webhook/";

const WEBHOOK_URLS = {
    lembrete24h: `${N8N_BASE_URL}28f9ba3d-7330-403e-a0dd-c98e2966602b`,
    lembrete2h: `${N8N_BASE_URL}99790d07-a69b-4fa3-9e91-4120d024222d`,
    // ✅ Feedback e notificações profissional agora usam código nativo
};

async function callWebhook(url: string, payload: any) {
    // 🔒 Sanitiza dados antes de logar
    logger.debug('→ Enviando webhook', sanitizeForLog({ url, payload }));
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        const text = await response.text();
        logger.debug('✅ Webhook response', { status: response.status });
        if (!response.ok) {
            throw new Error(`Webhook call to ${url} failed with status ${response.status}: ${text}`);
        }
    } catch (error) {
        logger.error(`Error calling webhook`, sanitizeForLog(error));
    }
}

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
    status: 'Novo Agendamento' | 'Agendamento Cancelado'
) {
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
    appointment: Agendamento
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
    });

    // 👤 MENSAGENS DO USUÁRIO (Token Dinâmico - SÓ se conectado)
    
    // Lembretes e notificação ao profissional (automações pagas)
    await sendProfessionalNotification(businessSettings, appointment, 'Novo Agendamento');
    
    // ⏰ Lembrete 24h - envia 24 horas ANTES do agendamento
    // ⚠️ Usa token do USUÁRIO - verifica se está conectado
    if (businessSettings.whatsappConectado && await checkFeatureAccess(businessSettings, 'lembrete_24h')) {
        if (appointmentDateTime > add(new Date(), { hours: 21 })) {
            const horarioEnvio24h = add(appointmentDateTime, { hours: -24 });
            const reminderPayload24h = {
                tokenInstancia: businessSettings.tokenInstancia,
                nomeEmpresa: businessSettings.nome,
                nomeCliente: appointment.cliente.name,
                nomeServico: appointment.servico.name,
                instancia: businessSettings.id,
                telefoneCliente: appointment.cliente.phone,
                idCliente: appointment.cliente.id,
                startTime: appointment.startTime,
                idAgendamento: appointment.id,
                dataHoraAtendimento: dataHoraAtendimento,
                horarioEnvio: format(horarioEnvio24h, "yyyy-MM-dd HH:mm:ss")
            };
            await callWebhook(WEBHOOK_URLS.lembrete24h, reminderPayload24h);
        }
    }
    
    // Lembrete 2h - envia 2 horas ANTES do agendamento
    if (businessSettings.whatsappConectado && await checkFeatureAccess(businessSettings, 'lembrete_2h')) {
        if (appointmentDateTime > add(new Date(), { hours: 1 })) {
            const horarioEnvio2h = add(appointmentDateTime, { hours: -2 });
            const reminderPayload2h = {
                tokenInstancia: businessSettings.tokenInstancia,
                nomeEmpresa: businessSettings.nome,
                nomeCliente: appointment.cliente.name,
                nomeServico: appointment.servico.name,
                instancia: businessSettings.id,
                telefoneCliente: appointment.cliente.phone,
                idCliente: appointment.cliente.id,
                startTime: appointment.startTime,
                idAgendamento: appointment.id,
                dataHoraAtendimento: dataHoraAtendimento,
                horarioEnvio: format(horarioEnvio2h, "yyyy-MM-dd HH:mm:ss")
            };
            await callWebhook(WEBHOOK_URLS.lembrete2h, reminderPayload2h);
        }
    }
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

    // Lembrete 24h - envia 24 horas ANTES do agendamento
    if (businessSettings.whatsappConectado && await checkFeatureAccess(businessSettings, 'lembrete_24h')) {
        if (appointmentDateTime > add(new Date(), { hours: 21 })) {
            const horarioEnvio24h = add(appointmentDateTime, { hours: -24 });
            const reminderPayload24h = {
                tokenInstancia: businessSettings.tokenInstancia,
                nomeEmpresa: businessSettings.nome,
                nomeCliente: appointment.cliente.name,
                nomeServico: appointment.servico.name,
                instancia: businessSettings.id,
                telefoneCliente: appointment.cliente.phone,
                idCliente: appointment.cliente.id,
                startTime: appointment.startTime,
                idAgendamento: appointment.id,
                dataHoraAtendimento: dataHoraAtendimento,
                horarioEnvio: format(horarioEnvio24h, "yyyy-MM-dd HH:mm:ss")
            };
            logger.debug('📅 Enviando lembrete 24h (agendamento editado)');
            await callWebhook(WEBHOOK_URLS.lembrete24h, reminderPayload24h);
        } else {
            logger.debug('⏭️ Lembrete 24h não enviado - agendamento em menos de 21 horas');
        }
    }
    
    // Lembrete 2h - envia 2 horas ANTES do agendamento
    if (businessSettings.whatsappConectado && await checkFeatureAccess(businessSettings, 'lembrete_2h')) {
        if (appointmentDateTime > add(new Date(), { hours: 1 })) {
            const horarioEnvio2h = add(appointmentDateTime, { hours: -2 });
            const reminderPayload2h = {
                tokenInstancia: businessSettings.tokenInstancia,
                nomeEmpresa: businessSettings.nome,
                nomeCliente: appointment.cliente.name,
                nomeServico: appointment.servico.name,
                instancia: businessSettings.id,
                telefoneCliente: appointment.cliente.phone,
                idCliente: appointment.cliente.id,
                startTime: appointment.startTime,
                idAgendamento: appointment.id,
                dataHoraAtendimento: dataHoraAtendimento,
                horarioEnvio: format(horarioEnvio2h, "yyyy-MM-dd HH:mm:ss")
            };
            logger.debug('⏰ Enviando lembrete 2h (agendamento editado)');
            await callWebhook(WEBHOOK_URLS.lembrete2h, reminderPayload2h);
        } else {
            logger.debug('⏭️ Lembrete 2h não enviado - agendamento em menos de 1 hora');
        }
    }
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
                nomeServico: appointment.servico.name,
                feedbackPlatform: (businessSettings.feedbackPlatform as 'google' | 'instagram' | 'facebook') || 'google',
                feedbackLink: businessSettings.feedbackLink
            });
        }
    }
}

export async function sendCancellationHooks(
    businessSettings: ConfiguracoesNegocio,
    appointment: Agendamento
): Promise<void> {

    const appointmentDateTime = getAppointmentDateTime(appointment.date, appointment.startTime);
    const dataHoraAtendimento = format(appointmentDateTime, 'dd/MM/yyyy HH:mm');

    // Notificação de cancelamento (para o gestor) - SEMPRE ENVIA (DIRETO, SEM N8N)
    await notifyCancelledAppointment({
        telefoneEmpresa: businessSettings.telefone?.toString() || '',
        nomeCliente: appointment.cliente.name,
        nomeServico: appointment.servico.name,
        dataHoraAtendimento: dataHoraAtendimento,
    });
    
    // Notificação para o profissional (automação paga)
    await sendProfessionalNotification(businessSettings, appointment, 'Agendamento Cancelado');
}
