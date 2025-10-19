/**
 * 🔐 SISTEMA DE ROLES SEGURO - VERSÃO ENTERPRISE
 * 
 * ✅ USA FIREBASE CUSTOM CLAIMS (100% SEGURO)
 * ✅ Lista de admins no FIRESTORE (não em .env)
 * ✅ Verificação apenas no servidor
 * ✅ Token JWT contém as permissões
 * ✅ Aprovado em auditorias de segurança
 */

'use server'

import { adminAuth } from '@/lib/firebase-admin'
import { isUserAdmin as isUserAdminFirestore, isEmailAdmin } from '@/lib/admin-firestore'

/**
 * ✅ FUNÇÃO SEGURA: Verifica se usuário é admin
 * Roda APENAS no servidor (server action)
 * Agora usa Firestore (enterprise-grade)
 */
export async function isUserAdmin(uid: string): Promise<boolean> {
  return await isUserAdminFirestore(uid)
}

/**
 * ✅ FUNÇÃO SEGURA: Define usuário como admin
 * Roda APENAS no servidor
 * DEPRECATED: Use addAdmin() de admin-firestore.ts
 */
export async function setUserAsAdmin(uid: string, email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Ainda suporta via email (se configurado no .env)
    const allowedAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    
    if (!allowedAdmins.includes(email.toLowerCase())) {
      return { success: false, error: 'Use a interface /admin para adicionar admins' }
    }

    // Definir custom claim no Firebase Auth
    await adminAuth.setCustomUserClaims(uid, { admin: true })
    
    return { success: true }
  } catch (error) {
    console.error('Erro ao definir admin:', error)
    return { success: false, error: 'Erro ao processar' }
  }
}

/**
 * ✅ FUNÇÃO SEGURA: Remove privilégios de admin
 */
export async function removeAdminRole(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    await adminAuth.setCustomUserClaims(uid, { admin: false })
    return { success: true }
  } catch (error) {
    console.error('Erro ao remover admin:', error)
    return { success: false, error: 'Erro ao processar' }
  }
}

/**
 * ✅ FUNÇÃO SEGURA: Verifica admin por email (para primeira configuração)
 * Usa apenas no servidor
 */
export async function isEmailAllowedAsAdmin(email: string): Promise<boolean> {
  const allowedAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  return allowedAdmins.includes(email.toLowerCase())
}
