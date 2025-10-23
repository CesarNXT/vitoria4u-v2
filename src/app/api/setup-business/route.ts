'use server'

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * ✅ Cria/Atualiza documento do negócio com período de teste configurado
 * Chamado logo após registro de novo usuário
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, email, nome } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId e email são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar configuração global
    const configRef = adminDb.collection('system_config').doc('global');
    const configSnap = await configRef.get();
    
    let trial = { enabled: true, days: 3, planId: 'plano_premium' };
    
    if (configSnap.exists) {
      const config = configSnap.data() as any;
      trial = config?.trial || trial;
    }

    // Calcular data de expiração
    const now = new Date();
    const expirationDate = new Date(now.getTime() + (trial.days || 3) * 24 * 60 * 60 * 1000);

    // Verificar se negócio já existe
    const businessRef = adminDb.collection('negocios').doc(userId);
    const businessSnap = await businessRef.get();

    if (businessSnap.exists) {
      // Já existe, não sobrescrever
      console.log('✅ [SETUP-BUSINESS] Negócio já existe:', userId);
      return NextResponse.json({ 
        success: true, 
        message: 'Negócio já configurado',
        alreadyExists: true 
      });
    }

    // Criar novo documento do negócio com trial
    const businessData = {
      id: userId,
      email,
      nome: nome || email.split('@')[0],
      telefone: null,
      endereco: '',
      horarioFuncionamento: {
        inicio: '09:00',
        fim: '18:00',
      },
      intervalo: {
        inicio: '12:00',
        fim: '13:00',
      },
      planId: trial.enabled ? (trial.planId || 'plano_premium') : 'plano_gratis',
      access_expires_at: trial.enabled ? Timestamp.fromDate(expirationDate) : null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      // WhatsApp config
      whatsapp: {
        numero: null,
        mensagemBoasVindas: 'Olá! Bem-vindo(a) ao nosso atendimento. Como posso ajudá-lo(a)?',
        mensagemDespedida: 'Obrigado pelo contato! Até logo.',
      },
      // Configurações padrão
      agendamentoAutomatico: false,
      lembretes: {
        ativo: true,
        antecedencia24h: true,
        antecedencia2h: true,
      },
    };

    await businessRef.set(businessData);

    console.log(`✅ [SETUP-BUSINESS] Negócio criado com trial de ${trial.days} dias:`, userId);

    return NextResponse.json({ 
      success: true,
      businessId: userId,
      trialDays: trial.days,
      planId: businessData.planId,
      expiresAt: expirationDate.toISOString(),
    });

  } catch (error: any) {
    console.error('❌ [SETUP-BUSINESS] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao configurar negócio' },
      { status: 500 }
    );
  }
}
