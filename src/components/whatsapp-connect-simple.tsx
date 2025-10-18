'use client'

/**
 * 🔌 COMPONENTE DE CONEXÃO WHATSAPP - VERSÃO SIMPLIFICADA
 * 
 * FLUXO SIMPLES:
 * 1. Usuário clica "Conectar"
 * 2. Sistema faz requisições HTTPS
 * 3. Mostra PairCode
 * 4. Webhook atualiza quando conectar
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Smartphone, AlertCircle, Trash2, Check, Copy } from 'lucide-react'
import { WhatsAppAPI, deleteOldInstances } from '@/lib/whatsapp-api-simple'

interface WhatsAppConnectSimpleProps {
  instanceId: string
  businessPhone: string
  isConnected: boolean
  instanceToken?: string
  onStatusChange: (connected: boolean, instanceToken?: string) => void
}

export function WhatsAppConnectSimple({ 
  instanceId,
  businessPhone,
  isConnected,
  instanceToken,
  onStatusChange
}: WhatsAppConnectSimpleProps) {
  
  const [showDialog, setShowDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // ==========================================
  // FORMATAR TELEFONE
  // ==========================================
  
  const formatPhone = (phone: string): string => {
    let clean = phone.replace(/\D/g, '')
    
    console.log('📞 Telefone original:', phone)
    console.log('📞 Telefone limpo:', clean)
    
    // Se tem 13 dígitos, remover o 9 extra (5º dígito)
    // Exemplo: 5581999887766 (13) -> 558199887766 (12)
    if (clean.length === 13) {
      clean = clean.substring(0, 4) + clean.substring(5)
      console.log('📞 Removido 9 extra')
    }
    
    // Garantir código do país (55)
    if (clean.length === 11 && !clean.startsWith('55')) {
      clean = '55' + clean
      console.log('📞 Adicionado código 55')
    }
    
    console.log('📞 Telefone final:', clean, `(${clean.length} dígitos)`)
    
    if (clean.length !== 12) {
      throw new Error(`Telefone inválido: ${clean.length} dígitos (esperado: 12)`)
    }
    
    return clean
  }

  // ==========================================
  // CONECTAR
  // ==========================================
  
  const handleConnect = async () => {
    setError(null)
    setIsLoading(true)
    setPairCode(null)
    setQrCode(null)

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 INICIANDO CONEXÃO WHATSAPP')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      // 1. Formatar telefone
      const phone = formatPhone(businessPhone)
      
      // 2. Deletar instâncias antigas
      console.log('🗑️ Verificando instâncias antigas...')
      await deleteOldInstances(instanceId)
      
      // 3. Criar nova API instance
      const api = new WhatsAppAPI(instanceId)
      
      // 4. Criar instância
      console.log('🔧 Criando instância...')
      const token = await api.createInstance('Vitoria4U Web')
      
      // Salvar token no Firestore
      await onStatusChange(false, token)
      
      // 5. Aguardar instância inicializar
      console.log('⏳ Aguardando inicialização...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 6. Conectar com telefone
      console.log('📱 Solicitando PairCode...')
      const result = await api.connectWithPhone(phone)
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao gerar código')
      }
      
      // 7. Configurar webhook
      const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`
      console.log('🔔 Configurando webhook:', webhookUrl)
      await api.setupWebhook(webhookUrl)
      
      // 8. Mostrar código
      if (result.pairCode) {
        setPairCode(result.pairCode)
        console.log('✅ PairCode:', result.pairCode)
      } else if (result.qrCode) {
        setQrCode(result.qrCode)
        console.log('✅ QRCode gerado')
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('✅ AGUARDANDO USUÁRIO CONECTAR...')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      // 9. Timeout: se não conectar em 90s, deletar instância
      setTimeout(async () => {
        // Verificar se conectou
        try {
          const status = await api.checkStatus()
          if (!status.connected) {
            console.warn('⚠️ Timeout: não conectou em 90s')
            await api.deleteInstance()
            setError('Tempo esgotado. Tente novamente.')
            setIsLoading(false)
          }
        } catch (err) {
          console.warn('⚠️ Erro ao verificar timeout')
        }
      }, 90000) // 90 segundos
      
    } catch (err: any) {
      console.error('❌ ERRO:', err.message)
      setError(err.message || 'Erro ao conectar')
      setIsLoading(false)
    }
  }

  // ==========================================
  // DESCONECTAR
  // ==========================================
  
  const handleDisconnect = async () => {
    if (!confirm('Desconectar WhatsApp? A instância será deletada.')) {
      return
    }

    if (!instanceToken) {
      setError('Token da instância não encontrado')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const api = new WhatsAppAPI(instanceId, instanceToken)
      await api.deleteInstance()
      
      console.log('✅ Desconectado com sucesso')
      onStatusChange(false)
      setShowDialog(false)
      
    } catch (err: any) {
      console.error('❌ Erro ao desconectar:', err.message)
      
      // Se erro 401 ou 500, provavelmente já foi deletado
      if (err.message.includes('401') || err.message.includes('500')) {
        console.warn('⚠️ Instância já foi deletada')
        onStatusChange(false)
        setShowDialog(false)
      } else {
        setError(err.message || 'Erro ao desconectar')
      }
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
    setPairCode(null)
    setQrCode(null)
    
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
              Digite o código no seu WhatsApp
            </DialogDescription>
          </DialogHeader>

          {/* ERRO */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
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

                {/* Aguardando */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Aguardando conexão... (90s)</span>
                </div>
              </div>
            )}

            {/* QRCODE */}
            {qrCode && !pairCode && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  Escaneie o QR Code:
                </div>
                
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-green-500 flex items-center justify-center">
                  <img 
                    src={qrCode} 
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64 object-contain"
                  />
                </div>

                <Alert>
                  <AlertDescription className="text-xs">
                    <ol className="ml-4 list-decimal space-y-1">
                      <li>Abra WhatsApp no celular</li>
                      <li>Menu → Aparelhos conectados</li>
                      <li>Toque em "Conectar aparelho"</li>
                      <li>Aponte a câmera para o QR Code</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* LOADING */}
            {!pairCode && !qrCode && !error && (
              <div className="flex flex-col items-center py-8 space-y-3">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Gerando código de conexão...
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
