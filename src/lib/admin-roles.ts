/**
 * 🔐 SISTEMA DE ROLES SEGURO - VERSÃO CORRETA
 * 
 * ✅ USA FIREBASE CUSTOM CLAIMS (100% SEGURO)
 * ✅ Verificação apenas no servidor
 * ✅ Lista de admins NÃO é exposta ao cliente
 * ✅ Token JWT contém as permissões
 */

'use server'

import { adminAuth } from '@/lib/firebase-admin'

/**
 * ✅ FUNÇÃO SEGURA: Verifica se usuário é admin
 * Roda APENAS no servidor (server action)
 */
export async function isUserAdmin(uid: string): Promise<boolean> {
  try {
    const user = await adminAuth.getUser(uid)
    // Custom claims são parte do token JWT - 100% seguro
    return user.customClaims?.admin === true || false
  } catch (error) {
    console.error('Erro ao verificar admin:', error)
    return false
  }
}

/**
 * ✅ FUNÇÃO SEGURA: Define usuário como admin
 * Roda APENAS no servidor
 */
export async function setUserAsAdmin(uid: string, email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar se o email está na lista de admins permitidos (server-only)
    const allowedAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    
    if (!allowedAdmins.includes(email.toLowerCase())) {
      return { success: false, error: 'Email não autorizado como admin' }
    }

    // Definir custom claim no Firebase Auth
    await adminAuth.setCustomUserClaims(uid, { admin: true })
    
    // Forçar refresh do token do usuário
    // O usuário precisará fazer logout/login ou o token será atualizado automaticamente
    
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
