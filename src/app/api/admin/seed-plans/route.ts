import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; // USA O SDK ADMIN
import type { Plano } from '@/lib/types';

// Define a estrutura dos planos a serem criados
const plansToCreate: Omit<Plano, 'id'>[] = [
  {
    name: 'Básico',
    description: 'Funcionalidades essenciais para o seu negócio.',
    price: 89.90,
    durationInDays: 30,
    status: 'Ativo',
    features: ['lembrete_24h', 'lembrete_2h', 'feedback_pos_atendimento', 'notificacao_gestor_agendamento'],
    isFeatured: false,
  },
  {
    name: 'Profissional',
    description: 'Mais poder e automações para escalar seu atendimento.',
    price: 149.90,
    durationInDays: 30,
    status: 'Ativo',
    features: ['lembrete_24h', 'lembrete_2h', 'feedback_pos_atendimento', 'lembrete_profissional', 'disparo_de_mensagens', 'notificacao_gestor_agendamento'],
    isFeatured: true,
  },
  {
    name: 'Premium',
    description: 'Acesso total a todas as funcionalidades da plataforma.',
    price: 179.90,
    durationInDays: 30,
    status: 'Ativo',
    features: ['lembrete_24h', 'lembrete_2h', 'feedback_pos_atendimento', 'lembrete_aniversario', 'lembrete_profissional', 'disparo_de_mensagens', 'retorno_manutencao', 'notificacao_gestor_agendamento', 'atendimento_whatsapp_ia', 'atendimento_manual_ou_automatizado'],
    isFeatured: false,
  },
  {
    name: 'Plano Expirado',
    description: 'Funcionalidades disponíveis para contas com assinatura expirada.',
    price: 0,
    durationInDays: 0,
    status: 'Ativo',
    features: ['notificacao_gestor_agendamento'],
    isFeatured: false,
  },
];

// Esta função só pode ser chamada via GET para evitar execuções acidentais
export async function GET() {
  try {
    console.log('Iniciando a criação de planos via API com permissões de Admin...');
    const plansRef = adminDb.collection('planos');
    const batch = adminDb.batch();

    // Define IDs fixos para os planos
    const planIds = ['plano_basico', 'plano_profissional', 'plano_premium', 'plano_expirado'];

    plansToCreate.forEach((plan, index) => {
      const docRef = plansRef.doc(planIds[index]);
      batch.set(docRef, plan);
      console.log(`- Adicionando plano '${plan.name}' ao batch.`);
    });

    await batch.commit();
    console.log('✅ Sucesso! Todos os planos foram criados no Firestore.');

    return NextResponse.json({ 
      message: 'Planos criados com sucesso!',
      plans: plansToCreate.map((p, i) => ({ id: planIds[i], ...p }))
    });

  } catch (error) {
    console.error('❌ Erro ao criar planos:', error);
    return NextResponse.json({ error: 'Falha ao criar planos.' }, { status: 500 });
  }
}
