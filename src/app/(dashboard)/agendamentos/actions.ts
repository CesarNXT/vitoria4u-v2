"use server";

import type { Agendamento, ConfiguracoesNegocio } from "@/lib/types";
import { add, format, parse, isDate } from 'date-fns';

const N8N_BASE_URL = "https://n8n.vitoria4u.site/webhook/";

const WEBHOOK_URLS = {
    lembrete24h: `${N8N_BASE_URL}28f9ba3d-7330-403e-a0dd-c98e2966602b`,
    lembrete2h: `${N8N_BASE_URL}99790d07-a69b-4fa3-9e91-4120d024222d`,
    novoAgendamento: `${N8N_BASE_URL}b05b9505-7564-44cc-94d1-7fc59c9e7b24`,
    solicitacaoFeedback: `${N8N_BASE_URL}7fa69444-a19a-4a08-8936-5e828e6c12c7`,
    agendamentoCancelado: `${N8N_BASE_URL}29baa24f-e9cf-4472-8ac6-11a6d16d11d5`,
    notificacaoProfissionalNovo: `${N8N_BASE_URL}1e24d894-12bd-4fac-86bf-4e59c658ae16`,
    notificacaoProfissionalCancelado: `${N8N_BASE_URL}fc9ff356-9ad3-4dd0-9fa2-b7175c9de037`,
};

