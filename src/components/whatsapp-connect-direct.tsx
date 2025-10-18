'use client'

/**
 * 🔌 WHATSAPP CONNECT - VERSÃO DIRETA (SEM N8N)
 * 
 * Usa Server Actions ao invés de N8N webhook
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Smartphone, AlertCircle, Trash2, Check, Copy, Info } from 'lucide-react'
import { connectWhatsAppAction, disconnectWhatsAppAction } from '@/app/(dashboard)/configuracoes/whatsapp-actions'

interface WhatsAppConnectDirectProps {
  businessId: string
  businessPhone: string
  isConnected: boolean
  instanceToken?: string
  onStatusChange?: () => void
}

export function WhatsAppConnectDirect({ 
  businessId,
  businessPhone,
  isConnected,
  instanceToken,
  onStatusChange
}: WhatsAppConnectDirectProps) {
  
  const [showDialog, setShowDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // ==========================================
  // CONECTAR
  // ==========================================
  
  const handleConnect = async () => {
    setError(null)
    setSuccess(null)
    setIsLoading(true)
    setPairCode(null)

    console.log('🚀 Iniciando conexão...')

    try {
      // Chamar Server Action
      const result = await connectWhatsAppAction({
        businessId,
        businessPhone: businessPhone.toString()
      })

      if (!result.success) {
        throw new Error(result.error || 'Erro ao conectar')
      }

      // Sucesso!
      setPairCode(result.pairCode || null)
      setSuccess(result.message || 'Código enviado via SMS')
      
      console.log('✅ PairCode:', result.pairCode)
      console.log('📱 SMS enviado para:', businessPhone)
      
    } catch (err: any) {
      console.error('❌ Erro:', err.message)
      setError(err.message || 'Erro ao conectar')
    } finally {
      setIsLoading(false)
    }
  }

  // ==========================================
  // DESCONECTAR
  // ==========================================
  
  const handleDisconnect = async () => {
    if (!confirm('Desconectar WhatsApp? A instância será removida.')) {
      return
    }

    if (!instanceToken) {
      setError('Token da instância não encontrado')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Chamar Server Action
      const result = await disconnectWhatsAppAction({
        businessId,
        instanceToken,
        businessPhone: businessPhone.toString()
      })

      if (!result.success) {
        throw new Error(result.error || 'Erro ao desconectar')
      }

      console.log('✅ Desconectado:', result.message)
      
      // Chamar callback
      if (onStatusChange) {
        onStatusChange()
      }
      
      setShowDialog(false)
      
    } catch (err: any) {
      console.error('❌ Erro:', err.message)
      setError(err.message || 'Erro ao desconectar')
    } finally {
      setIsLoading(false)
    }
  }

  // ==========================================
  // COPIAR PAIRCODE
  // ==========================================
  
  const copyPairCode = async () => {
    if (!pairCode) return
    
    try {
      await navigator.clipboard.writeText(pairCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.warn('Erro ao copiar:', err)
    }
  }

  // ==========================================
  // ABRIR DIALOG
  // ==========================================
  
  const openDialog = () => {
    setShowDialog(true)
    setError(null)
    setSuccess(null)
    setPairCode(null)
    
    // Iniciar conexão automaticamente
    handleConnect()
  }

  // ==========================================
  // RENDER
  // ==========================================

  // Se conectado, mostrar botão de desconectar
  if (isConnected) {
    return (
      <Button 
        variant="destructive" 
        onClick={handleDisconnect}
        disabled={isLoading || !instanceToken}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Desconectando...
          </>
        ) : (
          <>
            <Trash2 className="mr-2 h-4 w-4" />
            Desconectar WhatsApp
          </>
        )}
      </Button>
    )
  }

  // Se desconectado, mostrar botão de conectar
  return (
    <>
      <Button 
        onClick={openDialog} 
        className="w-full bg-green-600 hover:bg-green-700"
      >
        <Smartphone className="mr-2 h-4 w-4" />
        Conectar WhatsApp
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-600" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>
              {pairCode 
                ? 'Código enviado via SMS. Digite no WhatsApp ou copie abaixo:'
                : 'Enviando código de conexão...'}
            </DialogDescription>
          </DialogHeader>

          {/* ERRO */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* SUCESSO */}
          {success && !error && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 pt-4">
            
            {/* PAIRCODE */}
            {pairCode && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Smartphone className="h-4 w-4" />
                  Digite este código no WhatsApp:
                </div>
                
                {/* Código em destaque */}
                <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-lg border-2 border-green-500">
                  <p className="text-center text-5xl font-mono font-bold tracking-widest text-green-600 dark:text-green-400">
                    {pairCode}
                  </p>
                </div>
                
                {/* Botão copiar */}
                <Button
                  onClick={copyPairCode}
                  variant="outline"
                  className="w-full"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar Código
                    </>
                  )}
                </Button>

                {/* Instruções */}
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription className="text-xs space-y-1">
                    <p className="font-semibold">Como conectar:</p>
                    <ol className="ml-4 list-decimal space-y-1">
                      <li>Abra WhatsApp no celular</li>
                      <li>Vá em Menu (⋮) → Aparelhos conectados</li>
                      <li>Toque em "Conectar aparelho"</li>
                      <li>Escolha "Conectar com número"</li>
                      <li>Digite o código: <strong className="text-green-600">{pairCode}</strong></li>
                    </ol>
                  </AlertDescription>
                </Alert>

                {/* Info sobre SMS */}
                <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs text-blue-600">
                    <strong>📱 Código enviado via SMS</strong><br />
                    Você também recebeu o código no número: {businessPhone}
                  </AlertDescription>
                </Alert>

                {/* Aguardando */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Aguardando conexão... (60s)</span>
                </div>
                
                <div className="text-xs text-center text-muted-foreground">
                  O sistema verificará automaticamente quando você conectar.<br />
                  Você receberá um SMS de confirmação.
                </div>
              </div>
            )}

            {/* LOADING */}
            {!pairCode && !error && (
              <div className="flex flex-col items-center py-8 space-y-3">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Gerando código de conexão...
                </p>
                <p className="text-xs text-muted-foreground">
                  Um SMS será enviado para {businessPhone}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
