/**
 * ⚠️ SINCRONIZAÇÃO AUTOMÁTICA DESABILITADA
 * 
 * Os planos agora são totalmente editáveis via Firestore Console sem interferência do código.
 * Este arquivo mantém os valores padrão apenas como REFERÊNCIA.
 * 
 * Para criar/resetar planos: Use /api/admin/seed-plans (chamada manual)
 * Para editar valores: Edite diretamente no Firestore Console
 * 
 * ❌ A sincronização automática foi REMOVIDA dos layouts (admin e dashboard)
 */

import type { Plano } from '@/lib/types';

// 📋 Definição PADRÃO dos planos (FONTE DA VERDADE)
export const STANDARD_PLANS: Record<string, Omit<Plano, 'id'>> = {
  plano_gratis: {
    name: 'Gratuito',
    description: 'Funcionalidades básicas gratuitas para sempre.',
    price: 0,
    durationInDays: 0, // Nunca expira
    status: 'Ativo',
    features: ['notificacao_gestor_agendamento'], // Apenas notificação básica
    isFeatured: false,
  },
  plano_basico: {
    name: 'Básico',
    description: 'Funcionalidades essenciais para o seu negócio.',
    price: 89.90,
    durationInDays: 30,
    status: 'Ativo',
    features: [
      'lembrete_24h',
      'lembrete_2h',
      'feedback_pos_atendimento',
      'solicitacao_feedback',
      'notificacao_gestor_agendamento'
    ],
    isFeatured: false,
  },
  plano_profissional: {
    name: 'Profissional',
    description: 'Mais poder e automações para escalar seu atendimento.',
    price: 149.90,
    durationInDays: 30,
    status: 'Ativo',
    features: [
      'lembrete_24h',
      'lembrete_2h',
      'feedback_pos_atendimento',
      'solicitacao_feedback',
      'lembrete_profissional',
      'disparo_de_mensagens',
      'notificacao_gestor_agendamento',
      'rejeicao_chamadas'
    ],
    isFeatured: true,
  },
  plano_premium: {
    name: 'Premium',
    description: 'Acesso total a todas as funcionalidades da plataforma.',
    price: 189.00,
    durationInDays: 30,
    status: 'Ativo',
    features: [
      'lembrete_24h',
      'lembrete_2h',
      'feedback_pos_atendimento',
      'solicitacao_feedback',
      'lembrete_aniversario',
      'lembrete_profissional',
      'disparo_de_mensagens',
      'retorno_manutencao',
      'notificacao_gestor_agendamento',
      'atendimento_whatsapp_ia',
      'notificacao_cliente_agendamento',
      'escalonamento_humano',
      'rejeicao_chamadas'
    ],
    isFeatured: false,
  },
};

/**
 * 🔄 Sincroniza os planos no Firestore com os valores padrão
 * Chamado automaticamente quando admin faz login
 */
export async function syncPlansToFirestore(firestore: any): Promise<void> {
  try {
    const { doc, setDoc, deleteDoc } = await import('firebase/firestore');
    
    // 🧹 Primeiro, remove plano obsoleto (plano_expirado)
    try {
      const oldPlanRef = doc(firestore, 'planos', 'plano_expirado');
      await deleteDoc(oldPlanRef);
      } catch (error: any) {
      // Pode já ter sido deletado - silencioso
      if (error.code !== 'not-found') {
        }
    }
    
    // 🔄 Agora sincroniza os planos corretos
    const promises = Object.entries(STANDARD_PLANS).map(([planId, planData]) => {
      const planRef = doc(firestore, 'planos', planId);
      return setDoc(planRef, planData, { merge: true });
    });
    
    await Promise.all(promises);
    } catch (error) {
    console.error('❌ Erro ao sincronizar planos:', error);
    // Não falha silenciosamente - apenas loga
  }
}

/**
 * 🔍 Verifica se os planos precisam ser atualizados
 * Compara com localStorage para evitar atualizações desnecessárias
 */
export function shouldSyncPlans(): boolean {
  if (typeof window === 'undefined') return false;
  
  const lastSync = localStorage.getItem('plans_last_sync');
  if (!lastSync) return true;
  
  // Sincroniza no máximo uma vez por hora
  const ONE_HOUR = 60 * 60 * 1000;
  const lastSyncTime = parseInt(lastSync, 10);
  const now = Date.now();
  
  return (now - lastSyncTime) > ONE_HOUR;
}

/**
 * 💾 Marca que os planos foram sincronizados
 */
export function markPlansSynced(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('plans_last_sync', Date.now().toString());
}
