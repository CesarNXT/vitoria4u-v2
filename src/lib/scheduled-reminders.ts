"use server";

import { adminDb } from './firebase-admin';
import { subHours } from 'date-fns';
import type { Agendamento, ConfiguracoesNegocio } from './types';

/**
 * Combina data e hora do agendamento em um único Date
 */
function combinaDataHora(date: any, startTime: string): Date {
  // Sempre converte para Date, independente do formato
  const dateObj = new Date(date);
  
  const [hours, minutes] = startTime.split(':').map(Number);
  dateObj.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  
  return dateObj;
}

/**
 * Cria reminders de 24h e 2h para um agendamento
 */
export async function createReminders(
  businessId: string,
  agendamentoId: string,
  agendamento: Agendamento,
  business: ConfiguracoesNegocio
): Promise<void> {
  try {
    // Calcular horários de envio
    const dataAgendamento = combinaDataHora(agendamento.date, agendamento.startTime);
    const envio24h = subHours(dataAgendamento, 24);
    const envio2h = subHours(dataAgendamento, 2);
    
    const batch = adminDb.batch();
    
    // Payload comum para ambos os reminders
    const payload = {
      tokenInstancia: business.tokenInstancia || '',
      telefoneCliente: agendamento.cliente.phone,
      nomeCliente: agendamento.cliente.name,
      nomeServico: agendamento.servico.name,
      startTime: agendamento.startTime,
      nomeEmpresa: business.nome,
      categoriaEmpresa: business.categoria
    };
    
    // Reminder 24h
    const reminder24hRef = adminDb.collection('scheduled_reminders').doc(`24h_${agendamentoId}`);
    batch.set(reminder24hRef, {
      type: '24h',
      executeAt: envio24h,
      businessId,
      agendamentoId,
      agendamentoPath: `negocios/${businessId}/agendamentos/${agendamentoId}`,
      payload,
      status: 'pending',
      createdAt: new Date(),
      scheduledFor: dataAgendamento
    });
    
    // Reminder 2h
    const reminder2hRef = adminDb.collection('scheduled_reminders').doc(`2h_${agendamentoId}`);
    batch.set(reminder2hRef, {
      type: '2h',
      executeAt: envio2h,
      businessId,
      agendamentoId,
      agendamentoPath: `negocios/${businessId}/agendamentos/${agendamentoId}`,
      payload,
      status: 'pending',
      createdAt: new Date(),
      scheduledFor: dataAgendamento
    });
    
    await batch.commit();
  } catch (error) {
    // Silencioso
    throw error;
  }
}

/**
 * Atualiza reminders quando um agendamento é editado
 */
export async function updateReminders(
  businessId: string,
  agendamentoId: string,
  agendamento: Agendamento,
  business: ConfiguracoesNegocio
): Promise<void> {
  try {
    // 1. Deletar reminders antigos
    const batch1 = adminDb.batch();
    
    const reminder24hRef = adminDb.collection('scheduled_reminders').doc(`24h_${agendamentoId}`);
    const reminder2hRef = adminDb.collection('scheduled_reminders').doc(`2h_${agendamentoId}`);
    
    batch1.delete(reminder24hRef);
    batch1.delete(reminder2hRef);
    
    await batch1.commit();
    
    // 2. Criar reminders novos com nova data/hora
    await createReminders(businessId, agendamentoId, agendamento, business);
  } catch (error) {
    // Silencioso
    throw error;
  }
}

/**
 * Deleta reminders quando um agendamento é cancelado
 */
export async function deleteReminders(agendamentoId: string): Promise<void> {
  try {
    const batch = adminDb.batch();
    
    const reminder24hRef = adminDb.collection('scheduled_reminders').doc(`24h_${agendamentoId}`);
    const reminder2hRef = adminDb.collection('scheduled_reminders').doc(`2h_${agendamentoId}`);
    
    batch.delete(reminder24hRef);
    batch.delete(reminder2hRef);
    
    await batch.commit();
  } catch (error) {
    // Silencioso
    throw error;
  }
}
