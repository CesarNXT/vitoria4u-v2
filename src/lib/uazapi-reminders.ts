/**
 * 🚀 SISTEMA DE LEMBRETES VIA UAZAPI - V2
 * 
 * ✨ NOVA ABORDAGEM:
 * - Usa /sender/simple da UazAPI para agendar lembretes DIRETO no servidor
 * - Não depende de cron jobs locais
 * - Mais confiável e escalável
 * - Cancelamento automático via /sender/edit
 * 
 * 📅 FLUXO:
 * 1. Quando agendamento é criado → Cria 2 campanhas na UazAPI (24h e 2h antes)
 * 2. Quando agendamento é editado → Cancela campanhas antigas + cria novas
 * 3. Quando agendamento é cancelado → Cancela todas as campanhas
 * 
 * 💾 RASTREAMENTO:
 * - Salva folder_id das campanhas no agendamento (reminderCampaigns)
 * - Permite cancelar precisamente quando necessário
 */

"use server";

import { subHours } from 'date-fns';
import type { Agendamento, ConfiguracoesNegocio } from './types';

const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

/**
 * Interface para campanhas de lembrete
 */
interface ReminderCampaign {
  type: '24h' | '2h';
  folderId: string;
  scheduledFor: Date;
}

/**
 * Combina data e hora do agendamento
 */
function combinaDataHora(date: any, startTime: string): Date {
  const dateObj = date instanceof Date ? date : new Date(date);
  const [hours, minutes] = startTime.split(':').map(Number);
  dateObj.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return dateObj;
}

/**
 * Cria mensagem de lembrete personalizada
 */
function createReminderMessage(
  type: '24h' | '2h',
  clienteNome: string,
  nomeEmpresa: string,
  nomeServico: string,
  dataHoraAtendimento: string
): string {
  const firstName = clienteNome.split(' ')[0];
  
  if (type === '24h') {
    return `⏰ *Olá, ${firstName}!* ⏰

🔔 Lembrete: Você tem um agendamento amanhã!

📅 *Data e Hora*
${dataHoraAtendimento}

🏢 *Local*
${nomeEmpresa}

💼 *Serviço*
${nomeServico}

Por favor, confirme sua presença:`;
  } else {
    return `⏰ *${firstName}, seu horário está chegando!* ⏰

🔔 Seu agendamento é daqui a 2 horas!

📅 *Horário*
${dataHoraAtendimento}

🏢 *Local*
${nomeEmpresa}

💼 *Serviço*
${nomeServico}

Confirme sua presença:`;
  }
}

/**
 * Cria botões de confirmação para o lembrete
 */
function createConfirmationButtons(type: '24h' | '2h') {
  if (type === '24h') {
    // Lembrete 24h: mais opções
    return [
      "✅ Confirmo Presença|confirm",
      "📅 Preciso Remarcar|reschedule",
      "❌ Não Poderei Ir|cancel"
    ];
  } else {
    // Lembrete 2h: mais urgente, menos opções
    return [
      "✅ Estou Indo|confirm",
      "❌ Não Conseguirei|cancel"
    ];
  }
}

/**
 * Formata telefone para WhatsApp: 5511999999999@s.whatsapp.net
 */
function formatWhatsAppNumber(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  return `${fullPhone}@s.whatsapp.net`;
}

/**
 * 📤 CRIAR CAMPANHA DE LEMBRETE NA UAZAPI
 * Usa /sender/advanced para agendar mensagem interativa com botões
 */
async function createReminderCampaign(
  tokenInstancia: string,
  type: '24h' | '2h',
  scheduledFor: Date,
  clienteTelefone: string,
  mensagem: string,
  agendamentoId: string
): Promise<string | null> {
  try {
    const whatsappNumber = formatWhatsAppNumber(clienteTelefone);
    const scheduledTimestamp = scheduledFor.getTime(); // Timestamp em milissegundos
    const buttons = createConfirmationButtons(type);

    // Mensagem individual com botões interativos
    const messagePayload = {
      number: clienteTelefone,
      type: 'button',
      text: mensagem,
      choices: buttons,
      footerText: 'Aguardamos sua confirmação',
      track_source: 'reminder_system',
      track_id: `reminder_${type}_${agendamentoId}`,
    };

    // Payload da campanha (sender/advanced)
    const payload = {
      delayMin: 1,
      delayMax: 3,
      scheduled_for: scheduledTimestamp,
      info: `Lembrete ${type} - Agendamento ${agendamentoId}`,
      messages: [messagePayload]
    };

    // console.warn(`📤 Criando campanha ${type} com botões interativos:`, {
    //   scheduledFor: scheduledFor.toISOString(),
    //   scheduledTimestamp,
    //   phone: whatsappNumber,
    //   buttons: buttons.length
    // });

    const response = await fetch(`${API_BASE}/sender/advanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': tokenInstancia,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro ao criar campanha ${type}:`, response.status, errorText);
      return null;
    }

    const result = await response.json();
    
    // A UazAPI pode retornar o folder_id de diferentes formas
    const folderId = result.folder_id || result.folderId || result.id;
    
    if (!folderId) {
      console.error(`❌ folder_id não retornado pela API para ${type}:`, result);
      return null;
    }

    // Campanha criada
    return folderId;

  } catch (error: any) {
    console.error(`Erro ao criar lembretes para ${agendamentoId}:`, error.message);
    return null;
  }
}

