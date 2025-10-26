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
 * ❌ FUNÇÕES REMOVIDAS
 * 
 * As seguintes funções foram removidas pois a sincronização automática
 * foi desabilitada para permitir edição livre dos planos no Firestore:
 * 
 * - syncPlansToFirestore() - Sincronização automática removida
 * - shouldSyncPlans() - Não é mais necessário
 * - markPlansSynced() - Não é mais necessário
 * 
 * Para criar/resetar planos, use: /api/admin/seed-plans (chamada manual)
 * Para editar valores: Edite diretamente no Firestore Console
 */
