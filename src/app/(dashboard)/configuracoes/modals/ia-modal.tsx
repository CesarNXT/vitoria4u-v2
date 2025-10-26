"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ConfiguracoesNegocio } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { toggleIAWebhookAction } from "../ia-actions";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  iaAtiva: z.boolean().optional(),
  nomeIa: z.string().optional(),
  instrucoesIa: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface IAModalProps {
  open: boolean;
  onClose: () => void;
  settings: ConfiguracoesNegocio | null;
  onSave: (data: Partial<ConfiguracoesNegocio>) => Promise<void>;
}

export default function IAModal({ open, onClose, settings, onSave }: IAModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      iaAtiva: settings?.iaAtiva ?? true,
      nomeIa: settings?.nomeIa || "Vitoria",
      instrucoesIa: settings?.instrucoesIa || "",
    },
  });

  const handleSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      // 1. Salvar configurações no Firestore
      await onSave(data);
      
      // 2. Configurar webhook na UAZAPI (ativar/desativar IA)
      const webhookResult = await toggleIAWebhookAction(data.iaAtiva ?? false);
      
      if (!webhookResult.success) {
        toast({
          variant: "destructive",
          title: "Aviso",
          description: `Configurações salvas, mas houve um erro ao configurar o webhook: ${webhookResult.error}`,
        });
      } else {
        toast({
          title: "Sucesso!",
          description: webhookResult.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const watchIaAtiva = form.watch("iaAtiva");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inteligência Artificial</DialogTitle>
          <DialogDescription>
            Configure o assistente virtual que atende seus clientes no WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Status da IA */}
            <FormField
              control={form.control}
              name="iaAtiva"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">🤖 IA Ativa</FormLabel>
                    <FormDescription>
                      Ativar ou desativar o assistente virtual
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {watchIaAtiva && (
              <>
                {/* Nome da IA */}
                <FormField
                  control={form.control}
                  name="nomeIa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da IA</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Vitoria, Ana, João..." {...field} />
                      </FormControl>
                      <FormDescription>
                        O nome que a IA usará para se apresentar aos clientes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Instruções Personalizadas */}
                <FormField
                  control={form.control}
                  name="instrucoesIa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instruções Personalizadas (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: Seja sempre educado e use emojis. Pergunte sempre se o cliente tem alguma preferência de horário..."
                          className="min-h-[150px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Instruções adicionais para personalizar o comportamento da IA. Deixe em branco para usar o comportamento padrão.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Informações sobre o funcionamento */}
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <h4 className="font-medium text-sm">ℹ️ Como funciona a IA</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Atende automaticamente no WhatsApp</li>
                    <li>Responde dúvidas sobre serviços e horários</li>
                    <li>Realiza agendamentos de forma conversacional</li>
                    <li>Usa as informações do seu negócio para dar respostas precisas</li>
                    <li>Pode transferir para atendimento humano quando necessário</li>
                  </ul>
                </div>
              </>
            )}

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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
