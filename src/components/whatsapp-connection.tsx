'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Smartphone, QrCode, Check, X, RefreshCw, AlertCircle } from 'lucide-react'
import { WhatsAppAPIClient, type WhatsAppStatus } from '@/lib/whatsapp-api'
import { cn } from '@/lib/utils'

interface WhatsAppConnectionProps {
  instanceId: string;
  token: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function WhatsAppConnection({ 
  instanceId, 
  token, 
  onConnected,
  onDisconnected 
}: WhatsAppConnectionProps) {
  const [client] = useState(() => new WhatsAppAPIClient(instanceId, token))
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionMode, setConnectionMode] = useState<'qr' | 'pair'>('pair')

  // Verificar status inicial
  useEffect(() => {
    checkStatus()
  }, [])

  // Polling de status durante conexão
  useEffect(() => {
    if (!isConnecting || status?.connected) return

    const interval = setInterval(async () => {
      await checkStatus()
    }, 2000)

    // Timeout após 5 minutos
    const timeout = setTimeout(() => {
      setIsConnecting(false)
      setError('Tempo limite excedido. Tente novamente.')
    }, 5 * 60 * 1000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [isConnecting, status?.connected])

  // Callback quando conectado
  useEffect(() => {
    if (status?.connected && isConnecting) {
      setIsConnecting(false)
      setQrCode(null)
      setPairCode(null)
      onConnected?.()
    }
  }, [status?.connected, isConnecting, onConnected])

  const checkStatus = async () => {
    try {
      const response = await client.getStatus()
      setStatus(response.status)
      
      // Atualizar QR code e Pair code se disponíveis
      if (response.instance.qrcode) {
        setQrCode(response.instance.qrcode)
      }
      if (response.instance.paircode) {
        setPairCode(response.instance.paircode)
      }
    } catch (err: any) {
      console.error('Erro ao verificar status:', err)
      setError(err.message)
    }
  }

  const handleConnect = async () => {
    if (!phone.trim()) {
      // Se não passar telefone, gera QR code
      setConnectionMode('qr')
    } else {
      setConnectionMode('pair')
    }

    setError(null)
    setIsConnecting(true)
    setQrCode(null)
    setPairCode(null)

    try {
      const response = await client.connect(phone || '')
      
      if (response.instance.qrcode) {
        setQrCode(response.instance.qrcode)
      }
      if (response.instance.paircode) {
        setPairCode(response.instance.paircode)
      }
    } catch (err: any) {
      console.error('Erro ao conectar:', err)
      setError(err.message)
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) {
      return
    }

    try {
      await client.disconnect()
      setStatus({ connected: false, loggedIn: false, jid: null })
      setQrCode(null)
      setPairCode(null)
      onDisconnected?.()
    } catch (err: any) {
      console.error('Erro ao desconectar:', err)
      setError(err.message)
    }
  }

  const formatPhoneNumber = (value: string) => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '')
    
    // Formato: 55 (11) 99999-9999
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 4) return `${numbers.slice(0, 2)} (${numbers.slice(2)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4)}`
    
    return `${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`
  }

  // Status conectado
  if (status?.connected) {
    return (
      <Card className="border-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            WhatsApp Conectado
          </CardTitle>
          <CardDescription>
            Sua conta está conectada e pronta para enviar mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.jid && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-sm font-medium">Número conectado:</p>
              <p className="text-lg font-mono">{status.jid}</p>
            </div>
          )}
          
          <Button 
            variant="destructive" 
            onClick={handleDisconnect}
            className="w-full"
          >
            <X className="mr-2 h-4 w-4" />
            Desconectar WhatsApp
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Processo de conexão
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Conectar WhatsApp
        </CardTitle>
        <CardDescription>
          Conecte sua conta WhatsApp para ativar as automações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isConnecting ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">
                Número de telefone (opcional)
              </Label>
              <Input
                id="phone"
                placeholder="55 (11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                disabled={isConnecting}
              />
              <p className="text-xs text-muted-foreground">
                💡 <strong>Com telefone:</strong> Receba um código para parear
                <br />
                💡 <strong>Sem telefone:</strong> Escaneie o QR code
              </p>
            </div>

            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Conectar WhatsApp
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QR Code */}
            {connectionMode === 'qr' && qrCode && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <QrCode className="h-4 w-4" />
                  Escaneie o QR Code
                </div>
                
                <div className="relative bg-white p-4 rounded-lg border-2 border-dashed">
                  <img 
                    src={qrCode} 
                    alt="QR Code WhatsApp" 
                    className="w-full max-w-xs mx-auto"
                  />
                </div>

                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    <ol className="text-sm space-y-1 ml-4 list-decimal">
                      <li>Abra o WhatsApp no celular</li>
                      <li>Toque em <strong>Mais opções</strong> ou <strong>Configurações</strong></li>
                      <li>Toque em <strong>Aparelhos conectados</strong></li>
                      <li>Toque em <strong>Conectar um aparelho</strong></li>
                      <li>Aponte o celular para essa tela para escanear o código</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Pair Code */}
            {connectionMode === 'pair' && pairCode && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Smartphone className="h-4 w-4" />
                  Digite o código no WhatsApp
                </div>
                
                <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-lg border-2 border-green-500">
                  <p className="text-center text-4xl font-mono font-bold tracking-wider text-green-600 dark:text-green-400">
                    {pairCode}
                  </p>
                </div>

                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    <ol className="text-sm space-y-1 ml-4 list-decimal">
                      <li>Abra o WhatsApp no celular <strong>{phone}</strong></li>
                      <li>Toque em <strong>Aparelhos conectados</strong></li>
                      <li>Toque em <strong>Conectar um aparelho</strong></li>
                      <li>Toque em <strong>Conectar com número de telefone</strong></li>
                      <li>Digite o código acima</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Loading state */}
            {!qrCode && !pairCode && (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Gerando código de conexão...
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={checkStatus}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setIsConnecting(false)
                  setQrCode(null)
                  setPairCode(null)
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Aguardando conexão...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