async function callWebhook(url: string, payload: any) {
    console.log(`→ Enviando webhook: url=${url}, payload=${JSON.stringify(payload)}`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        const text = await response.text();
        console.log(`Webhook response status=${response.status}, body=${text}`);
        if (!response.ok) {
            throw new Error(`Webhook call to ${url} failed with status ${response.status}: ${text}`);
        }
    } catch (error) {
        console.error(`Error calling webhook ${url}:`, error);
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

async function sendProfessionalNotification(
    businessSettings: ConfiguracoesNegocio,
    appointment: Agendamento,
    status: 'Novo Agendamento' | 'Agendamento Cancelado'
) {
    if (!businessSettings.whatsappConectado || !appointment.profissional.phone || businessSettings.planId === 'plano_gratis') {
        return;
    }

    if (appointment.profissional.phone === businessSettings.telefone) {
        return;
    }

    const appointmentDateTime = getAppointmentDateTime(appointment.date, appointment.startTime);
    const dataHoraAtendimento = format(appointmentDateTime, 'dd/MM/yyyy HH:mm');

    const payload = {
        tokenInstancia: businessSettings.tokenInstancia,
        instancia: businessSettings.id,
        telefoneProfissional: appointment.profissional.phone,
        nomeCliente: appointment.cliente.name,
        nomeServico: appointment.servico.name,
        dataHoraAtendimento: dataHoraAtendimento,
        statusAgendamento: status,
    };
    
    const webhookUrl = status === 'Novo Agendamento'
        ? WEBHOOK_URLS.notificacaoProfissionalNovo
        : WEBHOOK_URLS.notificacaoProfissionalCancelado;

    await callWebhook(webhookUrl, payload);
}

export async function sendCreationHooks(
    businessSettings: ConfiguracoesNegocio,
    appointment: Agendamento
): Promise<void> {
    
    const appointmentDateTime = getAppointmentDateTime(appointment.date, appointment.startTime);
    const dataHoraAtendimento = format(appointmentDateTime, 'dd/MM/yyyy HH:mm');
    
    await callWebhook(WEBHOOK_URLS.novoAgendamento, {
        telefoneEmpresa: businessSettings.telefone,
        nomeCliente: appointment.cliente.name,
        nomeServico: appointment.servico.name,
        dataHoraAtendimento: dataHoraAtendimento,
    });
    
    if (businessSettings.whatsappConectado && businessSettings.planId !== 'plano_gratis') {
        await sendProfessionalNotification(businessSettings, appointment, 'Novo Agendamento');
        
        const reminderPayload = {
            tokenInstancia: businessSettings.tokenInstancia,
            nomeCliente: appointment.cliente.name,
            nomeServico: appointment.servico.name,
            instancia: businessSettings.id,
            telefoneCliente: appointment.cliente.phone,
            idCliente: appointment.cliente.id,
            startTime: appointment.startTime,
            idAgendamento: appointment.id,
            dataHoraAtendimento: dataHoraAtendimento,
            horarioEnvio: format(appointmentDateTime, "yyyy-MM-dd HH:mm:ss")
        };

        if (businessSettings.habilitarLembrete24h) {
            if (appointmentDateTime > add(new Date(), { hours: 21 })) {
                 await callWebhook(WEBHOOK_URLS.lembrete24h, reminderPayload);
            }
        }
        
        if (businessSettings.habilitarLembrete2h) {
            if (appointmentDateTime > add(new Date(), { hours: 1 })) {
                await callWebhook(WEBHOOK_URLS.lembrete2h, reminderPayload);
            }
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
    if (businessSettings.whatsappConectado && businessSettings.planId !== 'plano_gratis') {
        const appointmentDateTime = getAppointmentDateTime(appointment.date, appointment.startTime);
        const dataHoraAtendimento = format(appointmentDateTime, 'dd/MM/yyyy HH:mm');
        
        const reminderPayload = {
            tokenInstancia: businessSettings.tokenInstancia,
            nomeCliente: appointment.cliente.name,
            nomeServico: appointment.servico.name,
            instancia: businessSettings.id,
            telefoneCliente: appointment.cliente.phone,
            idCliente: appointment.cliente.id,
            startTime: appointment.startTime,
            idAgendamento: appointment.id,
            dataHoraAtendimento: dataHoraAtendimento,
            horarioEnvio: format(appointmentDateTime, "yyyy-MM-dd HH:mm:ss")
        };

        if (businessSettings.habilitarLembrete24h) {
            if (appointmentDateTime > add(new Date(), { hours: 21 })) {
                console.log('📅 Enviando lembrete 24h (agendamento editado)...');
                await callWebhook(WEBHOOK_URLS.lembrete24h, reminderPayload);
            } else {
                console.log('⏰ Lembrete 24h não enviado - agendamento em menos de 21 horas');
            }
        }
        
        if (businessSettings.habilitarLembrete2h) {
            if (appointmentDateTime > add(new Date(), { hours: 1 })) {
                console.log('📅 Enviando lembrete 2h (agendamento editado)...');
                await callWebhook(WEBHOOK_URLS.lembrete2h, reminderPayload);
            } else {
                console.log('⏰ Lembrete 2h não enviado - agendamento em menos de 1 hora');
            }
        }
    }
}

export async function sendCompletionHooks(
    businessSettings: ConfiguracoesNegocio,
    appointment: Agendamento
): Promise<void> {

    if (businessSettings.whatsappConectado && businessSettings.planId !== 'plano_gratis') {
        if (businessSettings.habilitarFeedback && businessSettings.feedbackLink) {
            await callWebhook(WEBHOOK_URLS.solicitacaoFeedback, {
                tokenInstancia: businessSettings.tokenInstancia,
                nomeCliente: appointment.cliente.name,
                nomeServico: appointment.servico.name,
                instancia: businessSettings.id,
                telefoneCliente: appointment.cliente.phone,
                idCliente: appointment.cliente.id,
                feedbackPlatform: businessSettings.feedbackPlatform || 'google', 
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

    await callWebhook(WEBHOOK_URLS.agendamentoCancelado, {
        telefoneEmpresa: businessSettings.telefone,
        nomeCliente: appointment.cliente.name,
        nomeServico: appointment.servico.name,
        dataHoraAtendimento: dataHoraAtendimento,
    });
    
    if (businessSettings.whatsappConectado && businessSettings.planId !== 'plano_gratis') {
        await sendProfessionalNotification(businessSettings, appointment, 'Agendamento Cancelado');
    }
}
