/**
 * 📤 SISTEMA DE DISPARO EM MASSA - UAZAPI V2
 * 
 * ✨ NOVA ABORDAGEM COM /sender/simple:
 * - Agenda tudo de uma vez na UazAPI (não precisa de cron local)
 * - A UazAPI gerencia os intervalos automaticamente
 * - Mais confiável e escalável
 * 
 * 📋 REGRAS IMPLEMENTADAS:
 * - ⏱️ Intervalo: 80-120 segundos ALEATÓRIO entre mensagens
 * - 📊 Limite: Máximo 200 contatos por campanha
 * - 🕐 Horário: Apenas horário comercial do negócio
 * - 🚫 Domingos: Não envia em domingos
 * - 📅 Agendamento: Pode agendar para data/hora específica
 * 
 * 💡 VANTAGENS:
 * - UazAPI gerencia a fila automaticamente
 * - Não depende de cron rodando constantemente
 * - Pode pausar/continuar/cancelar campanhas
 * - Rastreamento preciso com folder_id
 */

"use server";

import { adminDb } from './firebase-admin';
import type { ConfiguracoesNegocio } from './types';

const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

/**
 * Interface para contatos do disparo
 */
export interface MassContacto {
  phone: string | number;
  name: string;
  customMessage?: string; // Mensagem personalizada (opcional)
}

/**
 * Configurações do disparo em massa
 */
export interface MassCampaignConfig {
  businessId: string;
  tokenInstancia: string;
  contacts: MassContacto[];
  message: {
    type: 'text' | 'image' | 'video' | 'audio' | 'document';
    content: string; // Texto ou URL da mídia
    caption?: string; // Para mídias
  };
  scheduledFor?: Date; // Agendar para data/hora específica (opcional)
  info?: string; // Descrição da campanha
}

/**
 * 🕐 VERIFICAR SE É HORÁRIO COMERCIAL
 */
function isBusinessHours(
  date: Date,
  businessHours?: ConfiguracoesNegocio['horariosFuncionamento']
): boolean {
  // Se não tem horários configurados, considera horário padrão (8h-18h)
  if (!businessHours) {
    const hour = date.getHours();
    const day = date.getDay();
    
    // Não envia domingo (0) 
    if (day === 0) return false;
    
    // Horário comercial padrão: 8h às 18h
    return hour >= 8 && hour < 18;
  }

  const dayNames = [
    'domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'
  ] as const;
  
  const dayIndex = date.getDay();
  const dayKey = dayNames[dayIndex] as keyof typeof businessHours;
  
  const daySchedule = businessHours[dayKey];

  // Se o dia está fechado, não é horário comercial
  if (!daySchedule || !daySchedule.enabled) {
    return false;
  }

  const currentTime = date.getHours() * 60 + date.getMinutes();
  
  // Verificar se está dentro de algum dos slots
  for (const slot of daySchedule.slots) {
    const [startH, startM] = slot.start.split(':').map(Number);
    const [endH, endM] = slot.end.split(':').map(Number);
    
    const startTime = (startH ?? 0) * 60 + (startM ?? 0);
    const endTime = (endH ?? 0) * 60 + (endM ?? 0);
    
    if (currentTime >= startTime && currentTime < endTime) {
      return true;
    }
  }

  return false;
}

/**
 * 📅 CALCULAR PRÓXIMO HORÁRIO COMERCIAL
 */
function getNextBusinessTime(
  startDate: Date,
  businessHours?: ConfiguracoesNegocio['horariosFuncionamento']
): Date {
  const date = new Date(startDate);
  
  // Tentar até 7 dias à frente
  for (let i = 0; i < 7; i++) {
    if (isBusinessHours(date, businessHours)) {
      return date;
    }
    
    // Se não é horário comercial, avançar 1 hora
    date.setHours(date.getHours() + 1);
  }
  
  // Se não encontrou, retornar próxima segunda 9h
  const nextMonday = new Date(startDate);
  nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7));
  nextMonday.setHours(9, 0, 0, 0);
  
  return nextMonday;
}

/**
 * 📤 CRIAR DISPARO EM MASSA VIA UAZAPI
 * 
 * Usa /sender/simple para agendar tudo de uma vez
 */
