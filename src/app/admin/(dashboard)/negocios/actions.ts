'use server'

import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-admin-utils';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * ✅ Atualiza negócio (SERVER-SIDE com permissões de admin)
 */
export async function updateBusiness(
  businessId: string, 
  updates: { planId?: string; access_expires_at?: Date },
  userEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔧 [ADMIN UPDATE] Iniciando update:', { businessId, userEmail, updates });
    
    // Verificar se é admin
    await requireAdmin(userEmail);
    console.log('✅ [ADMIN UPDATE] Usuário autorizado como admin');

    // Verificar se negócio existe
    const businessRef = adminDb.collection('negocios').doc(businessId);
    const businessDoc = await businessRef.get();
    
    if (!businessDoc.exists) {
      throw new Error('Negócio não encontrado');
    }
    
    console.log('✅ [ADMIN UPDATE] Negócio encontrado:', businessDoc.data()?.nome);

    // Preparar dados para update
    const updateData: any = {
      updatedAt: Timestamp.now(),
      lastModifiedBy: userEmail,
    };

    if (updates.planId) {
      updateData.planId = updates.planId;
      console.log('📝 [ADMIN UPDATE] Atualizando planId:', updates.planId);
    }

    if (updates.access_expires_at) {
      // Converter Date para Timestamp do Firestore
      updateData.access_expires_at = Timestamp.fromDate(updates.access_expires_at);
      console.log('📝 [ADMIN UPDATE] Atualizando access_expires_at:', updates.access_expires_at);
    }

    // Atualizar no Firestore usando Admin SDK
    await businessRef.update(updateData);
    
    console.log('✅ [ADMIN UPDATE] Update realizado com sucesso!');
    
    // Verificar se foi realmente salvo
    const updatedDoc = await businessRef.get();
    const savedData = updatedDoc.data();
    console.log('✅ [ADMIN UPDATE] Dados salvos confirmados:', {
      planId: savedData?.planId,
      access_expires_at: savedData?.access_expires_at,
    });

    return { success: true };
  } catch (error: any) {
    console.error('❌ [ADMIN UPDATE] Erro ao atualizar negócio:', error);
    return { 
      success: false, 
      error: error.message || 'Erro ao atualizar negócio' 
    };
  }
}
