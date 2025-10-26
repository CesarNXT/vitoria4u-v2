/**
 * 📊 SISTEMA DE RASTREAMENTO DE CAMPANHAS
 * 
 * Controla:
 * - Limite de 200 envios/dia
 * - Histórico de quem já recebeu campanhas
 * - Status individual de cada envio
 * - Estatísticas diárias
 */

"use server";

import { adminDb } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { format, startOfDay } from 'date-fns';

export interface CampaignContact {
  clienteId: string;
  nome: string;
  telefone: number | string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: Date;
  error?: string;
}

export interface Campaign {
  id: string;
  businessId: string;
  folder_id?: string;
  nome: string;
  tipo: 'texto' | 'imagem' | 'audio' | 'video';
  mensagem?: string;
  mediaUrl?: string;
  status: 'scheduled' | 'sending' | 'paused' | 'done' | 'failed';
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  contatos: CampaignContact[];
  scheduled_for: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DailyStats {
  date: string;
  sent_count: number;
  campaign_ids: string[];
  last_updated: Date;
}

/**
 * 📅 Obter estatísticas do dia
 */
export async function getDailyStats(
  businessId: string,
  date: Date = new Date()
): Promise<DailyStats> {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  try {
    const docRef = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('daily_stats')
      .doc(dateStr);
    
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return {
        date: dateStr,
        sent_count: 0,
        campaign_ids: [],
        last_updated: new Date(),
      };
    }
    
    const data = doc.data()!;
    return {
      date: dateStr,
      sent_count: data.sent_count || 0,
      campaign_ids: data.campaign_ids || [],
      last_updated: data.last_updated?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Erro ao buscar daily stats:', error);
    return {
      date: dateStr,
      sent_count: 0,
      campaign_ids: [],
      last_updated: new Date(),
    };
  }
}

/**
 * 📊 Calcular quantos contatos podem ser enviados hoje
 */
export async function getAvailableQuota(
  businessId: string,
  date: Date = new Date()
): Promise<{
  total: number;
  used: number;
  available: number;
  canSendToday: boolean;
}> {
  const stats = await getDailyStats(businessId, date);
  const DAILY_LIMIT = 200;
  
  return {
    total: DAILY_LIMIT,
    used: stats.sent_count,
    available: Math.max(0, DAILY_LIMIT - stats.sent_count),
    canSendToday: stats.sent_count < DAILY_LIMIT,
  };
}

/**
 * ✂️ Dividir contatos em múltiplos dias (se necessário)
 */
export async function splitContactsByDays(
  businessId: string,
  contacts: CampaignContact[],
  startDate: Date = new Date()
): Promise<{
  batches: Array<{
    date: Date;
    contacts: CampaignContact[];
    quota_before: number;
    quota_after: number;
  }>;
  total_days: number;
}> {
  const batches: Array<{
    date: Date;
    contacts: CampaignContact[];
    quota_before: number;
    quota_after: number;
  }> = [];
  
  let remainingContacts = [...contacts];
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  
  while (remainingContacts.length > 0) {
    const quota = await getAvailableQuota(businessId, currentDate);
    
    if (quota.available === 0) {
      // Avançar para o próximo dia
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    // Pegar até o limite disponível
    const batchSize = Math.min(quota.available, remainingContacts.length);
    const batchContacts = remainingContacts.slice(0, batchSize);
    
    batches.push({
      date: new Date(currentDate),
      contacts: batchContacts,
      quota_before: quota.available,
      quota_after: quota.available - batchSize,
    });
    
    remainingContacts = remainingContacts.slice(batchSize);
    
    // Se ainda tem contatos, avançar para próximo dia
    if (remainingContacts.length > 0) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return {
    batches,
    total_days: batches.length,
  };
}

/**
 * 💾 Salvar campanha no Firestore
 */
export async function saveCampaign(campaign: Omit<Campaign, 'id'>): Promise<string> {
  try {
    const createdAt = Timestamp.fromDate(campaign.created_at);
    const updatedAt = Timestamp.fromDate(campaign.updated_at);
    const scheduledFor = Timestamp.fromDate(campaign.scheduled_for);
    
    const docRef = await adminDb
      .collection('negocios')
      .doc(campaign.businessId)
      .collection('campanhas')
      .add({
        ...campaign,
        // Snake_case (compatibilidade)
        created_at: createdAt,
        updated_at: updatedAt,
        scheduled_for: scheduledFor,
        total_contacts: campaign.total_contacts,
        sent_count: campaign.sent_count,
        failed_count: campaign.failed_count,
        // CamelCase (novo padrão para tabela)
        createdAt: createdAt,
        updatedAt: updatedAt,
        dataAgendamento: scheduledFor,
        totalContatos: campaign.total_contacts,
        contatosEnviados: campaign.sent_count,
        contatosFalhados: campaign.failed_count,
        contatos: campaign.contatos.map(c => ({
          ...c,
          sent_at: c.sent_at ? Timestamp.fromDate(c.sent_at) : null,
        })),
      });
    
    return docRef.id;
  } catch (error) {
    console.error('Erro ao salvar campanha:', error);
    throw error;
  }
}

/**
 * 🔄 Atualizar status da campanha
 */
export async function updateCampaignStatus(
  businessId: string,
  campaignId: string,
  updates: Partial<Pick<Campaign, 'status' | 'sent_count' | 'failed_count' | 'folder_id'>>
): Promise<void> {
  try {
    await adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('campanhas')
      .doc(campaignId)
      .update({
        ...updates,
        updated_at: Timestamp.now(),
      });
  } catch (error) {
    console.error('Erro ao atualizar campanha:', error);
    throw error;
  }
}

/**
 * 📈 Incrementar contador diário
 */
export async function incrementDailyStats(
  businessId: string,
  campaignId: string,
  count: number,
  date: Date = new Date()
): Promise<void> {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  try {
    const docRef = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('daily_stats')
      .doc(dateStr);
    
    const doc = await docRef.get();
    
    if (!doc.exists) {
      await docRef.set({
        date: dateStr,
        sent_count: count,
        campaign_ids: [campaignId],
        last_updated: Timestamp.now(),
      });
    } else {
      const data = doc.data()!;
      const currentIds = data.campaign_ids || [];
      
      await docRef.update({
        sent_count: (data.sent_count || 0) + count,
        campaign_ids: currentIds.includes(campaignId) 
          ? currentIds 
          : [...currentIds, campaignId],
        last_updated: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Erro ao incrementar daily stats:', error);
  }
}

/**
 * 📋 Registrar campanha no histórico do cliente
 */
export async function addCampaignToClientHistory(
  businessId: string,
  clienteId: string,
  campaignId: string
): Promise<void> {
  try {
    const clientRef = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('clientes')
      .doc(clienteId);
    
    const clientDoc = await clientRef.get();
    
    if (!clientDoc.exists) return;
    
    const data = clientDoc.data()!;
    const campanhas = data.campanhas_recebidas || [];
    
    if (!campanhas.includes(campaignId)) {
      await clientRef.update({
        campanhas_recebidas: [...campanhas, campaignId],
        ultima_campanha: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar histórico do cliente:', error);
  }
}

/**
 * 🔍 Buscar clientes que já receberam campanhas
 */
export async function getClientsWithCampaignHistory(
  businessId: string,
  daysAgo?: number
): Promise<string[]> {
  try {
    let query = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('clientes')
      .where('campanhas_recebidas', '!=', null);
    
    if (daysAgo) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      
      query = query.where('ultima_campanha', '>=', Timestamp.fromDate(cutoffDate));
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Erro ao buscar clientes com histórico:', error);
    return [];
  }
}

/**
 * 📊 Obter estatísticas gerais de campanhas
 */
export async function getCampaignStats(businessId: string): Promise<{
  total_campaigns: number;
  total_sent: number;
  total_failed: number;
  active_campaigns: number;
}> {
  try {
    const snapshot = await adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('campanhas')
      .get();
    
    let totalSent = 0;
    let totalFailed = 0;
    let activeCampaigns = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      totalSent += data.sent_count || 0;
      totalFailed += data.failed_count || 0;
      
      if (['scheduled', 'sending', 'paused'].includes(data.status)) {
        activeCampaigns++;
      }
    });
    
    return {
      total_campaigns: snapshot.size,
      total_sent: totalSent,
      total_failed: totalFailed,
      active_campaigns: activeCampaigns,
    };
  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    return {
      total_campaigns: 0,
      total_sent: 0,
      total_failed: 0,
      active_campaigns: 0,
    };
  }
}
