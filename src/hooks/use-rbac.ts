/**
 * Hook para verificar permissões no cliente
 */

'use client'

import { useEffect, useState } from 'react'
import { useFirebase } from '@/firebase'

export function useRBAC() {
  const { user } = useFirebase()
  const [permissions, setPermissions] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadPermissions() {
      if (!user) {
        setPermissions([])
        setRoles([])
        setIsLoading(false)
        return
      }

      try {
        const token = await user.getIdTokenResult()
        
        // Buscar roles do Firestore
        const response = await fetch('/api/user/permissions', {
          headers: {
            'Authorization': `Bearer ${token.token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setPermissions(data.permissions || [])
          setRoles(data.roles || [])
        }
      } catch (error) {
        console.error('Erro ao carregar permissões:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPermissions()
  }, [user])

  const hasPermission = (permission: string) => {
    return permissions.includes('*') || permissions.includes(permission)
  }

  const hasRole = (role: string) => {
    return roles.includes(role)
  }

  const isAdmin = hasRole('super_admin') || hasRole('admin')

  return {
    permissions,
    roles,
    hasPermission,
    hasRole,
    isAdmin,
    isLoading
  }
}
