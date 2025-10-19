/**
 * 🏢 RBAC - Role-Based Access Control (Sistema Enterprise)
 * Como Netflix, Spotify, Stripe fazem
 */

'use server'

import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

// Tipos de roles disponíveis
export type Role = 'super_admin' | 'admin' | 'support' | 'viewer'

// Permissões específicas
export type Permission = 
  | 'manage_users'
  | 'manage_businesses'
  | 'manage_plans'
  | 'view_analytics'
  | 'impersonate'
  | 'manage_billing'
  | 'view_logs'
  | '*' // Super admin tem tudo

interface UserRole {
  uid: string
  email: string
  roles: Role[]
  permissions: Permission[]
  active: boolean
  createdAt: Date
  createdBy: string
  lastModifiedAt?: Date
  lastModifiedBy?: string
}

// Mapeamento de roles para permissões
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ['*'],
  admin: ['manage_users', 'manage_businesses', 'manage_plans', 'view_analytics', 'impersonate', 'manage_billing'],
  support: ['view_analytics', 'impersonate', 'view_logs'],
  viewer: ['view_analytics', 'view_logs']
}

/**
 * Verifica se usuário tem role específica
 */
export async function hasRole(uid: string, role: Role): Promise<boolean> {
  try {
    const userDoc = await adminDb.collection('user_roles').doc(uid).get()
    if (!userDoc.exists) return false
    
    const userData = userDoc.data() as UserRole
    return userData.active && userData.roles.includes(role)
  } catch (error) {
    logger.error('Erro ao verificar role:', error)
    return false
  }
}

/**
 * Verifica se usuário tem permissão específica
 */
export async function hasPermission(uid: string, permission: Permission): Promise<boolean> {
  try {
    const userDoc = await adminDb.collection('user_roles').doc(uid).get()
    if (!userDoc.exists) return false
    
    const userData = userDoc.data() as UserRole
    if (!userData.active) return false
    
    // Super admin tem tudo
    if (userData.permissions.includes('*')) return true
    
    return userData.permissions.includes(permission)
  } catch (error) {
    logger.error('Erro ao verificar permissão:', error)
    return false
  }
}

/**
 * Adiciona role a um usuário
 */
export async function assignRole(
  targetUid: string,
  role: Role,
  assignedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar se quem está atribuindo tem permissão
    const canManage = await hasPermission(assignedBy, 'manage_users')
    if (!canManage) {
      return { success: false, error: 'Sem permissão para gerenciar usuários' }
    }

    const user = await adminAuth.getUser(targetUid)
    const userRef = adminDb.collection('user_roles').doc(targetUid)
    const userDoc = await userRef.get()

    const permissions = ROLE_PERMISSIONS[role]
    
    if (userDoc.exists) {
      // Adicionar role existente
      const userData = userDoc.data() as UserRole
      const updatedRoles = [...new Set([...userData.roles, role])]
      const updatedPermissions = [...new Set([...userData.permissions, ...permissions])]
      
      await userRef.update({
        roles: updatedRoles,
        permissions: updatedPermissions,
        lastModifiedAt: new Date(),
        lastModifiedBy: assignedBy
      })
    } else {
      // Criar novo registro
      const newUserRole: UserRole = {
        uid: targetUid,
        email: user.email || '',
        roles: [role],
        permissions,
        active: true,
        createdAt: new Date(),
        createdBy: assignedBy
      }
      
      await userRef.set(newUserRole)
    }

    // Atualizar custom claims do Firebase
    const currentClaims = (await adminAuth.getUser(targetUid)).customClaims || {}
    await adminAuth.setCustomUserClaims(targetUid, {
      ...currentClaims,
      admin: true,
      role
    })

    logger.info(`Role ${role} atribuída ao usuário ${targetUid} por ${assignedBy}`)
    return { success: true }
    
  } catch (error: any) {
    logger.error('Erro ao atribuir role:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Remove role de um usuário
 */
export async function removeRole(
  targetUid: string,
  role: Role,
  removedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const canManage = await hasPermission(removedBy, 'manage_users')
    if (!canManage) {
      return { success: false, error: 'Sem permissão para gerenciar usuários' }
    }

    const userRef = adminDb.collection('user_roles').doc(targetUid)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return { success: false, error: 'Usuário não encontrado' }
    }

    const userData = userDoc.data() as UserRole
    const updatedRoles = userData.roles.filter(r => r !== role)
    
    // Recalcular permissões baseado nos roles restantes
    const updatedPermissions = updatedRoles.flatMap(r => ROLE_PERMISSIONS[r])
    
    await userRef.update({
      roles: updatedRoles,
      permissions: [...new Set(updatedPermissions)],
      lastModifiedAt: new Date(),
      lastModifiedBy: removedBy
    })

    // Se não tem mais roles, remover custom claim de admin
    if (updatedRoles.length === 0) {
      await adminAuth.setCustomUserClaims(targetUid, { admin: false })
    }

    logger.info(`Role ${role} removida do usuário ${targetUid} por ${removedBy}`)
    return { success: true }
    
  } catch (error: any) {
    logger.error('Erro ao remover role:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Lista todos os usuários com roles
 */
export async function listAdminUsers(): Promise<UserRole[]> {
  try {
    const snapshot = await adminDb.collection('user_roles')
      .where('active', '==', true)
      .get()
    
    return snapshot.docs.map(doc => doc.data() as UserRole)
  } catch (error) {
    logger.error('Erro ao listar usuários admin:', error)
    return []
  }
}

/**
 * Desativa usuário (não deleta, apenas desabilita)
 */
export async function deactivateUser(
  targetUid: string,
  deactivatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const canManage = await hasPermission(deactivatedBy, 'manage_users')
    if (!canManage) {
      return { success: false, error: 'Sem permissão' }
    }

    await adminDb.collection('user_roles').doc(targetUid).update({
      active: false,
      lastModifiedAt: new Date(),
      lastModifiedBy: deactivatedBy
    })

    // Remover custom claims
    await adminAuth.setCustomUserClaims(targetUid, { admin: false })

    logger.info(`Usuário ${targetUid} desativado por ${deactivatedBy}`)
    return { success: true }
    
  } catch (error: any) {
    logger.error('Erro ao desativar usuário:', error)
    return { success: false, error: error.message }
  }
}
