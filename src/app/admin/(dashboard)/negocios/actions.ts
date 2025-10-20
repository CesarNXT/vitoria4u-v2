'use server'

import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/server-admin-utils';
import { getAuth } from 'firebase/auth';

/**
 * ✅ Atualiza negócio (SERVER-SIDE com permissões de admin)
 */
export async function updateBusiness(
  businessId: string, 
  updates: { planId?: string; access_expires_at?: Date },
  userEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar se é admin
    await requireAdmin(userEmail);

    // Preparar dados para update
    const updateData: any = {};

    if (updates.planId) {
      updateData.planId = updates.planId;
    }

    if (updates.access_expires_at) {
      updateData.access_expires_at = updates.access_expires_at;
    }

    // Atualizar no Firestore usando Admin SDK
    await adminDb
      .collection('negocios')
      .doc(businessId)
      .update(updateData);

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao atualizar negócio:', error);
    return { 
      success: false, 
      error: error.message || 'Erro ao atualizar negócio' 
    };
  }
}
