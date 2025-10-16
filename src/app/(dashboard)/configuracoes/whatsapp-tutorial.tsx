'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Smartphone, Play, Check, X, Apple, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface WhatsAppTutorialProps {
  open: boolean
  onComplete: () => void
  onSkip: () => void
  onCancel: () => void
}

type TutorialStep = 'ask' | 'platform' | 'video' | 'complete'
type Platform = 'android' | 'ios' | null

const VIDEO_URLS = {
  android: 'https://files.catbox.moe/fdkhgg.mp4',
  ios: 'https://files.catbox.moe/k4lsk4.mp4',
}

export function WhatsAppTutorial({ open, onComplete, onSkip, onCancel }: WhatsAppTutorialProps) {
  const [step, setStep] = useState<TutorialStep>('ask')
  const [platform, setPlatform] = useState<Platform>(null)
  const [videoEnded, setVideoEnded] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setStep('ask')
      setPlatform(null)
      setVideoEnded(false)
      setVideoProgress(0)
    }
  }, [open])

  const handleWatchTutorial = () => {
    setStep('platform')
  }

  const handlePlatformSelect = (selectedPlatform: Platform) => {
    setPlatform(selectedPlatform)
    setStep('video')
  }

  const handleVideoEnd = () => {
    setVideoEnded(true)
    setStep('complete')
  }

  const handleVideoProgress = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setVideoProgress(progress)
    }
  }

  const handleComplete = () => {
    onComplete()
  }

  const handleSkipTutorial = () => {
    onSkip()
  }

  const handleClose = () => {
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose()
      }
    }}>
      <DialogContent 
        className="sm:max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Etapa 1: Perguntar se quer ver o tutorial */}
        {step === 'ask' && (
          <>
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                Tutorial de Conexão
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Antes de conectar seu WhatsApp, você gostaria de assistir um tutorial rápido de como fazer a conexão?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                <CardContent className="pt-4 sm:pt-6 pb-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900 rounded-full flex-shrink-0">
                      <Play className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold mb-1 text-sm sm:text-base">Por que assistir o tutorial?</h4>
                      <ul className="text-xs sm:text-sm text-muted-foreground space-y-0.5 sm:space-y-1">
                        <li>✓ Aprenda o passo a passo correto</li>
                        <li>✓ Evite erros na configuração</li>
                        <li>✓ Conecte em menos de 2 minutos</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2 sm:gap-3 pt-2">
                <Button
                  onClick={handleWatchTutorial}
                  className="w-full h-11 sm:h-12 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base"
                  size="lg"
                >
                  <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Sim, quero assistir
                </Button>
                <Button
                  onClick={handleSkipTutorial}
                  variant="outline"
                  className="w-full h-11 sm:h-12 text-sm sm:text-base"
                  size="lg"
                >
                  <X className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Pular tutorial
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Etapa 2: Selecionar plataforma */}
        {step === 'platform' && (
          <>
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-lg sm:text-2xl">Selecione seu Sistema</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Escolha o sistema do seu celular
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Card
                className={cn(
                  "cursor-pointer transition-all active:scale-95 hover:shadow-lg border-2",
                  "hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20"
                )}
                onClick={() => handlePlatformSelect('android')}
              >
                <CardContent className="pt-5 pb-5 sm:pt-6 sm:pb-6">
                  <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
                    <div className="p-3 sm:p-4 bg-green-100 dark:bg-green-900 rounded-full">
                      <Smartphone className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-0.5 sm:mb-1">Android</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Samsung, Xiaomi, etc.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "cursor-pointer transition-all active:scale-95 hover:shadow-lg border-2",
                  "hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20"
                )}
                onClick={() => handlePlatformSelect('ios')}
              >
                <CardContent className="pt-5 pb-5 sm:pt-6 sm:pb-6">
                  <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full">
                      <Apple className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-0.5 sm:mb-1">iOS</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        iPhone
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={() => setStep('ask')}
                variant="ghost"
                size="sm"
              >
                Voltar
              </Button>
            </div>
          </>
        )}

        {/* Etapa 3: Exibir vídeo */}
        {step === 'video' && platform && (
          <>
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                {platform === 'android' ? (
                  <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                ) : (
                  <Apple className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
                Tutorial {platform === 'android' ? 'Android' : 'iOS'}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Assista até o final para continuar
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {/* Player de vídeo */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  src={VIDEO_URLS[platform]}
                  controls
                  controlsList="nodownload"
                  className="w-full h-full"
                  onEnded={handleVideoEnd}
                  onTimeUpdate={handleVideoProgress}
                  playsInline
                >
                  Seu navegador não suporta vídeo.
                </video>
              </div>

              {/* Barra de progresso */}
              {!videoEnded && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progresso do vídeo</span>
                    <span className="font-medium">{Math.round(videoProgress)}%</span>
                  </div>
                  <Progress value={videoProgress} className="h-2" />
                </div>
              )}

              {/* Mensagem de bloqueio */}
              {!videoEnded && (
                <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                  <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="p-1 sm:p-1.5 bg-amber-100 dark:bg-amber-900 rounded-full flex-shrink-0">
                        <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                        <strong>Atenção:</strong> Assista até o final para prosseguir.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Botões */}
              <div className="flex flex-col gap-2 sm:gap-3 pt-2">
                <Button
                  onClick={handleComplete}
                  disabled={!videoEnded}
                  className={cn(
                    "w-full h-11 sm:h-12 text-sm sm:text-base",
                    videoEnded && "bg-green-600 hover:bg-green-700 text-white"
                  )}
                  size="lg"
                >
                  {videoEnded ? (
                    <>
                      <Check className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Continuar
                    </>
                  ) : (
                    <>Assista até o final</>
                  )}
                </Button>
                <Button
                  onClick={() => setStep('platform')}
                  variant="outline"
                  className="w-full text-sm"
                  size="sm"
                >
                  Voltar
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Etapa 4: Conclusão */}
        {step === 'complete' && (
          <>
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-2xl text-green-600">
                <CircleCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                Pronto!
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Agora você pode conectar seu WhatsApp
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                <CardContent className="pt-4 sm:pt-6 pb-4">
                  <div className="space-y-2 sm:space-y-3">
                    <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      Próximos passos:
                    </h4>
                    <ul className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 ml-6 sm:ml-7 text-muted-foreground">
                      <li>1. Tenha seu celular em mãos</li>
                      <li>2. Abra o WhatsApp</li>
                      <li>3. Siga os passos do vídeo</li>
                      <li>4. Escaneie o QR Code</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleComplete}
                className="w-full h-11 sm:h-12 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base"
                size="lg"
              >
                <Check className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Conectar Agora
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                className="w-full text-sm"
                size="sm"
              >
                Não conectar agora
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
