/**
 * Script para criar/atualizar o plano gratuito no Firestore
 * Execute: node scripts/seed-plano-gratis.js
 * 
 * IMPORTANTE: Este plano NUNCA deve ser deletado!
 * É o plano padrão para todos os usuários (sistema gratuito)
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const planoGratis = {
  id: 'plano_gratis',
  name: 'Gratuito',
  description: 'Sistema de agendamento gratuito para sempre! Apenas automações são pagas.',
  price: 0,
  oldPrice: null,
  durationInDays: 0, // Nunca expira
  features: [], // Sem features de automação
  isFeatured: false,
  status: 'Ativo',
  // Funcionalidades disponíveis no plano gratuito:
  // ✅ Agendamento manual (interface web)
  // ✅ Cadastro de clientes
  // ✅ Cadastro de serviços
  // ✅ Cadastro de profissionais
  // ✅ Visualização de agenda
  // ✅ Gerenciamento básico
  
  // ❌ BLOQUEADAS (features pagas):
  // - lembrete_24h
  // - lembrete_2h
  // - feedback_pos_atendimento
  // - lembrete_aniversario
  // - lembrete_profissional
  // - disparo_de_mensagens
  // - retorno_manutencao
  // - notificacao_gestor_agendamento
  // - atendimento_whatsapp_ia
  // - atendimento_manual_ou_automatizado
};

async function seedPlanoGratis() {
  try {
    console.log('🌱 Criando/atualizando plano gratuito...');
    
    const planoRef = db.collection('planos').doc('plano_gratis');
    await planoRef.set(planoGratis, { merge: true });
    
    console.log('✅ Plano gratuito criado/atualizado com sucesso!');
    console.log('📝 Detalhes:', planoGratis);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar plano gratuito:', error);
    process.exit(1);
  }
}

seedPlanoGratis();
