/**
 * 🧹 Limpa planos antigos/obsoletos do Firestore
 * Remove o plano_expirado que não é mais usado
 */

export async function cleanupOldPlans(firestore: any): Promise<void> {
  console.log('🧹 Limpando planos obsoletos...');
  
  try {
    const { doc, deleteDoc } = await import('firebase/firestore');
    
    // Deletar plano_expirado (não usado mais)
    const oldPlanRef = doc(firestore, 'planos', 'plano_expirado');
    await deleteDoc(oldPlanRef);
    
    console.log('✅ Plano "plano_expirado" removido com sucesso!');
  } catch (error: any) {
    // Pode ser que já tenha sido deletado
    if (error.code === 'not-found') {
      console.log('ℹ️ Plano "plano_expirado" já foi removido anteriormente.');
    } else {
      console.log('⚠️ Erro ao remover plano obsoleto (pode já ter sido removido):', error.message);
    }
  }
}
