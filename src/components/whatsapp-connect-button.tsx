'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Smartphone, QrCode, AlertCircle, Check, Copy } from 'lucide-react'
import { WhatsAppAPIClient } from '@/lib/whatsapp-api'
import { WhatsAppTutorial } from '@/app/(dashboard)/configuracoes/whatsapp-tutorial'

interface WhatsAppConnectButtonProps {
  instanceId: string
  isConnected: boolean
  businessName: string
  businessPhone: string
  instanceToken?: string // Token da instância salvo no banco
  onStatusChange: (connected: boolean, instanceToken?: string) => void
}

export function WhatsAppConnectButton({ 
  instanceId, 
  isConnected,
  businessName,
  businessPhone,
  instanceToken,
  onStatusChange 
}: WhatsAppConnectButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [connectionMethod, setConnectionMethod] = useState<'paircode' | 'qrcode' | null>(null)
  const [showMethodChoice, setShowMethodChoice] = useState(false)

  // Fechar modal automaticamente quando conectar (webhook atualiza isConnected)
  useEffect(() => {
    if (isConnected && showDialog) {
      // Enviar mensagem de confirmação
      sendConnectionSuccessMessage()
      
      setShowDialog(false)
      setIsLoading(false)
      // Modal fechado automaticamente
    }
  }, [isConnected, showDialog])

  const sendConnectionSuccessMessage = async () => {
    try {
      // Token do sistema (sempre conectado)
      const SYSTEM_TOKEN = 'b2e97825-2d28-4646-ae38-3357fcbf0e20'
      const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com'
      
      // Formatar telefone
      const cleanPhone = businessPhone.replace(/\D/g, '')
      
      const response = await fetch(`${API_BASE}/send/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': SYSTEM_TOKEN,
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: '✅ WhatsApp Conectado ✅',
        }),
      })

      if (!response.ok) {
        // Silencioso - não é crítico
      }
    } catch (err) {
      // Silencioso - não é crítico
    }
  }

  // Countdown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setCooldownSeconds(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [cooldownSeconds])

  // Timeout: se não conectar em 90s, deleta instância
  const waitAndCheck = async (client: WhatsAppAPIClient) => {
    // Aguardar 90 segundos
    await new Promise(resolve => setTimeout(resolve, 90000))
    
    try {
      // Buscar todas as instâncias via API route (evita CORS)
      const response = await fetch('/api/whatsapp/instances')
      
      if (!response.ok) return
      
      const instances = await response.json()
      
      // Filtrar pela instância atual
      const myInstance = instances.find((inst: any) => inst.name === instanceId)
      
      if (!myInstance) return
      
      // Se NÃO conectou em 90s, deletar
      if (myInstance.status !== 'connected') {
        try {
          await client.deleteInstance()
        } catch (deleteErr: any) {
          // Silencioso
        }
        setError('Tempo esgotado. Tente conectar novamente.')
        setIsLoading(false)
      }
      // Se já conectou, o webhook já atualizou!
    } catch (err: any) {
      // Silencioso
    }
  }

  const handleTutorialComplete = () => {
    setShowTutorial(false)
    setShowMethodChoice(true) // Mostrar escolha de método
  }

  const handleTutorialSkip = () => {
    setShowTutorial(false)
    setShowMethodChoice(true) // Mostrar escolha de método
  }

  const handleMethodChoice = (method: 'paircode' | 'qrcode') => {
    setConnectionMethod(method)
    setShowMethodChoice(false)
    setShowDialog(true)
    if (cooldownSeconds === 0) {
      setRetryCount(0)
      startConnection(0, method)
    } else {
      startConnection(0, method)
    }
  }

  const handleRetryAfterCooldown = () => {
    setError(null)
    setCooldownSeconds(0)
    setRetryCount(0)
    startConnection(0)
  }

  const copyPairCode = async () => {
    if (!pairCode) return
    
    try {
      await navigator.clipboard.writeText(pairCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Silencioso - fallback automático
    }
  }

  const startConnection = async (attempt: number = 0, method: 'paircode' | 'qrcode' = connectionMethod || 'paircode') => {
    const MAX_RETRIES = 3
    
    setError(null)
    setIsLoading(true)
    setQrCode(null)
    setPairCode(null)
    setRetryCount(attempt)

    // Usar telefone do businessPhone (já vem do Firebase)
    let cleanPhone = businessPhone.replace(/\D/g, '')
    
    // Remover 9 extra se tiver 13 dígitos
    if (cleanPhone.length === 13) {
      cleanPhone = cleanPhone.substring(0, 4) + cleanPhone.substring(5)
    }
    
    // Garantir código do país
    if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }
    
    if (!cleanPhone || cleanPhone.length !== 12) {
      setError(`Telefone inválido (${cleanPhone.length} dígitos). Esperado: 12 dígitos.`)
      setIsLoading(false)
      return
    }

    let client: WhatsAppAPIClient | null = null
    let instanceCreated = false
    let instanceToken: string | null = null

    try {
      // Tentativa silenciosa
      
      client = new WhatsAppAPIClient(instanceId)
      
      // Verificar e deletar instâncias antigas
      try {
        const checkResponse = await fetch('/api/whatsapp/instances')
        if (checkResponse.ok) {
          const instances = await checkResponse.json()
          const existingInstances = instances.filter((inst: any) => inst.name === instanceId)
          
          if (existingInstances.length > 0) {
            for (const inst of existingInstances) {
              try {
                const tempClient = new WhatsAppAPIClient(instanceId)
                tempClient.setInstanceToken(inst.token)
                await tempClient.deleteInstance()
              } catch (delErr) {
                // Silencioso
              }
            }
          }
        }
      } catch (checkErr) {
        // Silencioso
      }
      
      // Criar instância
      const systemName = 'Vitoria4U Web'
      const createResponse = await client.createInstance(instanceId, systemName)
      
      // Pegar token retornado
      instanceToken = createResponse.token || createResponse.instance?.token
      
      if (!instanceToken) {
        throw new Error('Token da instância não retornado')
      }
      
      // Marca que instância foi criada (após confirmar token)
      instanceCreated = true
      
      // Salvar token no banco
      await onStatusChange(false, instanceToken)
      
      client.setInstanceToken(instanceToken)
      
      // Aguardar instância inicializar
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Desconectar instância para garantir estado limpo
      try {
        await client.disconnect()
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (disconnectErr: any) {
        // Silencioso - pode já estar desconectada
      }
      
      // 1. Verificar se já existe instância
      let instanceStatus: string = 'disconnected'
      let statusCheckAttempts = 0
      const MAX_STATUS_CHECKS = 3
      
      // 4. Verificar status da instância recém-criada
      while (statusCheckAttempts < MAX_STATUS_CHECKS) {
        try {
          const { status: statusCheck } = await client.getStatus()
          instanceStatus = statusCheck.instance?.status || 'disconnected'
          break
        } catch (statusErr: any) {
          statusCheckAttempts++
          
          // Se é erro de token não configurado, falhar imediatamente
          if (statusErr.message?.includes('Token da instância não configurado')) {
            throw new Error('Erro de configuração: Token da instância não está disponível.')
          }
          
          if (statusCheckAttempts < MAX_STATUS_CHECKS) {
            // Aguardar antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 2000))
          } else {
            // Se esgotou tentativas, pode ser que instância não existe
            throw new Error('Instância não está pronta. Tente novamente.')
          }
        }
      }
      
      // 5. Conectar instância com telefone (forçar Pair Code)
      // Só conectar se não estiver já conectando
      let connectResponse: any
      
      if (instanceStatus === 'connecting') {
        // Aguardando conexão
        await new Promise(resolve => setTimeout(resolve, 3000))
        const { status: latestStatus } = await client.getStatus()
        connectResponse = { 
          instance: latestStatus.instance,
          connected: latestStatus.connected,
          loggedIn: latestStatus.loggedIn,
          jid: latestStatus.jid
        }
      } else if (instanceStatus === 'disconnected') {
        // Conectar com método escolhido
        if (method === 'qrcode') {
          connectResponse = await client.connect() // Sem telefone = QR Code
        } else {
          connectResponse = await client.connect(cleanPhone) // Com telefone = Pair Code
        }
      } else {
        const { status } = await client.getStatus()
        connectResponse = {
          instance: status.instance,
          connected: status.connected,
          loggedIn: status.loggedIn,
          jid: status.jid
        }
      }
      
      // Solicitando conexão - extrair código baseado no método
      const paircode = connectResponse?.paircode || connectResponse?.pairCode || connectResponse?.code || connectResponse.instance?.paircode
      const qrcode = connectResponse?.qrcode || connectResponse.instance?.qrcode
      
      if (method === 'qrcode') {
        // QR Code esperado
        if (!qrcode || qrcode === '') {
          // Deletar instância e tentar de novo
          if (instanceCreated && client && instanceToken) {
            try {
              client.setInstanceToken(instanceToken)
              await client.deleteInstance()
            } catch {}
            instanceCreated = false
          }
          throw new Error('QR_CODE_EMPTY')
        }
        setQrCode(qrcode)
      } else {
        // Pair Code esperado
        if (!paircode || paircode === '') {
          // Deletar instância e tentar de novo
          if (instanceCreated && client && instanceToken) {
            try {
              client.setInstanceToken(instanceToken)
              await client.deleteInstance()
            } catch {}
            instanceCreated = false
          }
          throw new Error('PAIRCODE_EMPTY')
        }
        setPairCode(paircode)
      }
      
      // 6. Configurar webhook
      const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`
      await client.setWebhook(webhookUrl, ['messages'], ['wasSentByApi', 'isGroupYes'])
      
      // 9. Iniciar timeout (se não conectar em 90s, deleta)
      waitAndCheck(client)
      
      // Se chegou aqui, deu tudo certo - não deletar
      instanceCreated = false
      
    } catch (err: any) {
      // Tratar erro silenciosamente
      
      // Verificar tipo de erro
      const isPaircodeError = err.message === 'PAIRCODE_EMPTY' || err.message?.includes('Paircode')
      const isQRCodeError = err.message === 'QR_CODE_EMPTY'
      const is500Error = err.message?.includes('500')
      
      // Se erro 500, aguardar e tentar de novo
      if (is500Error && attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000))
        return startConnection(attempt + 1, method)
      }
      
      // Se Pair Code vazio, tentar de novo
      if (isPaircodeError && attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        return startConnection(attempt + 1, method)
      }
      
      // Se QR Code vazio, tentar de novo
      if (isQRCodeError && attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        return startConnection(attempt + 1, method)
      }
      
      // Se esgotou tentativas com Pair Code, oferecer QR Code
      if (attempt >= MAX_RETRIES - 1 && isPaircodeError && method === 'paircode') {
        setError('O código de pareamento falhou após 3 tentativas. Tente usar o QR Code (método mais confiável).')
        setIsLoading(false)
        setShowMethodChoice(true) // Mostrar escolha de método novamente
        return
      }
      
      // Erro geral
      if (is500Error || isPaircodeError || isQRCodeError) {
        setError('A Meta está com instabilidades no momento. Tente novamente em alguns minutos.')
        setCooldownSeconds(60)
      } else {
        setError(err.message || 'Erro ao conectar')
      }
      
      setIsLoading(false)
    } finally {
      // GARANTIR que sempre delete a instância se foi criada e não conectou
      if (instanceCreated && client && instanceToken) {
        try {
          client.setInstanceToken(instanceToken)
          await client.deleteInstance()
        } catch (deleteErr) {
          // Silencioso - mas tentou deletar
        }
      }
    }
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 4) return `${numbers.slice(0, 2)} (${numbers.slice(2)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4)}`
    return `${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`
  }

  if (isConnected) {
    return (
      <div className="w-full py-2 px-3 rounded-md bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 flex items-center gap-2">
        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span className="text-sm text-green-700 dark:text-green-300 truncate">
          WhatsApp Conectado
        </span>
      </div>
    )
  }

  return (
    <>
      <Button 
        onClick={() => setShowTutorial(true)} 
        className="w-full bg-green-600 hover:bg-green-700 text-xs sm:text-sm md:text-base px-3 py-2 h-auto whitespace-normal"
      >
        <Smartphone className="mr-2 h-4 w-4 flex-shrink-0" />
        <span className="break-words">Conectar WhatsApp</span>
      </Button>
      
      <WhatsAppTutorial
        open={showTutorial}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
        onCancel={() => setShowTutorial(false)}
      />

      {/* Dialog de escolha de método */}
      <Dialog open={showMethodChoice} onOpenChange={setShowMethodChoice}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-600" />
              Como deseja conectar?
            </DialogTitle>
            <DialogDescription>
              Escolha o método de conexão preferido
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={() => handleMethodChoice('paircode')}
              className="w-full h-auto py-4 flex-col gap-2"
              variant="outline"
            >
              <span className="text-lg font-semibold">📱 Código de Pareamento</span>
              <span className="text-xs text-muted-foreground">
                Receba um código de 8 dígitos no seu celular
              </span>
            </Button>
            <Button
              onClick={() => handleMethodChoice('qrcode')}
              className="w-full h-auto py-4 flex-col gap-2"
              variant="outline"
            >
              <span className="text-lg font-semibold">📷 QR Code</span>
              <span className="text-xs text-muted-foreground">
                Escaneie o código com a câmera do WhatsApp
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-600" />
              Conectar WhatsApp - {businessName}
            </DialogTitle>
            <DialogDescription>
              Aguarde enquanto preparamos sua conexão
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              
              {/* Botão tentar QR Code se Pair Code falhou */}
              {error.includes('QR Code') && connectionMethod === 'paircode' && (
                <Button
                  onClick={() => handleMethodChoice('qrcode')}
                  className="w-full"
                  variant="default"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Tentar com QR Code
                </Button>
              )}
              
              {cooldownSeconds > 0 && (
                <Button
                  onClick={handleRetryAfterCooldown}
                  disabled={cooldownSeconds > 0}
                  className="w-full"
                  variant="outline"
                >
                  {cooldownSeconds > 0 ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Tentar novamente em {cooldownSeconds}s
                    </>
                  ) : (
                    'Tentar novamente'
                  )}
                </Button>
              )}
            </div>
          )}

          <div className="space-y-4 pt-4">
            {/* Pair Code */}
            {pairCode && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Smartphone className="h-4 w-4" />
                  Digite o código no WhatsApp
                </div>
                
                <div className="space-y-3">
                  <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-lg border-2 border-green-500">
                    <p className="text-center text-4xl font-mono font-bold tracking-wider text-green-600 dark:text-green-400">
                      {pairCode}
                    </p>
                  </div>
                  
                  <Button
                    onClick={copyPairCode}
                    variant="outline"
                    className="w-full text-xs sm:text-sm h-auto py-2 whitespace-normal"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="break-words">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="break-words">Copiar Código</span>
                      </>
                    )}
                  </Button>
                </div>

                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <ol className="ml-4 list-decimal space-y-1">
                      <li>Abra WhatsApp no celular</li>
                      <li>Menu → Aparelhos conectados</li>
                      <li>Conectar com número</li>
                      <li>Digite: <strong>{pairCode}</strong></li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* QR Code */}
            {qrCode && !pairCode && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <QrCode className="h-4 w-4" />
                  Escaneie o QR Code
                </div>
                
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-green-500 flex items-center justify-center">
                  <img 
                    src={qrCode} 
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64 object-contain"
                  />
                </div>

                <Alert>
                  <QrCode className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <ol className="ml-4 list-decimal space-y-1">
                      <li>Abra WhatsApp no celular</li>
                      <li>Menu → Aparelhos conectados</li>
                      <li>Toque em "Conectar um aparelho"</li>
                      <li>Aponte a câmera para o QR Code</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Loading */}
            {!pairCode && !qrCode && !error && (
              <div className="flex flex-col items-center py-8 space-y-3">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {retryCount > 0 ? `Tentativa ${retryCount + 1}/3...` : 'Gerando código...'}
                </p>
              </div>
            )}

            {(pairCode || qrCode) && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Aguardando conexão...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
