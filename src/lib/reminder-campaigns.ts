/**
 * Sistema de Lembretes Automáticos via Campanhas
 * 
 * Envia lembretes automáticos de agendamentos usando o sistema de campanhas:
 * - 24 horas antes do agendamento
 * - 2 horas antes do agendamento
 * 
 * Quando um agendamento é alterado:
 * - Cancela os lembretes antigos
 * - Cria novos lembretes com as novas datas
 */

import { db } from '@/firebase';
import { addDoc, collection, query, where, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import type { Agendamento } from './types';

interface ReminderCampaign {
  agendamentoId: string;
  type: '24h' | '2h';
  scheduledFor: Date;
  status: 'Agendada' | 'Cancelada';
}

/**
 * Calcula os horários de envio dos lembretes
 */
function calculateReminderTimes(agendamentoDate: Date) {
  const reminder24h = new Date(agendamentoDate.getTime() - 24 * 60 * 60 * 1000); // 24h antes
  const reminder2h = new Date(agendamentoDate.getTime() - 2 * 60 * 60 * 1000);   // 2h antes
  
  return { reminder24h, reminder2h };
}

/**
 * Cria mensagem de lembrete personalizada
 */
function createReminderMessage(
  type: '24h' | '2h',
  agendamento: Agendamento,
  clienteNome: string,
  profissionalNome: string
): string {
  const timeText = type === '24h' ? '24 horas' : '2 horas';
  const data = agendamento.dataHora instanceof Date 
    ? agendamento.dataHora 
    : agendamento.dataHora.toDate();
  
  const dataFormatada = data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const horaFormatada = data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `🔔 *Lembrete de Agendamento*

Olá ${clienteNome}! 👋

Este é um lembrete de que você tem um agendamento em *${timeText}*:

📅 *Data:* ${dataFormatada}
⏰ *Horário:* ${horaFormatada}
💼 *Profissional:* ${profissionalNome}
${agendamento.servicoNome ? `✨ *Serviço:* ${agendamento.servicoNome}` : ''}

Aguardamos você! 😊

_Para cancelar ou remarcar, entre em contato conosco._`;
}

/**
 * Cria campanhas de lembrete para um agendamento
 */
export async function createReminderCampaigns(
  businessUserId: string,
  agendamento: Agendamento,
  clienteNome: string,
  clienteTelefone: string,
  profissionalNome: string
): Promise<void> {
  try {
    const agendamentoDate = agendamento.dataHora instanceof Date
      ? agendamento.dataHora
      : agendamento.dataHora.toDate();

    const now = new Date();
    const { reminder24h, reminder2h } = calculateReminderTimes(agendamentoDate);

    // Só cria lembretes se ainda não passou do horário
    const reminders: Array<{ type: '24h' | '2h'; date: Date }> = [];

    if (reminder24h > now) {
      reminders.push({ type: '24h', date: reminder24h });
    }

    if (reminder2h > now) {
      reminders.push({ type: '2h', date: reminder2h });
    }

    // Criar campanha para cada lembrete
    for (const reminder of reminders) {
      const message = createReminderMessage(
        reminder.type,
        agendamento,
        clienteNome,
        profissionalNome
      );

      // Formatar telefone: 5511999999999@s.whatsapp.net
      const phone = clienteTelefone.replace(/\D/g, '');
      const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
      const whatsappNumber = `${fullPhone}@s.whatsapp.net`;

      // Criar campanha agendada
      await addDoc(collection(db, 'negocios', businessUserId, 'campanhas'), {
        nome: `Lembrete ${reminder.type} - ${clienteNome}`,
        tipo: 'texto',
        mensagem: message,
        status: 'Agendada',
        dataAgendamento: Timestamp.fromDate(reminder.date),
        dataCriacao: Timestamp.now(),
        
        // Metadados do lembrete
        isReminder: true,
        reminderType: reminder.type,
        agendamentoId: agendamento.id,
        
        // Contatos
        totalContatos: 1,
        contatosEnviados: 0,
        contatos: [{
          clienteId: agendamento.clienteId,
          nome: clienteNome,
          telefone: clienteTelefone,
        }],
        
        // Envios
        envios: [{
          contatoId: agendamento.clienteId,
          telefone: whatsappNumber,
          status: 'Agendado',
          agendadoPara: Timestamp.fromDate(reminder.date),
        }],
      });

      console.log(`✅ Lembrete ${reminder.type} criado para ${clienteNome} em ${reminder.date.toLocaleString()}`);
    }
  } catch (error) {
    console.error('❌ Erro ao criar lembretes:', error);
    throw error;
  }
}

/**
 * Cancela todos os lembretes de um agendamento
 */
export async function cancelReminderCampaigns(
  businessUserId: string,
  agendamentoId: string
): Promise<void> {
  try {
    const campanhasRef = collection(db, 'negocios', businessUserId, 'campanhas');
    const q = query(
      campanhasRef,
      where('isReminder', '==', true),
      where('agendamentoId', '==', agendamentoId),
      where('status', '==', 'Agendada')
    );

    const snapshot = await getDocs(q);
    
    // Deletar todas as campanhas de lembrete
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log(`✅ ${snapshot.size} lembretes cancelados para agendamento ${agendamentoId}`);
  } catch (error) {
    console.error('❌ Erro ao cancelar lembretes:', error);
    throw error;
  }
}

/**
 * Atualiza lembretes quando um agendamento é alterado
 */
export async function updateReminderCampaigns(
  businessUserId: string,
  agendamento: Agendamento,
  clienteNome: string,
  clienteTelefone: string,
  profissionalNome: string
): Promise<void> {
  try {
    // 1. Cancelar lembretes antigos
    await cancelReminderCampaigns(businessUserId, agendamento.id);

    // 2. Criar novos lembretes
    await createReminderCampaigns(
      businessUserId,
      agendamento,
      clienteNome,
      clienteTelefone,
      profissionalNome
    );

    console.log(`✅ Lembretes atualizados para agendamento ${agendamento.id}`);
  } catch (error) {
    console.error('❌ Erro ao atualizar lembretes:', error);
    throw error;
  }
}
