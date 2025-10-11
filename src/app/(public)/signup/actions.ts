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
      planId: 'plano_expirado' // Plano padrão se o teste estiver desativado
    };

    if (configSnap.exists()) {
      const systemConfig = configSnap.data() as SystemConfig;
      if (systemConfig.trial?.enabled) {
        trialConfig = systemConfig.trial;
      }
    }

    // 2. Definir o plano inicial e a data de expiração
    const initialPlanId = trialConfig.enabled ? trialConfig.planId : 'plano_expirado';
    const expiresAt = trialConfig.enabled && trialConfig.days > 0 
      ? add(new Date(), { days: trialConfig.days })
      : null;

    // 3. Criar o documento do negócio
    const businessRef = adminDb.collection('negocios').doc(userId);
    await businessRef.set({
      ownerId: userId,
      email: userEmail,
      nome: `Negócio de ${userName}`,
      planId: initialPlanId,
      access_expires_at: expiresAt,
      createdAt: new Date(),
      // Adicione aqui outros campos padrão que um novo negócio deve ter
      whatsappConectado: false,
      habilitarLembrete24h: true,
      habilitarLembrete2h: true,
      habilitarFeedback: true,
      horariosFuncionamento: { /* ... estrutura padrão ... */ },
    });

    console.log(`Negócio criado para o usuário ${userId} com plano ${initialPlanId}.`);
    return { success: true };

  } catch (error) {
    console.error("Erro ao criar perfil de negócio:", error);
    return { success: false, error: "Falha ao configurar a conta do negócio." };
  }
}
