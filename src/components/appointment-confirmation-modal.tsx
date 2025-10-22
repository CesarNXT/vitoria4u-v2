'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2 } from 'lucide-react'

interface AppointmentConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  clientName: string
}

export function AppointmentConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  clientName
}: AppointmentConfirmationModalProps) {
  const [isSending, setIsSending] = useState(false)

  const handleConfirm = async () => {
    setIsSending(true)
    try {
      await onConfirm()
      // onConfirm já fecha o modal, não precisa duplicar aqui
    } catch (error) {
      // Erro já tratado no onConfirm
    } finally {
      setIsSending(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base sm:text-lg">📱 Enviar confirmação para o cliente?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm">Deseja enviar uma mensagem de confirmação via WhatsApp para:</p>
              <div className="min-w-0 overflow-hidden">
                <p 
                  className="font-bold line-clamp-2 break-all text-sm sm:text-base cursor-help" 
                  title={clientName}
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                >
                  {clientName}
                </p>
              </div>
              <p className="pt-2 text-sm text-muted-foreground">A mensagem incluirá os detalhes do agendamento (data, horário, serviço e profissional).</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleCancel} disabled={isSending} className="w-full sm:w-auto">
            Não enviar
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSending} className="w-full sm:w-auto">
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSending ? 'Enviando...' : 'Sim, enviar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
