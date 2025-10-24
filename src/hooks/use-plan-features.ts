import { useMemo } from 'react';
import type { ConfiguracoesNegocio, Plano, PlanFeature } from '@/lib/types';

/**
 * Hook para verificar features do plano do usuário
 * Garante que funcionalidades só estejam disponíveis se o plano permitir
 */
export function usePlanFeatures(settings: ConfiguracoesNegocio | null, plan: Plano | null) {
  const features = useMemo(() => {
    if (!plan || !settings) {
      // ✅ Sistema é gratuito por padrão - funcionalidades básicas sempre disponíveis
      return {
        hasFeature: () => false,
        features: [] as PlanFeature[],
        isExpired: false,
        planName: 'Gratuito',
        canUseFeature: (feature: PlanFeature) => ({ 
          allowed: false, 
          reason: 'Esta automação não está disponível no plano gratuito. Faça upgrade!' 
        })
      };
    }

    // Verificar se o plano está expirado
    const now = new Date();
    let expirationDate: Date | null = null;
    
    if (settings.access_expires_at) {
      expirationDate = settings.access_expires_at instanceof Date 
        ? settings.access_expires_at 
        : new Date(settings.access_expires_at);
    }
    
    // ✅ LÓGICA CORRETA:
    // - plano_gratis: NUNCA expira (sistema gratuito permanente)
    // - outros planos: expiram e voltam para plano_gratis
    const isExpired = plan.id !== 'plano_gratis' && expirationDate ? expirationDate < now : false;
    
    // Se expirado, volta para features vazias (plano grátis)
    const availableFeatures = isExpired ? [] : (plan.features || []);

    return {
      /**
       * Verifica se tem uma feature específica
       */
      hasFeature: (feature: PlanFeature): boolean => {
        return availableFeatures.includes(feature);
      },

      /**
       * Verifica se pode usar uma feature e retorna razão se não puder
       */
      canUseFeature: (feature: PlanFeature): { allowed: boolean; reason?: string } => {
        if (isExpired) {
          return { 
            allowed: false, 
            reason: 'Seu período de automações expirou. O sistema continua funcionando gratuitamente! Faça upgrade para reativar automações.' 
          };
        }

        if (!availableFeatures.includes(feature)) {
          return { 
            allowed: false, 
            reason: `Esta automação não está disponível no plano ${plan.name}. Faça upgrade para desbloquear!` 
          };
        }

        return { allowed: true };
      },

      /**
       * Lista de features disponíveis
       */
      features: availableFeatures,

      /**
       * Se o plano está expirado
       */
      isExpired,

      /**
       * Nome do plano
       */
      planName: plan.name,

      /**
       * ID do plano
       */
      planId: plan.id
    };
  }, [settings, plan]);

  return features;
}

/**
 * Mapeamento de features para labels amigáveis
 */
export const FEATURE_LABELS: Record<PlanFeature, string> = {
  'lembrete_24h': 'Lembrete 24h antes',
  'lembrete_2h': 'Lembrete 2h antes',
  'feedback_pos_atendimento': 'Feedback pós-atendimento',
  'solicitacao_feedback': 'Solicitação de Avaliação',
  'lembrete_aniversario': 'Lembrete de aniversário',
  'lembrete_profissional': 'Lembrete para profissional',
  'disparo_de_mensagens': 'Campanhas',
  'retorno_manutencao': 'Lembrete de retorno',
  'notificacao_gestor_agendamento': 'Aviso de agendamento/cancelamento',
  'notificacao_cliente_agendamento': 'Confirmação para o cliente',
  'atendimento_whatsapp_ia': 'Atendimento com IA',
  'escalonamento_humano': 'Escalonamento Humano',
  'rejeicao_chamadas': 'Rejeição de Chamadas'
};

/**
 * Descrições das features
 */
export const FEATURE_DESCRIPTIONS: Record<PlanFeature, string> = {
  'lembrete_24h': 'Envia lembrete automático 24 horas antes do agendamento (requer WhatsApp conectado)',
  'lembrete_2h': 'Envia lembrete automático 2 horas antes do agendamento (requer WhatsApp conectado)',
  'feedback_pos_atendimento': 'Solicita feedback do cliente após o atendimento (requer WhatsApp conectado)',
  'solicitacao_feedback': 'Solicita avaliação no Google/Instagram quando serviço é finalizado (requer WhatsApp conectado)',
  'lembrete_aniversario': 'Envia mensagem de aniversário para clientes (requer WhatsApp conectado)',
  'lembrete_profissional': 'Notifica profissional quando há novo agendamento (requer WhatsApp conectado)',
  'disparo_de_mensagens': 'Permite enviar campanhas em massa via WhatsApp (requer WhatsApp conectado)',
  'retorno_manutencao': 'Lembra clientes de retornar após período definido (requer WhatsApp conectado)',
  'notificacao_gestor_agendamento': 'Notifica gestor sobre novos agendamentos e cancelamentos via token fixo do sistema (funciona sem WhatsApp)',
  'notificacao_cliente_agendamento': 'Envia confirmação automática quando cliente agenda (requer WhatsApp conectado)',
  'atendimento_whatsapp_ia': 'IA responde automaticamente no WhatsApp e agenda via webhook N8N (híbrido: só IA ou IA + humano)',
  'escalonamento_humano': 'Transfere conversa para atendente humano quando IA não souber responder (requer WhatsApp conectado)',
  'rejeicao_chamadas': 'Rejeita chamadas de voz/vídeo automaticamente e envia mensagem personalizada (requer WhatsApp conectado)'
};
