"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ConfiguracoesNegocio } from "@/lib/types";
import { Loader2 } from "lucide-react";
import HealthInsuranceManager from "../health-insurance-manager";

const schema = z.object({
  planosSaudeAceitos: z.array(z.object({
    id: z.string(),
    nome: z.string(),
  })).optional(),
});

type FormValues = z.infer<typeof schema>;

interface HealthInsuranceModalProps {
  open: boolean;
  onClose: () => void;
  settings: ConfiguracoesNegocio | null;
  onSave: (data: Partial<ConfiguracoesNegocio>) => Promise<void>;
  userId: string;
}

export default function HealthInsuranceModal({ open, onClose, settings, onSave, userId }: HealthInsuranceModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      planosSaudeAceitos: settings?.planosSaudeAceitos || [],
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planos de Saúde</DialogTitle>
          <DialogDescription>
            Gerencie os planos de saúde aceitos em sua clínica ou consultório.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-4">Planos Aceitos</h4>
              <HealthInsuranceManager categoria={settings?.categoria} />
            </div>

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
