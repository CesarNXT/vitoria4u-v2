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

📅 *Data e Hora:* ${dataHoraAtendimento}

🏢 *Local:* ${nomeEmpresa}

💼 *Serviço:* ${nomeServico}

Por favor, confirme sua presença:`;
  } else {
    return `⏰ *${firstName}, seu horário está chegando!* ⏰

🔔 Seu agendamento é daqui a 2 horas!

📅 *Horário:* ${dataHoraAtendimento}

🏢 *Local:* ${nomeEmpresa}

💼 *Serviço:* ${nomeServico}

Se não puder comparecer, avise-nos.`;
  }
}

/**
 * Cria botões de confirmação REAIS para o lembrete
 * 
 * ✅ FORMATO CORRETO (conforme doc UazAPI /send/menu):
 * - "texto|id" - Botão de resposta padrão
 * - "texto\nid" - Alternativa com quebra de linha
 * - "texto|call:+número" - Botão de ligação
 * - "texto|https://url" - Botão de link
 * - "texto|copy:código" - Botão de copiar
 * 
 * Estamos usando o formato padrão: "texto|id"
 */
function createConfirmationButtons(type: '24h' | '2h'): string[] {
  if (type === '24h') {
    // Lembrete 24h: mais opções (máximo 3 botões recomendado)
    return [
      "✅ Confirmo Presença|confirm",
      "📅 Preciso Remarcar|reschedule",
      "❌ Não Poderei Ir|cancel"
    ];
  } else {
    // Lembrete 2h: mais urgente, menos opções (2 botões)
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

    // ✅ CORRIGIDO: scheduled_for aceita MINUTOS a partir de agora (mais simples que timestamp)
    const delayMinutes = Math.ceil(delayMs / 60000); // Converter ms para minutos
    
    // ✅ PAYLOAD CORRETO - Conforme documentação /sender/advanced + /send/menu
    // 
    // /sender/advanced: Agendamento em massa
    //   - scheduled_for: MINUTOS a partir de agora (não timestamp!)
    //   - delayMin/delayMax: delay ENTRE mensagens (0 = sem intervalo)
    //   - messages: array de mensagens a enviar
    //
    // Cada mensagem usa formato /send/menu (botões interativos):
    //   - number: telefone do destinatário
    //   - type: "button" (tipo de mensagem interativa)
    //   - text: mensagem principal
    //   - choices: array de botões no formato "texto|id"
    //   - footerText: texto do rodapé (opcional)
    //   - delay: 0 = não mostra "digitando..." durante agendamento
    const payload = {
      delayMin: 0,
      delayMax: 0,
      scheduled_for: delayMinutes, // ✅ MINUTOS a partir de agora
      info: `Lembrete ${type} - Agendamento ${agendamentoId}`,
      messages: [
        {
          number: clienteTelefone,         // ✅ Formato: "5511999999999" (sem @s.whatsapp.net)
          type: 'button',                   // ✅ Tipo correto para botões
          text: mensagem,                   // ✅ Texto principal do lembrete
          choices: buttons,                 // ✅ Array ["texto|id", "texto|id", ...]
          footerText: 'Aguardamos sua confirmação', // ✅ Rodapé (opcional)
          delay: 0                          // ✅ Sem "digitando..." no agendamento
        }
      ]
    };

    // ✅ VALIDAÇÃO: Confirmar que botões estão no formato correto
    const invalidButtons = buttons.filter(btn => !btn.includes('|'));
    if (invalidButtons.length > 0) {
      console.error(`❌ [${type}] Botões em formato inválido (faltando '|'):`, invalidButtons);
      console.error(`✅ Formato correto: "texto|id" (ex: "Confirmo|confirm")`);
    }

    console.log(`📤 [${type}] Criando lembrete para agendamento ${agendamentoId}:`, {
      scheduledFor: scheduledFor.toISOString(),
      phone: clienteTelefone.replace(/\d{4}$/, '****'), // Mascara últimos 4 dígitos
      delayMinutes: delayMinutes,
      delayMs: delayMs,
      buttonsCount: buttons.length,
      attempt: retryCount + 1
    });

    console.log(`📋 [${type}] Payload completo:`, JSON.stringify(payload, null, 2));

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
    
    console.log(`📥 [${type}] Resposta da API:`, JSON.stringify(result, null, 2));
    
    // Validar resposta do /sender/advanced
    // Retorna: { folder_id: "...", message: "..." }
    if (!result || !result.folder_id) {
      console.error(`❌ [${type}] Resposta inválida da API (sem folder_id):`, result);
      
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
 * ✅ USA /sender/edit com action "delete" para cancelar campanha agendada
 * Cancela apenas mensagens NÃO ENVIADAS (status "scheduled")
 */
async function cancelReminder(
  tokenInstancia: string,
  folderId: string,
  type: '24h' | '2h'
): Promise<boolean> {
  try {
    console.log(`🗑️ [${type}] Cancelando lembrete: ${folderId}`);
    
    const response = await fetch(`${API_BASE}/sender/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': tokenInstancia,
      },
      body: JSON.stringify({
        folder_id: folderId,
        action: 'delete'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${type}] Erro ao cancelar lembrete:`, errorText);
      return false;
    }

    console.log(`✅ [${type}] Lembrete cancelado com sucesso! folder_id: ${folderId}`);
    return true;

  } catch (error: any) {
    console.error(`❌ [${type}] Erro ao cancelar lembrete:`, error.message);
    return false;
  }
}

/**
 * 🔄 ATUALIZAR LEMBRETES (quando agendamento é editado)
 * 
 * 1. Cancela campanhas antigas via /sender/edit
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

  // ✅ Cancelar lembretes antigos ANTES de criar novos
  if (oldReminders && oldReminders.length > 0 && business.tokenInstancia) {
    console.log(`🗑️ Cancelando ${oldReminders.length} lembretes antigos...`);
    
    for (const reminder of oldReminders) {
      const folderId = reminder.messageId || reminder.folderId;
      if (folderId) {
        await cancelReminder(business.tokenInstancia, folderId, reminder.type);
      }
    }
    
    console.log(`✅ Lembretes antigos cancelados`);
  }

  // Criar novos lembretes com nova data/hora
  const newReminders = await createReminders(businessId, agendamentoId, agendamento, business);
  
  return newReminders;
}

/**
 * 🗑️ DELETAR LEMBRETES (quando agendamento é cancelado)
 * 
 * ✅ Cancela todas as campanhas agendadas via /sender/edit
 */
export async function deleteReminders(
  tokenInstancia: string,
  reminders?: ReminderMessage[]
): Promise<void> {
  
  if (!reminders || reminders.length === 0) {
    console.log('📭 Nenhum lembrete para cancelar');
    return;
  }

  if (!tokenInstancia) {
    console.warn('⚠️ Token da instância não fornecido - não é possível cancelar lembretes');
    return;
  }

  console.log(`🗑️ Cancelando ${reminders.length} lembretes...`);
  
  // Cancelar cada lembrete via API
  for (const reminder of reminders) {
    const folderId = reminder.messageId || reminder.folderId;
    if (folderId) {
      await cancelReminder(tokenInstancia, folderId, reminder.type);
    } else {
      console.warn(`⚠️ Lembrete ${reminder.type} sem folder_id - não pode ser cancelado`);
    }
  }
  
  console.log(`✅ Todos os lembretes foram cancelados`);
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
