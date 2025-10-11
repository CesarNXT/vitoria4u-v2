/**
 * Script para corrigir planIds que estão com IDs do MercadoPago em vez dos nomes dos planos
 * Execute este script uma vez para corrigir os dados existentes
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

// Configuração do Firebase (use as mesmas configurações do seu projeto)
const firebaseConfig = {
  // Adicione sua configuração do Firebase aqui
  // Você pode copiar do seu arquivo de configuração existente
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function fixPlanIds() {
  console.log('Iniciando correção dos planIds...');
  
  try {
    // 1. Buscar todos os planos para criar um mapeamento
    const plansRef = collection(firestore, 'planos');
    const plansSnapshot = await getDocs(plansRef);
    
    const planMapping: Record<string, string> = {}; // mercadoPagoId -> planName
    
    plansSnapshot.forEach(doc => {
      const planData = doc.data();
      if (planData.mercadoPagoId) {
        planMapping[planData.mercadoPagoId] = planData.name;
      }
      // Também mapear o ID do documento para o nome
      planMapping[doc.id] = planData.name;
    });
    
    console.log('Mapeamento de planos criado:', planMapping);
    
    // 2. Buscar todos os negócios
    const businessesRef = collection(firestore, 'negocios');
    const businessesSnapshot = await getDocs(businessesRef);
    
    let updatedCount = 0;
    let totalCount = 0;
    
    for (const businessDoc of businessesSnapshot.docs) {
      totalCount++;
      const businessData = businessDoc.data();
      const currentPlanId = businessData.planId;
      
      // Verificar se o planId atual é um ID do MercadoPago (não é um nome de plano)
      if (currentPlanId && planMapping[currentPlanId] && planMapping[currentPlanId] !== currentPlanId) {
        const correctPlanName = planMapping[currentPlanId];
        
        console.log(`Corrigindo usuário ${businessDoc.id}: ${currentPlanId} -> ${correctPlanName}`);
        
        await updateDoc(doc(firestore, 'negocios', businessDoc.id), {
          planId: correctPlanName
        });
        
        updatedCount++;
      }
    }
    
    console.log(`Correção concluída! ${updatedCount} de ${totalCount} usuários foram atualizados.`);
    
  } catch (error) {
    console.error('Erro durante a correção:', error);
  }
}

// Executar o script
fixPlanIds().then(() => {
  console.log('Script finalizado.');
  process.exit(0);
}).catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
