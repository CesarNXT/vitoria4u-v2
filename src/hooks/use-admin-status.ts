/**
 * 🔐 HOOK SEGURO: Verifica status de admin no cliente
 * 
 * ✅ Lê do token JWT (custom claims) - SEGURO
 * ✅ NÃO expõe lista de emails
 * ✅ Atualiza automaticamente quando token muda
 */

'use client'

import { useEffect, useState } from 'react'
import { useFirebase } from '@/firebase'

export function useAdminStatus() {
  const { user } = useFirebase()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      try {
        // Pegar token atualizado (contém custom claims)
        const idTokenResult = await user.getIdTokenResult()
        
        // Custom claim 'admin' está no token JWT - 100% seguro
        const adminClaim = idTokenResult.claims.admin === true
        
        setIsAdmin(adminClaim)
      } catch (error) {
        console.error('Erro ao verificar status admin:', error)
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminStatus()
  }, [user])

  return { isAdmin, isLoading }
}
