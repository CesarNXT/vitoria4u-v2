'use client'

import { useEffect } from 'react'
import { useFirebase } from '@/firebase'
import { useToast } from '@/hooks/use-toast'
import { doc, onSnapshot } from 'firebase/firestore'

/**
 * Monitora a saúde da conexão com o Firestore
 * Se detectar falhas consecutivas, sugere reload
 */
export function FirestoreConnectionMonitor() {
  const { firestore, user } = useFirebase()
  const { toast } = useToast()

  useEffect(() => {
    // Only monitor if user is fully authenticated
    if (!firestore || !user?.uid) return

    let errorCount = 0
    let lastErrorTime = 0
    const ERROR_THRESHOLD = 3 // 3 erros em sequência
    const ERROR_WINDOW = 5000 // dentro de 5 segundos

    // Use a collection the user has access to instead of _monitor
    // This uses the user's own business document which they have permission to read
    const monitorRef = doc(firestore, 'negocios', user.uid)
    
    const unsubscribe = onSnapshot(
      monitorRef,
      () => {
        // Conexão OK - reset contador
        if (errorCount > 0) {
          console.log('✅ Conexão Firestore restaurada')
          errorCount = 0
        }
      },
      (error) => {
        const now = Date.now()
        
        // Se erros estão próximos no tempo, incrementa contador
        if (now - lastErrorTime < ERROR_WINDOW) {
          errorCount++
        } else {
          errorCount = 1 // Reset se passou muito tempo
        }
        
        lastErrorTime = now
        
        console.error('❌ Erro de conexão Firestore:', error.code, error.message)
        
        // Se atingiu o threshold, mostra alerta
        if (errorCount >= ERROR_THRESHOLD) {
          toast({
            variant: 'destructive',
            title: '🔴 Problema de Conexão Detectado',
            description: 'A conexão com o banco de dados falhou. Recarregue a página.',
            duration: 10000,
          })
          
          // Sugere reload automático após 3 segundos
          setTimeout(() => {
            if (confirm('Deseja recarregar a página agora para restaurar a conexão?')) {
              window.location.reload()
            }
          }, 3000)
          
          errorCount = 0 // Reset para não ficar mostrando infinitamente
        }
      }
    )

    return () => unsubscribe()
  }, [firestore, user, toast])

  return null // Componente invisível
}
