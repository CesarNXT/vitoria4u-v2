"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ConfiguracoesNegocio, DiasDaSemana } from "@/lib/types";
import { Loader2 } from "lucide-react";
import BusinessAgendaForm from "../business-agenda-form";

const timeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
}).refine(data => !data.start || !data.end || data.start < data.end, {
  message: "O horário final deve ser após o inicial.",
  path: ["end"],
});

const daySchema = z.object({
  enabled: z.boolean(),
  slots: z.array(timeSlotSchema).max(2, "Máximo de 2 intervalos por dia."),
}).refine(
  (data) => {
    if (data.enabled && data.slots.length === 0) return false;
    if (data.enabled && data.slots.some(slot => !slot.start || !slot.end)) return false;
    return true;
  },
  {
    message: "Dia ativo deve ter pelo menos um horário configurado.",
    path: ["slots"],
  }
);

const schema = z.object({
  horariosFuncionamento: z.object({
    domingo: daySchema,
    segunda: daySchema,
    terca: daySchema,
    quarta: daySchema,
    quinta: daySchema,
    sexta: daySchema,
    sabado: daySchema,
  }),
});

type FormValues = z.infer<typeof schema>;

interface BusinessHoursModalProps {
  open: boolean;
  onClose: () => void;
  settings: ConfiguracoesNegocio | null;
  onSave: (data: Partial<ConfiguracoesNegocio>) => Promise<void>;
}

const defaultHorarios = {
  domingo: { enabled: false, slots: [] },
  segunda: { enabled: true, slots: [{ start: '08:00', end: '18:00' }] },
  terca: { enabled: true, slots: [{ start: '08:00', end: '18:00' }] },
  quarta: { enabled: true, slots: [{ start: '08:00', end: '18:00' }] },
  quinta: { enabled: true, slots: [{ start: '08:00', end: '18:00' }] },
  sexta: { enabled: true, slots: [{ start: '08:00', end: '18:00' }] },
  sabado: { enabled: false, slots: [] },
};

export default function BusinessHoursModal({ open, onClose, settings, onSave }: BusinessHoursModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      horariosFuncionamento: settings?.horariosFuncionamento || defaultHorarios,
    },
  });

  const handleSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      await onSave(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Horários de Funcionamento</DialogTitle>
          <DialogDescription>
            Configure os dias e horários em que seu negócio atende.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <BusinessAgendaForm />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
