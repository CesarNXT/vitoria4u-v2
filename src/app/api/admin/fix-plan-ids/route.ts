import { NextResponse } from 'next/server';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-server';

export async function POST(request: Request) {
  try {
    console.log('Iniciando correção dos planIds...');
    
    // 1. Buscar todos os planos para criar um mapeamento
    const plansRef = collection(firestore, 'planos');
    const plansSnapshot = await getDocs(plansRef);
    
    const planMapping: Record<string, string> = {}; // mercadoPagoId -> planName
    
    plansSnapshot.forEach(docSnapshot => {
      const planData = docSnapshot.data();
      if (planData.mercadoPagoId) {
        planMapping[planData.mercadoPagoId] = planData.name;
      }
      // Também mapear o ID do documento para o nome
      planMapping[docSnapshot.id] = planData.name;
    });
    
    console.log('Mapeamento de planos criado:', planMapping);
    
    // 2. Buscar todos os negócios
    const businessesRef = collection(firestore, 'negocios');
    const businessesSnapshot = await getDocs(businessesRef);
    
    let updatedCount = 0;
    let totalCount = 0;
    const updates: Array<{userId: string, oldPlanId: string, newPlanId: string}> = [];
    
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
        
        updates.push({
          userId: businessDoc.id,
          oldPlanId: currentPlanId,
          newPlanId: correctPlanName
        });
        
        updatedCount++;
      }
    }
    
    console.log(`Correção concluída! ${updatedCount} de ${totalCount} usuários foram atualizados.`);
    
    return NextResponse.json({
      success: true,
      message: `Correção concluída! ${updatedCount} de ${totalCount} usuários foram atualizados.`,
      updates,
      planMapping
    });
    
  } catch (error) {
    console.error('Erro durante a correção:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro durante a correção dos planIds',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
