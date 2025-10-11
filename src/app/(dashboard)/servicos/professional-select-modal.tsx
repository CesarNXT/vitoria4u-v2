"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Profissional } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useEffect } from "react"

interface ProfessionalSelectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  professionals: Profissional[]
  selectedProfessionals: string[]
  onConfirm: (selected: string[]) => void
}

export function ProfessionalSelectModal({
  open,
  onOpenChange,
  professionals,
  selectedProfessionals,
  onConfirm,
}: ProfessionalSelectModalProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedProfessionals)

  useEffect(() => {
    setLocalSelected(selectedProfessionals)
  }, [selectedProfessionals, open])

  const handleCheckboxChange = (profId: string, checked: boolean) => {
    if (checked) {
      setLocalSelected([...localSelected, profId])
    } else {
      setLocalSelected(localSelected.filter((id) => id !== profId))
    }
  }

  const handleConfirm = () => {
    onConfirm(localSelected)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecionar Profissionais</DialogTitle>
          <DialogDescription>
            Escolha os profissionais que realizam este serviço.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {professionals.filter(p => p.status === 'Ativo').map((prof) => (
            <div key={prof.id} className="flex items-center space-x-3">
              <Checkbox
                id={`prof-modal-${prof.id}`}
                checked={localSelected.includes(prof.id)}
                onCheckedChange={(checked) => handleCheckboxChange(prof.id, !!checked)}
              />
              <label htmlFor={`prof-modal-${prof.id}`} className="font-normal text-sm cursor-pointer">
                {prof.name}
              </label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
