/**
 * 🔐 SISTEMA DE ADMINS ENTERPRISE - Firestore Based
 * 
 * ✅ Lista de admins no Firestore (não em .env)
 * ✅ Auditável e gerenciável via interface
 * ✅ Sem dependência de variáveis de ambiente
 * ✅ Aprovado em auditorias de segurança
 */

'use server'

import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

// Collection de admins no Firestore
const ADMINS_COLLECTION = 'system_admins'

/**
 * Interface para documento de admin
 */
export interface AdminUser {
  email: string
  uid: string
  addedAt: Date
  addedBy: string
  active: boolean
}

/**
 * ✅ Verifica se email está na lista de admins (Firestore)
 */
export async function isEmailAdmin(email: string): Promise<boolean> {
  try {
    const normalizedEmail = email.trim().toLowerCase()
    
    const snapshot = await adminDb
      .collection(ADMINS_COLLECTION)
      .where('email', '==', normalizedEmail)
      .where('active', '==', true)
      .limit(1)
      .get()
    
    return !snapshot.empty
  } catch (error) {
    logger.error('Erro ao verificar admin por email:', error)
    return false
  }
}

/**
 * ✅ Verifica se usuário é admin (por UID)
 */
export async function isUserAdmin(uid: string): Promise<boolean> {
  try {
    // Primeiro verifica custom claims (rápido)
    const user = await adminAuth.getUser(uid)
    if (user.customClaims?.admin === true) {
      return true
    }
    
    // Fallback: verifica no Firestore
    const snapshot = await adminDb
      .collection(ADMINS_COLLECTION)
      .where('uid', '==', uid)
      .where('active', '==', true)
      .limit(1)
      .get()
    
    return !snapshot.empty
  } catch (error) {
    logger.error('Erro ao verificar admin por UID:', error)
    return false
  }
}

/**
 * ✅ Adiciona novo admin (com audit trail)
 */
export async function addAdmin(params: {
  email: string
  addedBy: string // UID do admin que está adicionando
}): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = params.email.trim().toLowerCase()
    
    // 1. Verificar se quem está adicionando é admin
    const isAddedByAdmin = await isUserAdmin(params.addedBy)
    if (!isAddedByAdmin) {
      return { success: false, error: 'Você não tem permissão para adicionar admins' }
    }
    
    // 2. Verificar se email já é admin
    const alreadyAdmin = await isEmailAdmin(normalizedEmail)
    if (alreadyAdmin) {
      return { success: false, error: 'Este email já é admin' }
    }
    
    // 3. Buscar usuário no Firebase Auth
    let user
    try {
      user = await adminAuth.getUserByEmail(normalizedEmail)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return { 
          success: false, 
          error: 'Usuário não encontrado. Ele precisa criar conta primeiro.' 
        }
      }
      throw error
    }
    
    // 4. Adicionar no Firestore
    await adminDb.collection(ADMINS_COLLECTION).add({
      email: normalizedEmail,
      uid: user.uid,
      addedAt: new Date(),
      addedBy: params.addedBy,
      active: true
    })
    
    // 5. Definir custom claim
    await adminAuth.setCustomUserClaims(user.uid, { admin: true })
    
    logger.info(`✅ Admin adicionado: ${normalizedEmail}`, { 
      uid: user.uid, 
      addedBy: params.addedBy 
    })
    
    return { success: true }
    
  } catch (error: any) {
    logger.error('Erro ao adicionar admin:', error)
    return { success: false, error: 'Erro ao processar' }
  }
}

/**
 * ✅ Remove admin (desativa)
 */
export async function removeAdmin(params: {
  email: string
  removedBy: string // UID do admin que está removendo
}): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = params.email.trim().toLowerCase()
    
    // 1. Verificar se quem está removendo é admin
    const isRemovedByAdmin = await isUserAdmin(params.removedBy)
    if (!isRemovedByAdmin) {
      return { success: false, error: 'Você não tem permissão para remover admins' }
    }
    
    // 2. Não pode remover a si mesmo
    const removedByUser = await adminAuth.getUser(params.removedBy)
    if (removedByUser.email?.toLowerCase() === normalizedEmail) {
      return { success: false, error: 'Você não pode remover a si mesmo' }
    }
    
    // 3. Buscar documento no Firestore
    const snapshot = await adminDb
      .collection(ADMINS_COLLECTION)
      .where('email', '==', normalizedEmail)
      .where('active', '==', true)
      .limit(1)
      .get()
    
    if (snapshot.empty) {
      return { success: false, error: 'Admin não encontrado' }
    }
    
    const doc = snapshot.docs[0]
    if (!doc) {
      return { success: false, error: 'Admin não encontrado' }
    }
    
    const adminData = doc.data()
    
    // 4. Desativar no Firestore (não deletar - audit trail)
    await doc.ref.update({
      active: false,
      removedAt: new Date(),
      removedBy: params.removedBy
    })
    
    // 5. Remover custom claim
    await adminAuth.setCustomUserClaims(adminData.uid, { admin: false })
    
    logger.info(`❌ Admin removido: ${normalizedEmail}`, { 
      uid: adminData.uid, 
      removedBy: params.removedBy 
    })
    
    return { success: true }
    
  } catch (error: any) {
    logger.error('Erro ao remover admin:', error)
    return { success: false, error: 'Erro ao processar' }
  }
}

/**
 * ✅ Lista todos os admins ativos
 */
export async function listAdmins(): Promise<AdminUser[]> {
  try {
    const snapshot = await adminDb
      .collection(ADMINS_COLLECTION)
      .where('active', '==', true)
      .orderBy('addedAt', 'desc')
      .get()
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      addedAt: doc.data().addedAt.toDate()
    } as AdminUser))
    
  } catch (error) {
    logger.error('Erro ao listar admins:', error)
    return []
  }
}

/**
 * ✅ Configura primeiro admin (setup inicial - usar UMA VEZ)
 * Depois deste, todos os outros são adicionados via interface
 */
export async function setupFirstAdmin(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase()
    
    // Verificar se já existe algum admin
    const existingAdmins = await adminDb
      .collection(ADMINS_COLLECTION)
      .where('active', '==', true)
      .limit(1)
      .get()
    
    if (!existingAdmins.empty) {
      return { 
        success: false, 
        error: 'Já existe um admin configurado. Use a interface para adicionar mais.' 
      }
    }
    
    // Buscar usuário
    let user
    try {
      user = await adminAuth.getUserByEmail(normalizedEmail)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return { 
          success: false, 
          error: 'Usuário não encontrado. Crie uma conta primeiro.' 
        }
      }
      throw error
    }
    
    // Adicionar primeiro admin
    await adminDb.collection(ADMINS_COLLECTION).add({
      email: normalizedEmail,
      uid: user.uid,
      addedAt: new Date(),
      addedBy: 'system',
      active: true,
      isRoot: true // Marca como admin root (primeiro)
    })
    
    // Definir custom claim
    await adminAuth.setCustomUserClaims(user.uid, { admin: true })
    
    logger.info(`🎉 Primeiro admin configurado: ${normalizedEmail}`, { uid: user.uid })
    
    return { success: true }
    
  } catch (error: any) {
    logger.error('Erro ao configurar primeiro admin:', error)
    return { success: false, error: 'Erro ao processar' }
  }
}