/**
 * 🚀 CRIAR LEMBRETES PARA UM AGENDAMENTO
 * 
 * Cria 2 campanhas agendadas na UazAPI:
 * - 1 lembrete 24h antes
 * - 1 lembrete 2h antes
 * 
 * Retorna os folder_ids para controle futuro
 */
export async function createReminders(
  businessId: string,
  agendamentoId: string,
  agendamento: Agendamento,
  business: ConfiguracoesNegocio
): Promise<ReminderCampaign[]> {
  
  // Iniciando criação de lembretes

  // Validações
  if (!business.tokenInstancia) {
    console.error('❌ Token de instância não encontrado');
    return [];
  }

  if (!business.whatsappConectado) {
    console.error('❌ WhatsApp não está conectado');
    return [];
  }

  if (!agendamento.cliente?.phone) {
    console.error('❌ Cliente sem telefone cadastrado');
    return [];
  }

  try {
    const dataAgendamento = combinaDataHora(agendamento.date, agendamento.startTime);
    const now = new Date();
    
    // Calcular horários de envio
    const envio24h = subHours(dataAgendamento, 24);
    const envio2h = subHours(dataAgendamento, 2);

    const campaigns: ReminderCampaign[] = [];

    // Formatar data para mensagens
    const dataHoraFormatada = dataAgendamento.toLocaleString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 1️⃣ LEMBRETE 24H (se ainda não passou)
    if (envio24h > now && business.habilitarLembrete24h !== false) {
      const mensagem24h = createReminderMessage(
        '24h',
        agendamento.cliente.name,
        business.nome,
        agendamento.servico.name,
        dataHoraFormatada
      );

      const folderId24h = await createReminderCampaign(
        business.tokenInstancia,
        '24h',
        envio24h,
        agendamento.cliente.phone.toString(),
        mensagem24h,
        agendamentoId
      );

      if (folderId24h) {
        campaigns.push({
          type: '24h',
          folderId: folderId24h,
          scheduledFor: envio24h
        });
      }
    }

    // 2️⃣ LEMBRETE 2H (se ainda não passou)
    if (envio2h > now && business.habilitarLembrete2h !== false) {
      const mensagem2h = createReminderMessage(
        '2h',
        agendamento.cliente.name,
        business.nome,
        agendamento.servico.name,
        dataHoraFormatada
      );

      const folderId2h = await createReminderCampaign(
        business.tokenInstancia,
        '2h',
        envio2h,
        agendamento.cliente.phone.toString(),
        mensagem2h,
        agendamentoId
      );

      if (folderId2h) {
        campaigns.push({
          type: '2h',
          folderId: folderId2h,
          scheduledFor: envio2h
        });
      }
    }

    // Lembretes criados
    return campaigns;

  } catch (error: any) {
    console.error('Erro ao criar lembretes:', error.message);
    return [];
  }
}

/**
 * ❌ CANCELAR CAMPANHA NA UAZAPI
 */
async function cancelCampaign(
  tokenInstancia: string,
  folderId: string,
  type: '24h' | '2h'
): Promise<boolean> {
  try {
    // Cancelando campanha

    const response = await fetch(`${API_BASE}/sender/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': tokenInstancia,
      },
      body: JSON.stringify({
        folder_id: folderId,
        action: 'delete'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro ao cancelar campanha ${type}:`, response.status, errorText);
      return false;
    }

    // Campanha cancelada
    return true;

  } catch (error: any) {
    console.error(`❌ Erro ao cancelar campanha ${type}:`, error.message);
    return false;
  }
}

/**
 * 🔄 ATUALIZAR LEMBRETES (quando agendamento é editado)
 * 
 * 1. Cancela campanhas antigas
 * 2. Cria novas campanhas com nova data/hora
 */
export async function updateReminders(
  businessId: string,
  agendamentoId: string,
  agendamento: Agendamento,
  business: ConfiguracoesNegocio,
  oldCampaigns?: ReminderCampaign[]
): Promise<ReminderCampaign[]> {
  
  // Atualizando lembretes

  // 1. Cancelar campanhas antigas (se existirem)
  if (oldCampaigns && oldCampaigns.length > 0 && business.tokenInstancia) {
    for (const campaign of oldCampaigns) {
      await cancelCampaign(business.tokenInstancia, campaign.folderId, campaign.type);
    }
  }

  // 2. Criar novas campanhas
  const newCampaigns = await createReminders(businessId, agendamentoId, agendamento, business);
  
  return newCampaigns;
}

/**
 * 🗑️ DELETAR LEMBRETES (quando agendamento é cancelado)
 */
export async function deleteReminders(
  tokenInstancia: string,
  campaigns?: ReminderCampaign[]
): Promise<void> {
  
  if (!campaigns || campaigns.length === 0) {
    // Nenhuma campanha para cancelar
    return;
  }

  // Cancelando campanhas de lembrete

  for (const campaign of campaigns) {
    await cancelCampaign(tokenInstancia, campaign.folderId, campaign.type);
  }

  // Todas as campanhas foram canceladas
}

/**
 * 📋 LISTAR CAMPANHAS DE LEMBRETE ATIVAS
 * 
 * Útil para debug e monitoramento
 */
export async function listReminderCampaigns(
  tokenInstancia: string
): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE}/sender/listfolders?status=scheduled`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'token': tokenInstancia,
      },
    });

    if (!response.ok) {
      console.error('❌ Erro ao listar campanhas:', response.status);
      return [];
    }

    const result = await response.json();
    return result.folders || result.data || [];

  } catch (error: any) {
    console.error('❌ Erro ao listar campanhas:', error.message);
    return [];
  }
}
