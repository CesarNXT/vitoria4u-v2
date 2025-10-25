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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import type { ConfiguracoesNegocio } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { formatPhoneNumber } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  habilitarLembrete24h: z.boolean().optional(),
  habilitarLembrete2h: z.boolean().optional(),
  habilitarAniversario: z.boolean().optional(),
  habilitarFeedback: z.boolean().optional(),
  feedbackPlatform: z.enum(['google', 'instagram']).optional(),
  feedbackLink: z.string().optional(),
  habilitarEscalonamento: z.boolean().optional(),
  numeroEscalonamento: z.string().optional(),
  rejeitarChamadasAutomaticamente: z.boolean().optional(),
  mensagemRejeicaoChamada: z.string().optional(),
  notificarClienteAgendamento: z.boolean().optional(),
  notificarGestorAgendamento: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.habilitarEscalonamento && data.numeroEscalonamento) {
    const digits = String(data.numeroEscalonamento).replace(/\D/g, "").length;
    if (digits !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O celular deve ter 11 dígitos",
        path: ["numeroEscalonamento"],
      });
    }
  }
  if (data.habilitarFeedback && !data.feedbackLink) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "O link de feedback é obrigatório",
      path: ["feedbackLink"],
    });
  }
});

type FormValues = z.infer<typeof schema>;

interface NotificationsModalProps {
  open: boolean;
  onClose: () => void;
  settings: ConfiguracoesNegocio | null;
  onSave: (data: Partial<ConfiguracoesNegocio>) => Promise<void>;
  userId: string;
}

export default function NotificationsModal({ open, onClose, settings, onSave, userId }: NotificationsModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      habilitarLembrete24h: settings?.habilitarLembrete24h ?? false,
      habilitarLembrete2h: settings?.habilitarLembrete2h ?? false,
      habilitarAniversario: settings?.habilitarAniversario ?? false,
      habilitarFeedback: settings?.habilitarFeedback ?? false,
      feedbackPlatform: settings?.feedbackPlatform || 'google',
      feedbackLink: settings?.feedbackLink || '',
      habilitarEscalonamento: settings?.habilitarEscalonamento ?? false,
      numeroEscalonamento: formatPhoneNumber(settings?.numeroEscalonamento || ''),
      rejeitarChamadasAutomaticamente: settings?.rejeitarChamadasAutomaticamente ?? false,
      mensagemRejeicaoChamada: settings?.mensagemRejeicaoChamada || '',
      notificarClienteAgendamento: settings?.notificarClienteAgendamento ?? true,
      notificarGestorAgendamento: settings?.notificarGestorAgendamento ?? true,
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

  const watchFeedback = form.watch("habilitarFeedback");
  const watchEscalonamento = form.watch("habilitarEscalonamento");
  const watchRejeicao = form.watch("rejeitarChamadasAutomaticamente");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notificações</DialogTitle>
          <DialogDescription>
            Configure lembretes, mensagens de aniversário, feedback e mais.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Lembretes de Agendamento */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Lembretes de Agendamento</h3>

              <FormField
                control={form.control}
                name="habilitarLembrete24h"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">🔔 Lembrete de 24h</FormLabel>
                      <FormDescription>
                        Mensagem automática 24 horas antes do atendimento
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="habilitarLembrete2h"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">⏰ Lembrete de 2h</FormLabel>
                      <FormDescription>
                        Mensagem 2 horas antes do atendimento
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Notificações de Agendamento */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Notificações de Agendamento</h3>

              <FormField
                control={form.control}
                name="notificarClienteAgendamento"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">📱 Notificar Cliente</FormLabel>
                      <FormDescription>
                        Cliente recebe confirmação ao agendar
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notificarGestorAgendamento"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">👨‍💼 Notificar Gestor</FormLabel>
                      <FormDescription>
                        Você recebe aviso de novos agendamentos
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Outras Notificações */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Outras Notificações</h3>

              <FormField
                control={form.control}
                name="habilitarAniversario"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">🎂 Mensagem de Aniversário</FormLabel>
                      <FormDescription>
                        Enviar mensagem automática no aniversário do cliente
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="habilitarFeedback"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">⭐ Solicitação de Feedback</FormLabel>
                      <FormDescription>
                        Solicitar avaliação após o atendimento
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchFeedback && (
                <div className="ml-4 space-y-4 border-l-2 pl-4">
                  <FormField
                    control={form.control}
                    name="feedbackPlatform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plataforma</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="google">Google (Recomendado)</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="feedbackLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link de Avaliação</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Configurações Avançadas */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Configurações Avançadas</h3>

              <FormField
                control={form.control}
                name="habilitarEscalonamento"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">📞 Escalonamento</FormLabel>
                      <FormDescription>
                        Encaminhar para atendimento humano se necessário
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchEscalonamento && (
                <div className="ml-4 border-l-2 pl-4">
                  <FormField
                    control={form.control}
                    name="numeroEscalonamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número para Escalonamento</FormLabel>
                        <FormControl>
                          <PhoneInput {...field} />
                        </FormControl>
                        <FormDescription>
                          WhatsApp para onde a IA pode transferir o atendimento
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="rejeitarChamadasAutomaticamente"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">🚫 Rejeitar Chamadas</FormLabel>
                      <FormDescription>
                        Rejeitar automaticamente chamadas telefônicas
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchRejeicao && (
                <div className="ml-4 border-l-2 pl-4">
                  <FormField
                    control={form.control}
                    name="mensagemRejeicaoChamada"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem de Rejeição</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Desculpe, não atendemos ligações. Por favor, envie mensagem de texto."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
