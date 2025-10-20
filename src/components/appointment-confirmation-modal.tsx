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
      onOpenChange(false)
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>📱 Enviar confirmação para o cliente?</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja enviar uma mensagem de confirmação via WhatsApp para <strong>{clientName}</strong>?
            <br /><br />
            A mensagem incluirá os detalhes do agendamento (data, horário, serviço e profissional).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isSending}>
            Não enviar
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSending}>
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSending ? 'Enviando...' : 'Sim, enviar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
