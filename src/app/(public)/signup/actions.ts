"use server";

import { adminDb } from "@/lib/firebase-admin";
import { add } from 'date-fns';

interface SystemConfig {
  id: string;
  trial: {
    enabled: boolean;
    days: number;
    planId: string;
  };
}

/**
 * Cria o perfil de negócio para um novo usuário, aplicando as regras de teste do sistema.
 * @param userId O ID do novo usuário.
 * @param userEmail O email do novo usuário.
 * @param userName O nome do novo usuário.
 */
export async function createUserBusinessProfile(userId: string, userEmail: string, userName: string) {
  try {
    // 1. Buscar a configuração global do sistema
    const configRef = adminDb.collection('configuracoes_sistema').doc('global');
    const configSnap = await configRef.get();

    let trialConfig: SystemConfig['trial'] = {
      enabled: false,
      days: 0,
      planId: 'plano_gratis' // ✅ Sistema é GRATUITO por padrão
    };

    if (configSnap.exists) {
      const systemConfig = configSnap.data() as SystemConfig;
      if (systemConfig.trial?.enabled) {
        trialConfig = systemConfig.trial;
      }
    }

    // 2. Definir o plano inicial e a data de expiração
    // ✅ LÓGICA CORRETA:
    // - COM teste: Plano premium temporário (ex: 3 dias)
    // - SEM teste: Plano grátis permanente (sistema gratuito!)
    const initialPlanId = trialConfig.enabled ? trialConfig.planId : 'plano_gratis';
    const expiresAt = trialConfig.enabled && trialConfig.days > 0 
      ? add(new Date(), { days: trialConfig.days })
      : null; // plano_gratis nunca expira

    // 3. Criar o documento do negócio
    const businessRef = adminDb.collection('negocios').doc(userId);
    await businessRef.set({
      ownerId: userId,
      email: userEmail,
      // Nome fica vazio para ser preenchido pelo usuário
      planId: initialPlanId,
      access_expires_at: expiresAt,
      createdAt: new Date(),
      setupCompleted: false, // Marca que a configuração inicial ainda não foi concluída
      // Adicione aqui outros campos padrão que um novo negócio deve ter
      whatsappConectado: false,
      habilitarLembrete24h: true,
      habilitarLembrete2h: true,
      habilitarFeedback: false,
      horariosFuncionamento: {
        segunda: { abertura: '09:00', fechamento: '18:00', ativo: true },
        terca: { abertura: '09:00', fechamento: '18:00', ativo: true },
        quarta: { abertura: '09:00', fechamento: '18:00', ativo: true },
        quinta: { abertura: '09:00', fechamento: '18:00', ativo: true },
        sexta: { abertura: '09:00', fechamento: '18:00', ativo: true },
        sabado: { abertura: '09:00', fechamento: '13:00', ativo: false },
        domingo: { abertura: '09:00', fechamento: '13:00', ativo: false }
      },
    });

    return { success: true };

  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Falha ao configurar a conta do negócio." };
  }
}