export async function createMassCampaign(
  config: MassCampaignConfig
): Promise<{ success: boolean; folderId?: string; message: string }> {
  
  try {
    // Validações
    if (!config.tokenInstancia) {
      return { success: false, message: 'Token de instância não encontrado' };
    }

    if (config.contacts.length === 0) {
      return { success: false, message: 'Nenhum contato fornecido' };
    }

    if (config.contacts.length > 200) {
      return { 
        success: false, 
        message: 'Máximo de 200 contatos por campanha. Divida em múltiplas campanhas.' 
      };
    }

    // Buscar configurações do negócio
    const businessDoc = await adminDb.collection('negocios').doc(config.businessId).get();
    if (!businessDoc.exists) {
      return { success: false, message: 'Negócio não encontrado' };
    }

    const business = businessDoc.data() as ConfiguracoesNegocio;

    // Determinar horário de início
    let scheduledTime = config.scheduledFor || new Date();
    
    // Se não é horário comercial, agendar para próximo horário válido
    if (!isBusinessHours(scheduledTime, business.horariosFuncionamento)) {
      scheduledTime = getNextBusinessTime(scheduledTime, business.horariosFuncionamento);
    }

    // Formatar números para WhatsApp: 5511999999999@s.whatsapp.net
    const numbers = config.contacts.map(contact => {
      const cleanPhone = String(contact.phone).replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      return `${fullPhone}@s.whatsapp.net`;
    });

    // Preparar payload baseado no tipo de mensagem
    const payload: any = {
      numbers,
      delayMin: 80,  // 80 segundos mínimo
      delayMax: 120, // 120 segundos máximo
      scheduled_for: scheduledTime.getTime(), // Timestamp em milissegundos
      info: config.info || `Campanha massa - ${config.contacts.length} contatos`,
    };

    if (config.message.type === 'text') {
      payload.type = 'text';
      payload.text = config.message.content;
    } else {
      // Mídia (imagem, vídeo, áudio, documento)
      payload.type = config.message.type;
      payload.file = config.message.content;
      if (config.message.caption) {
        payload.text = config.message.caption;
      }
    }

    // Criar campanha na UazAPI
    const response = await fetch(`${API_BASE}/sender/simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': config.tokenInstancia,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ao criar campanha em massa:', response.status, errorText);
      return { 
        success: false, 
        message: `Erro na UazAPI: ${response.status} - ${errorText}` 
      };
    }

    const result = await response.json();
    
    // A UazAPI retorna o folder_id da campanha
    const folderId = result.folder_id || result.folderId || result.id;
    
    if (!folderId) {
      console.error('❌ folder_id não retornado pela API:', result);
      return { 
        success: false, 
        message: 'UazAPI não retornou folder_id' 
      };
    }

    return {
      success: true,
      folderId,
      message: `Campanha criada com sucesso! ${config.contacts.length} contatos agendados para ${scheduledTime.toLocaleString('pt-BR')}`
    };

  } catch (error: any) {
    console.error('❌ Erro ao criar disparo em massa:', error.message);
    return {
      success: false,
      message: `Erro: ${error.message}`
    };
  }
}

/**
 * 🛑 PAUSAR CAMPANHA
 */
export async function pauseMassCampaign(
  tokenInstancia: string,
  folderId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/sender/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': tokenInstancia,
      },
      body: JSON.stringify({
        folder_id: folderId,
        action: 'stop'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `Erro: ${errorText}` };
    }

    return { success: true, message: 'Campanha pausada com sucesso' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * ▶️ CONTINUAR CAMPANHA
 */
export async function resumeMassCampaign(
  tokenInstancia: string,
  folderId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/sender/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': tokenInstancia,
      },
      body: JSON.stringify({
        folder_id: folderId,
        action: 'continue'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `Erro: ${errorText}` };
    }

    return { success: true, message: 'Campanha retomada com sucesso' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * 🗑️ CANCELAR CAMPANHA
 */
export async function cancelMassCampaign(
  tokenInstancia: string,
  folderId: string
): Promise<{ success: boolean; message: string }> {
  try {
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
      return { success: false, message: `Erro: ${errorText}` };
    }

    return { success: true, message: 'Campanha cancelada com sucesso' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * 📋 LISTAR CAMPANHAS ATIVAS
 */
export async function listActiveCampaigns(
  tokenInstancia: string,
  status?: 'scheduled' | 'sending' | 'paused' | 'done'
): Promise<any[]> {
  try {
    const url = status 
      ? `${API_BASE}/sender/listfolders?status=${status}`
      : `${API_BASE}/sender/listfolders`;
      
    const response = await fetch(url, {
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

/**
 * 📊 OBTER DETALHES DE UMA CAMPANHA
 */
export async function getCampaignDetails(
  tokenInstancia: string,
  folderId: string
): Promise<any | null> {
  try {
    const response = await fetch(`${API_BASE}/sender/listmessages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': tokenInstancia,
      },
      body: JSON.stringify({ folder_id: folderId }),
    });

    if (!response.ok) {
      console.error('❌ Erro ao buscar detalhes da campanha:', response.status);
      return null;
    }

    return await response.json();

  } catch (error: any) {
    console.error('❌ Erro ao buscar detalhes:', error.message);
    return null;
  }
}
