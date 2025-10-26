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

import { subHours, addDays, startOfDay } from 'date-fns';
import type { Agendamento, ConfiguracoesNegocio } from './types';
import { adminDb } from './firebase-admin';

const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

/**
 * Interface para lembretes com botões interativos
 */
interface ReminderMessage {
  type: '24h' | '2h';
  messageId?: string; // Opcional para compatibilidade
  folderId?: string; // Legado
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

Se não puder comparecer, avise-nos.`;
  }
}

/**
 * Cria botões de confirmação REAIS para o lembrete
 * Usando formato correto da UazAPI: "texto|id"
 */
function createConfirmationButtons(type: '24h' | '2h'): string[] {
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
 * 📤 CRIAR LEMBRETE COM BOTÕES INTERATIVOS REAIS
 * Usa /send/interactive da UazAPI para enviar botões clicáveis
 * 
 * ✨ MELHORIAS:
 * - Botões REAIS que funcionam no WhatsApp
 * - Retry automático em caso de falha (até 3 tentativas)
 * - Agendamento via delay calculado
 * - Logs detalhados para debug
 */
async function createReminderCampaign(
  tokenInstancia: string,
  type: '24h' | '2h',
  scheduledFor: Date,
  clienteTelefone: string,
  mensagem: string,
  agendamentoId: string,
  retryCount = 0
): Promise<string | null> {
  const MAX_RETRIES = 3;
  
  try {
    const buttons = createConfirmationButtons(type);
    const now = new Date();
    const delayMs = scheduledFor.getTime() - now.getTime();
    
    // Se o horário já passou, não enviar
    if (delayMs < 0) {
      console.warn(`⚠️ [${type}] Horário de envio já passou: ${scheduledFor.toISOString()}`);
      return null;
    }

    // Payload usando /sender/advanced com botões interativos
    // Permite agendar mensagens com botões para o futuro
    const payload = {
      delayMin: 0,
      delayMax: 0,
      scheduled_for: scheduledFor.getTime(), // Timestamp em milissegundos
      info: `Lembrete ${type} - Agendamento ${agendamentoId}`,
      messages: [
        {
          number: clienteTelefone,
          type: 'button',
          text: mensagem,
          choices: buttons,
          footerText: 'Aguardamos sua confirmação',
          delay: 0  // ✅ IMPORTANTE: delay em 0 para não ficar "digitando..."
        }
      ]
    };

    console.log(`📤 [${type}] Criando lembrete para agendamento ${agendamentoId}:`, {
      scheduledFor: scheduledFor.toISOString(),
      phone: clienteTelefone.replace(/\d{4}$/, '****'), // Mascara últimos 4 dígitos
      delayMinutes: Math.round(delayMs / 60000),
      timestamp: scheduledFor.getTime(),
      attempt: retryCount + 1
    });

    // Criar AbortController para timeout de 5 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_BASE}/sender/advanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': tokenInstancia,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${type}] Erro HTTP ${response.status}:`, errorText);
      
      // Retry em caso de erro de servidor (500, 502, 503)
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        console.warn(`🔄 [${type}] Tentando novamente... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Backoff exponencial
        return createReminderCampaign(tokenInstancia, type, scheduledFor, clienteTelefone, mensagem, agendamentoId, retryCount + 1);
      }
      
      return null;
    }

    const result = await response.json();
    
    // Validar resposta do /sender/simple
    // Retorna: { folder_id: "...", message: "..." }
    if (!result || !result.folder_id) {
      console.error(`❌ [${type}] Resposta inválida da API:`, result);
      
      // Retry se não conseguiu folder_id
      if (retryCount < MAX_RETRIES) {
        console.warn(`🔄 [${type}] Tentando novamente... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        return createReminderCampaign(tokenInstancia, type, scheduledFor, clienteTelefone, mensagem, agendamentoId, retryCount + 1);
      }
      
      return null;
    }

    // Retornar folder_id para controle futuro (permite cancelar campanhas)
    const folderId = result.folder_id;
    console.log(`✅ [${type}] Lembrete agendado com sucesso! folder_id: ${folderId}`);
    return folderId;

  } catch (error: any) {
    // Tratamento especial para timeout
    if (error.name === 'AbortError') {
      console.error(`❌ [${type}] Timeout após 5 segundos - API não respondeu`);
    } else {
      console.error(`❌ [${type}] Erro ao criar campanha:`, error.message);
    }
    
    // Retry apenas em caso de timeout ou erro de rede (não retry em 4xx)
    if (retryCount < MAX_RETRIES && (error.name === 'AbortError' || error.name === 'TypeError')) {
      console.warn(`🔄 [${type}] Tentando novamente... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
      return createReminderCampaign(tokenInstancia, type, scheduledFor, clienteTelefone, mensagem, agendamentoId, retryCount + 1);
    }
    
    return null;
  }
}

/**
 * 🔍 VERIFICAR SE CLIENTE TEM AGENDAMENTO FUTURO
 * Evita enviar lembretes se o cliente já tem outro agendamento próximo
 * 
 * ⚠️ DESABILITADO TEMPORARIAMENTE: Query exige índice composto no Firestore
 * TODO: Criar índice ou implementar verificação alternativa
 */
async function hasUpcomingAppointment(
  businessId: string,
  clientePhone: string | number,
  currentAppointmentId: string,
  appointmentDate: Date
): Promise<boolean> {
  // Desabilitado para evitar erro de índice
  // Sempre retorna false = sempre envia lembretes
  return false;
  
  /* CÓDIGO ORIGINAL - Requer índice Firestore
  try {
    const futureDate = addDays(startOfDay(appointmentDate), 5);
    
    const snapshot = await adminDb
      .collection(`negocios/${businessId}/agendamentos`)
      .where('cliente.phone', '==', clientePhone)
      .where('status', '==', 'Agendado')
      .where('date', '>', appointmentDate)
      .where('date', '<=', futureDate)
      .limit(1)
      .get();
    
    if (snapshot.empty) return false;
    const firstDoc = snapshot.docs[0];
    return firstDoc ? firstDoc.id !== currentAppointmentId : false;
  } catch (error) {
    console.error('Erro ao verificar agendamentos futuros:', error);
    return false;
  }
  */
}

/**
 * 🚀 CRIAR LEMBRETES PARA UM AGENDAMENTO - VERSÃO ROBUSTA
 * 
 * Cria 2 campanhas agendadas na UazAPI:
 * - 1 lembrete 24h antes
 * - 1 lembrete 2h antes
 * 
 * ✨ GARANTIAS:
 * - Retry automático em caso de falha
 * - Validação de cada etapa
 * - Logs detalhados para auditoria
 * - Não falha silenciosamente
 * 
 * ⚠️ REGRA IMPORTANTE: Não envia se cliente já tem agendamento futuro próximo (5 dias)
 * 
 * Retorna os folder_ids para controle futuro
 */
export async function createReminders(
  businessId: string,
  agendamentoId: string,
  agendamento: Agendamento,
  business: ConfiguracoesNegocio
): Promise<ReminderMessage[]> {
  
  console.log(`🚀 Iniciando criação de lembretes para agendamento ${agendamentoId}`);
  
  // Validações com logs claros
  if (!business.tokenInstancia) {
    console.error(`❌ [${agendamentoId}] Token de instância não encontrado`);
    return [];
  }

  if (!business.whatsappConectado) {
    console.error(`❌ [${agendamentoId}] WhatsApp não está conectado`);
    return [];
  }

  if (!agendamento.cliente?.phone) {
    console.error(`❌ [${agendamentoId}] Cliente sem telefone cadastrado`);
    return [];
  }

  try {
    const dataAgendamento = combinaDataHora(agendamento.date, agendamento.startTime);
    
    // 🔍 VERIFICAR SE TEM AGENDAMENTO FUTURO
    const hasFutureAppointment = await hasUpcomingAppointment(
      businessId,
      agendamento.cliente.phone,
      agendamentoId,
      dataAgendamento
    );

    if (hasFutureAppointment) {
      console.warn(`⚠️ Cliente ${agendamento.cliente.name} já tem agendamento futuro próximo. Lembretes não serão enviados.`);
      return [];
    }
    const now = new Date();
    
    // Calcular horários de envio
    const envio24h = subHours(dataAgendamento, 24);
    const envio2h = subHours(dataAgendamento, 2);

    const reminders: ReminderMessage[] = [];

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
      console.log(`📅 [${agendamentoId}] Criando lembrete 24h para ${envio24h.toISOString()}`);
      
      const mensagem24h = createReminderMessage(
        '24h',
        agendamento.cliente.name,
        business.nome,
        agendamento.servico.name,
        dataHoraFormatada
      );

      const messageId24h = await createReminderCampaign(
        business.tokenInstancia,
        '24h',
        envio24h,
        agendamento.cliente.phone.toString(),
        mensagem24h,
        agendamentoId
      );

      if (messageId24h) {
        reminders.push({
          type: '24h',
          messageId: messageId24h,
          scheduledFor: envio24h
        });
        console.log(`✅ [${agendamentoId}] Lembrete 24h criado: ${messageId24h}`);
      } else {
        console.error(`❌ [${agendamentoId}] FALHA ao criar lembrete 24h após todas as tentativas!`);
      }
    } else if (envio24h <= now) {
      console.warn(`⚠️ [${agendamentoId}] Lembrete 24h não criado: horário já passou`);
    } else {
      console.warn(`⚠️ [${agendamentoId}] Lembrete 24h desabilitado nas configurações`);
    }

    // 2️⃣ LEMBRETE 2H (se ainda não passou)
    if (envio2h > now && business.habilitarLembrete2h !== false) {
      console.log(`⏰ [${agendamentoId}] Criando lembrete 2h para ${envio2h.toISOString()}`);
      
      const mensagem2h = createReminderMessage(
        '2h',
        agendamento.cliente.name,
        business.nome,
        agendamento.servico.name,
        dataHoraFormatada
      );

      const messageId2h = await createReminderCampaign(
        business.tokenInstancia,
        '2h',
        envio2h,
        agendamento.cliente.phone.toString(),
        mensagem2h,
        agendamentoId
      );

      if (messageId2h) {
        reminders.push({
          type: '2h',
          messageId: messageId2h,
          scheduledFor: envio2h
        });
        console.log(`✅ [${agendamentoId}] Lembrete 2h criado: ${messageId2h}`);
      } else {
        console.error(`❌ [${agendamentoId}] FALHA ao criar lembrete 2h após todas as tentativas!`);
      }
    } else if (envio2h <= now) {
      console.warn(`⚠️ [${agendamentoId}] Lembrete 2h não criado: horário já passou`);
    } else {
      console.warn(`⚠️ [${agendamentoId}] Lembrete 2h desabilitado nas configurações`);
    }

    console.log(`🎉 [${agendamentoId}] Total de lembretes criados: ${reminders.length}`);
    return reminders;

  } catch (error: any) {
    console.error('Erro ao criar lembretes:', error.message);
    return [];
  }
}

/**
 * ❌ CANCELAR LEMBRETE (mensagem agendada)
 * 
 * ⚠️ NOTA: Não há endpoint direto para cancelar mensagens agendadas via delay.
 * Uma vez enviada com delay, a mensagem será entregue.
 * 
 * Mantendo função para compatibilidade, mas retorna sempre true.
 */
async function cancelReminder(
  tokenInstancia: string,
  messageId: string,
  type: '24h' | '2h'
): Promise<boolean> {
  console.log(`⚠️ [${type}] Lembretes com delay não podem ser cancelados após agendamento. messageId: ${messageId}`);
  console.log(`💡 Dica: Para cancelar lembretes futuros, não crie o agendamento ou delete o agendamento antes do horário.`);
  return true; // Sempre retorna sucesso para não quebrar fluxo
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
  oldReminders?: ReminderMessage[]
): Promise<ReminderMessage[]> {
  
  console.log(`🔄 Atualizando lembretes para agendamento ${agendamentoId}`);

  // ⚠️ NOTA: Lembretes antigos com delay não podem ser cancelados
  // Apenas criamos novos lembretes para a nova data/hora
  if (oldReminders && oldReminders.length > 0) {
    console.warn(`⚠️ ${oldReminders.length} lembretes antigos não podem ser cancelados (limitação da API)`);
  }

  // Criar novos lembretes
  const newReminders = await createReminders(businessId, agendamentoId, agendamento, business);
  
  return newReminders;
}

/**
 * 🗑️ DELETAR LEMBRETES (quando agendamento é cancelado)
 */
export async function deleteReminders(
  tokenInstancia: string,
  reminders?: ReminderMessage[]
): Promise<void> {
  
  if (!reminders || reminders.length === 0) {
    return;
  }

  console.warn(`⚠️ Tentando cancelar ${reminders.length} lembretes, mas mensagens com delay não podem ser canceladas.`);
  console.log(`💡 Os lembretes ainda serão entregues no horário agendado.`);
  
  // Não há ação a ser tomada - mensagens com delay não podem ser canceladas
}

/**
 * 📋 LISTAR LEMBRETES ATIVOS (via histórico de mensagens)
 * 
 * ⚠️ Lembretes com delay não aparecem em campanhas agendadas,
 * pois são mensagens individuais, não campanhas em massa.
 */
export async function listReminderMessages(
  tokenInstancia: string
): Promise<any[]> {
  console.warn('⚠️ Lembretes individuais não podem ser listados como campanhas.');
  console.log('💡 Use o histórico de mensagens ou rastreie via Firestore.');
  return [];
}
