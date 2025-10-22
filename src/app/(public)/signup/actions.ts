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
 * Wrapper para adicionar timeout em operações assíncronas
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Cria o perfil de negócio para um novo usuário, aplicando as regras de teste do sistema.
 * @param userId O ID do novo usuário.
 * @param userEmail O email do novo usuário.
 * @param userName O nome do novo usuário.
 */
export async function createUserBusinessProfile(userId: string, userEmail: string, userName: string) {
  const startTime = Date.now();
  console.log(`[createUserBusinessProfile] Iniciando para userId: ${userId}`);
  
  try {
    // Validação de entrada
    if (!userId || !userEmail) {
      throw new Error('userId e userEmail são obrigatórios');
    }

    // 1. Buscar a configuração global do sistema com timeout
    console.log('[createUserBusinessProfile] Buscando configuração do sistema...');
    
    let trialConfig: SystemConfig['trial'] = {
      enabled: false,
      days: 0,
      planId: 'plano_gratis' // ✅ Sistema é GRATUITO por padrão
    };

    try {
      const configRef = adminDb.collection('configuracoes_sistema').doc('global');
      const configSnap = await withTimeout(
        configRef.get(),
        5000, // 5 segundos de timeout
        'Timeout ao buscar configuração do sistema'
      );

      if (configSnap.exists) {
        const systemConfig = configSnap.data() as SystemConfig;
        if (systemConfig?.trial?.enabled) {
          trialConfig = systemConfig.trial;
        }
      }
      console.log('[createUserBusinessProfile] Configuração obtida:', trialConfig);
    } catch (configError) {
      // Se falhar ao buscar config, continua com valores padrão
      console.warn('[createUserBusinessProfile] Erro ao buscar config, usando padrão:', configError);
    }

    // 2. Definir o plano inicial e a data de expiração
    const initialPlanId = trialConfig.enabled ? trialConfig.planId : 'plano_gratis';
    const expiresAt = trialConfig.enabled && trialConfig.days > 0 
      ? add(new Date(), { days: trialConfig.days })
      : null;

    // 3. Criar o documento do negócio com timeout
    console.log('[createUserBusinessProfile] Criando documento do negócio...');
    const businessRef = adminDb.collection('negocios').doc(userId);
    
    const automationsEnabled = trialConfig.enabled;
    
    const businessData = {
      ownerId: userId,
      email: userEmail,
      planId: initialPlanId,
      access_expires_at: expiresAt,
      createdAt: new Date(),
      setupCompleted: false,
      whatsappConectado: false,
      habilitarLembrete24h: automationsEnabled,
      habilitarLembrete2h: automationsEnabled,
      habilitarFeedback: false,
      habilitarAniversario: false,
      iaAtiva: false,
      horariosFuncionamento: {
        segunda: { abertura: '09:00', fechamento: '18:00', ativo: true },
        terca: { abertura: '09:00', fechamento: '18:00', ativo: true },
        quarta: { abertura: '09:00', fechamento: '18:00', ativo: true },
        quinta: { abertura: '09:00', fechamento: '18:00', ativo: true },
        sexta: { abertura: '09:00', fechamento: '18:00', ativo: true },
        sabado: { abertura: '09:00', fechamento: '13:00', ativo: false },
        domingo: { abertura: '09:00', fechamento: '13:00', ativo: false }
      },
    };

    await withTimeout(
      businessRef.set(businessData),
      10000, // 10 segundos de timeout
      'Timeout ao criar documento do negócio'
    );

    const duration = Date.now() - startTime;
    console.log(`[createUserBusinessProfile] Sucesso! Duração: ${duration}ms`);
    
    return { success: true };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Falha ao configurar a conta do negócio.";
    
    console.error(`[createUserBusinessProfile] ERRO após ${duration}ms:`, {
      userId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}
