

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import type { ConfiguracoesNegocio, DiasDaSemana, Endereco } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback, useEffect } from 'react';
import { useScrollToError } from '@/lib/form-utils';
import { Loader2, LogOut } from 'lucide-react';
import BusinessAgendaForm from './business-agenda-form';
import { Separator } from '@/components/ui/separator';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


const timeSlotSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

const daySchema = z.object({
  enabled: z.boolean(),
  slots: z.array(timeSlotSchema).optional(),
});

const businessSettingsSchema = z.object({
  nome: z.string().min(2, { message: 'O nome do negócio deve ter pelo menos 2 caracteres.' }).max(64, { message: 'Nome muito longo (máx. 64 caracteres).' }),
  telefone: z.string().refine(v => String(v).replace(/\D/g, "").length === 11, {
    message: "O WhatsApp deve ter 11 dígitos (DDD + número)."
  }),
  categoria: z.string().min(1, { message: 'A categoria é obrigatória.' }),
  endereco: z.object({
    cep: z.string().refine(v => String(v).replace(/\D/g, "").length === 8, { message: 'O CEP deve ter 8 dígitos.' }),
    logradouro: z.string().min(2, { message: 'Logradouro é obrigatório.' }),
    numero: z.string().min(1, { message: 'Número é obrigatório.' }).max(10, { message: 'Número muito longo (máx. 10 caracteres).' }),
    bairro: z.string().min(2, { message: 'Bairro é obrigatório.' }),
    cidade: z.string().min(2, { message: 'Cidade é obrigatória.' }),
    estado: z.string().length(2, { message: 'Estado deve ter 2 letras.' }),
  }),
  horariosFuncionamento: z.object({
    domingo: daySchema,
    segunda: daySchema,
    terca: daySchema,
    quarta: daySchema,
    quinta: daySchema,
    sexta: daySchema,
    sabado: daySchema,
  }),
  habilitarLembrete24h: z.boolean().optional(),
  habilitarLembrete2h: z.boolean().optional(),
  habilitarFeedback: z.boolean().optional(),
  feedbackPlatform: z.enum(['google', 'instagram']).optional(),
  feedbackLink: z.string().optional(),
  habilitarEscalonamento: z.boolean().optional(),
  numeroEscalonamento: z.string().optional(),
  nomeIa: z.string().optional(),
  instrucoesIa: z.string().optional(),
}).superRefine((data, ctx) => {
    // Escalation validation
     if (data.habilitarEscalonamento && (!data.numeroEscalonamento || String(data.numeroEscalonamento).replace(/\D/g, "").length < 11)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O número para escalonamento deve ter 11 dígitos.",
        path: ["numeroEscalonamento"],
      });
    }
    // Feedback validation
    if (data.habilitarFeedback && (!data.feedbackLink || data.feedbackLink.trim() === '')) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O link ou usuário para feedback é obrigatório.",
            path: ["feedbackLink"],
        });
    }
});


type FormData = z.infer<typeof businessSettingsSchema>;

/* ===================== */
/* Step Indicator        */
/* ===================== */
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const denom = Math.max(totalSteps - 1, 1);
  const progress = (currentStep / denom) * 100;
  return (
    <div className="mb-8">
      <Progress value={progress} className="w-full" />
      <p className="text-sm text-muted-foreground mt-2">
        Passo {currentStep + 1} de {totalSteps}
      </p>
    </div>
  );
}

interface BusinessSettingsFormProps {
  settings: ConfiguracoesNegocio | null;
  userId: string;
  onSave: (settings: ConfiguracoesNegocio) => void;
  onLogout?: () => void;
  isSetupMode?: boolean;
}

export default function BusinessSettingsForm({ 
    settings, 
    userId, 
    onSave, 
    onLogout, 
    isSetupMode = false 
}: BusinessSettingsFormProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  const setupSteps = [
    { title: "Detalhes do Negócio", fields: ["nome", "telefone", "categoria", "endereco.cep", "endereco.logradouro", "endereco.numero", "endereco.bairro", "endereco.cidade", "endereco.estado"] },
    { title: "Horários de Funcionamento", fields: ["horariosFuncionamento"] },
    { title: "Notificações", fields: ["habilitarLembrete24h", "habilitarLembrete2h", "habilitarFeedback", "feedbackPlatform", "feedbackLink", "habilitarEscalonamento", "numeroEscalonamento"] },
  ];

  const allSteps = [...setupSteps, { title: "Configurações de IA", fields: ["nomeIa", "instrucoesIa"] }];
  const steps = isSetupMode ? setupSteps : allSteps;

  // Valores padrão de horários para setup inicial
  const defaultHorarios = {
    domingo: { enabled: false, slots: [] },
    segunda: { enabled: true, slots: [{ start: '08:00', end: '18:00' }] },
    terca: { enabled: true, slots: [{ start: '08:00', end: '18:00' }] },
    quarta: { enabled: true, slots: [{ start: '08:00', end: '18:00' }] },
    quinta: { enabled: true, slots: [{ start: '08:00', end: '18:00' }] },
    sexta: { enabled: true, slots: [{ start: '08:00', end: '18:00' }] },
    sabado: { enabled: false, slots: [] },
  };

  const defaultValues: Partial<FormData> = {
    nome: settings?.nome || "",
    telefone: formatPhoneNumber(settings?.telefone ? String(settings.telefone) : ""),
    categoria: settings?.categoria || "",
    endereco: settings?.endereco || {
        cep: "", logradouro: "", numero: "", bairro: "", cidade: "", estado: ""
    },
    horariosFuncionamento: (settings?.horariosFuncionamento && settings.setupCompleted) 
        ? settings.horariosFuncionamento 
        : defaultHorarios,
    habilitarLembrete24h: settings?.habilitarLembrete24h ?? false,
    habilitarLembrete2h: settings?.habilitarLembrete2h ?? false,
    habilitarFeedback: settings?.habilitarFeedback ?? false,
    feedbackPlatform: settings?.feedbackPlatform ?? 'google',
    feedbackLink: settings?.feedbackLink || "",
    habilitarEscalonamento: settings?.habilitarEscalonamento ?? false,
    numeroEscalonamento: formatPhoneNumber(settings?.numeroEscalonamento ? String(settings.numeroEscalonamento) : ""),
    nomeIa: settings?.nomeIa || 'Vitoria',
    instrucoesIa: settings?.instrucoesIa || '',
  };


  const form = useForm<FormData>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: defaultValues as any, // Zod handles transformation, so this is okay
    mode: 'onChange',
  });

  const { control, watch, setValue, trigger, formState: { errors, isSubmitting } } = form;

  // Scroll automático para primeiro erro
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      useScrollToError(errors);
    }
  }, [errors]);

  /* --- CEP lookup --- */
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const cepFailed = !!errors.endereco?.cep;

  const fetchAddressFromCep = useCallback(
    async (cep: string) => {
      const cleanCep = String(cep ?? "").replace(/\D/g, "");
      if (cleanCep.length !== 8) return;
      setIsFetchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        if (!response.ok) throw new Error("CEP não encontrado");
        const data = await response.json();
        if (data.erro) throw new Error("CEP inválido");

        setValue("endereco.logradouro", data.logradouro ?? "", { shouldValidate: true });
        setValue("endereco.bairro", data.bairro ?? "", { shouldValidate: true });
        setValue("endereco.cidade", data.localidade ?? "", { shouldValidate: true });
        setValue("endereco.estado", data.uf ?? "", { shouldValidate: true });
        trigger(); 
      } catch (error) {
        form.setError("endereco.cep", {
          type: "manual",
          message: "CEP não encontrado. Preencha os campos manualmente.",
        });
      } finally {
        setIsFetchingCep(false);
      }
    }, [setValue, form, trigger]
  );

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === "endereco.cep") {
        const cepValue = value.endereco?.cep || "";
        if (String(cepValue).replace(/\D/g, "").length === 8) {
          fetchAddressFromCep(cepValue);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, fetchAddressFromCep]);

  /* --- step validation & navigation --- */
  const validateStep = async (stepIndex: number): Promise<boolean> => {
    const fieldsToValidate = steps[stepIndex].fields;
    const result = await trigger(fieldsToValidate as any);
    return result;
  };

  const handleNextStep = async () => {
    if (await validateStep(currentStep)) {
      setCurrentStep((s) => s + 1);
    }
  };

  /* --- submit --- */
  const onSubmit = form.handleSubmit(async (data) => {
     if (isSetupMode) {
      const allStepsValid = await trigger();
      if (!allStepsValid) {
        toast({
          variant: "destructive",
          title: "Formulário Incompleto",
          description: "Por favor, revise todos os passos e preencha os campos obrigatórios.",
        });
        for (let i = 0; i < steps.length; i++) {
          const isValid = await validateStep(i);
          if (!isValid) {
            setCurrentStep(i);
            return;
          }
        }
        return;
      }
    }
    
    const dataToSave = {
        ...data,
        telefone: parseInt(`55${String(data.telefone).replace(/\D/g, "")}`.slice(-13), 10),
        endereco: {
            ...data.endereco,
            cep: String(data.endereco.cep).replace(/\D/g, ""),
        },
        numeroEscalonamento: data.numeroEscalonamento ? parseInt(`55${String(data.numeroEscalonamento).replace(/\D/g, "")}`.slice(-13), 10) : null,
        feedbackLink: data.habilitarFeedback ? data.feedbackLink : "",
    };
    
    onSave({ ...settings, ...dataToSave } as ConfiguracoesNegocio);
    
    if(!isSetupMode) {
        form.reset(data); 
        toast({
            title: 'Sucesso!',
            description: "Configurações salvas.",
        });
    }
  });

  const habilitarFeedback = watch('habilitarFeedback');
  const habilitarEscalonamento = watch('habilitarEscalonamento');
  const feedbackPlatform = watch('feedbackPlatform');


  const renderStepContent = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: // Detalhes do Negócio
        return (
          <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Negócio</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Barbearia do Zé" maxLength={64} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp da Empresa</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="tel"
                          placeholder="(XX) XXXXX-XXXX"
                          maxLength={15}
                          value={field.value}
                          onChange={(e) => {
                             field.onChange(formatPhoneNumber(e.target.value));
                          }}
                        />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Barbearia">Barbearia 💈</SelectItem>
                        <SelectItem value="ClinicaDeFisioterapia">Clínica de Fisioterapia 🏃‍♂️</SelectItem>
                        <SelectItem value="ClinicaMedica">Clínica Médica 🩺</SelectItem>
                        <SelectItem value="ClinicaNutricionista">Clínica Nutricionista 🥗</SelectItem>
                        <SelectItem value="ClinicaOdontologica">Clínica Odontológica 🦷</SelectItem>
                        <SelectItem value="ClinicaPsicologica">Clínica Psicológica 🧠</SelectItem>
                        <SelectItem value="Estetica">Estética 💆‍♀️</SelectItem>
                        <SelectItem value="LashDesigner">Lash Designer 👁️</SelectItem>
                        <SelectItem value="NailDesigner">Nail Designer 💅</SelectItem>
                        <SelectItem value="SalaoDeBeleza">Salão de Beleza 💇‍♀️</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-medium">Endereço</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={control}
                    name="endereco.cep"
                    render={({ field }) => (
                      <FormItem className="md:col-span-1 relative">
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Apenas números"
                            {...field}
                            inputMode="numeric"
                            maxLength={8}
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                          />
                        </FormControl>
                        {isFetchingCep && <Loader2 className="absolute right-3 top-9 h-4 w-4 animate-spin" />}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={control}
                    name="endereco.logradouro"
                    render={({ field }) => (
                        <FormItem className="md:col-span-2">
                        <FormLabel>Logradouro</FormLabel>
                        <FormControl>
                            <Input placeholder="Rua das Flores" {...field} disabled={!cepFailed} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   <FormField
                    control={control}
                    name="endereco.numero"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                            <Input placeholder="123" {...field} maxLength={10} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name="endereco.bairro"
                    render={({ field }) => (
                        <FormItem className="md:col-span-3">
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                            <Input placeholder="Centro" {...field} disabled={!cepFailed} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={control}
                        name="endereco.cidade"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                                <Input placeholder="São Paulo" {...field} disabled={!cepFailed} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="endereco.estado"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                                <Input placeholder="SP" {...field} disabled={!cepFailed}/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>
              </div>
          </div>
        );
      case 1: // Horários
        return <BusinessAgendaForm />;
      case 2: // Notificações
        return (
          <div className="space-y-6">
              <FormField
                control={control}
                name="habilitarLembrete24h"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Lembrete de 24h</FormLabel>
                      <p className="text-sm text-muted-foreground">Enviar um lembrete 24 horas antes do agendamento.</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="habilitarLembrete2h"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Lembrete de 2h</FormLabel>
                      <p className="text-sm text-muted-foreground">Enviar um lembrete 2 horas antes do agendamento.</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
               <div className="space-y-4 rounded-lg border p-4">
                  <FormField
                    control={control}
                    name="habilitarFeedback"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Feedback Pós-Serviço</FormLabel>
                          <FormDescription>
                            Ativar envio de pesquisa de satisfação.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {habilitarFeedback && (
                      <div className="space-y-4 pt-4 border-t">
                        <FormField
                            control={control}
                            name="feedbackPlatform"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Plataforma de Feedback</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex items-center gap-4"
                                    >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="google" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Google Maps</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="instagram" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Instagram</FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name="feedbackLink"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                  {feedbackPlatform === 'google' ? 'Link de Avaliação do Google' : 'Usuário do Instagram'}
                                </FormLabel>
                                <FormControl>
                                <Input
                                    placeholder={
                                      feedbackPlatform === 'google'
                                      ? 'https://maps.app.goo.gl/seu-link'
                                      : '@seu_negocio'
                                    }
                                    {...field}
                                    value={field.value || ""}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                      </div>
                  )}
               </div>
                <div className="space-y-4 rounded-lg border p-4">
                  <FormField
                    control={control}
                    name="habilitarEscalonamento"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Escalonamento Humano</FormLabel>
                          <FormDescription>
                            Desviar para um atendente se a IA não souber.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {habilitarEscalonamento && (
                      <FormField
                        control={control}
                        name="numeroEscalonamento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número para Escalonamento</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="(XX) XXXXX-XXXX"
                                inputMode="tel"
                                value={field.value || ""}
                                maxLength={15}
                                onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  )}
               </div>
          </div>
        );
      case 3: // Configurações de IA
        return (
           <div className="space-y-4">
              <FormField
                control={control}
                name="nomeIa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da IA</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="instrucoesIa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instruções para a IA</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Temos espaço kids, nosso diferencial é o atendimento a todas as idades..."
                        maxLength={2000}
                        {...field}
                        value={field.value || ""}
                        className="min-h-32"
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground text-right">{(field.value || "").length} / 2000</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-6">
          {isSetupMode && <StepIndicator currentStep={currentStep} totalSteps={steps.length} />}

          {!isSetupMode ? (
            <div className="space-y-6">
              <Card id="business-details"><CardContent className="pt-6">{renderStepContent(0)}</CardContent></Card>
               <Accordion type="single" collapsible className="w-full" id="operating-hours" defaultValue="item-1">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="hover:no-underline">
                      Horários de Funcionamento
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card><CardContent className="pt-6">{renderStepContent(1)}</CardContent></Card>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
               <Accordion type="single" collapsible className="w-full" id="notifications" defaultValue="item-1">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="hover:no-underline">
                     Notificações
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card><CardContent className="pt-6">{renderStepContent(2)}</CardContent></Card>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
                <Accordion type="single" collapsible className="w-full" id="ai-settings" defaultValue="item-1">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="hover:no-underline">
                     Configurações de IA
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card><CardContent className="pt-6">{renderStepContent(3)}</CardContent></Card>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="min-h-[500px]">{renderStepContent(currentStep)}</div>
            </>
          )}

          {isSetupMode && (
            <div className="flex gap-2 justify-between mt-4">
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>

              <div className="flex gap-2">
                 {currentStep > 0 && (
                  <Button type="button" variant="outline" onClick={() => setCurrentStep((s) => s - 1)}>
                    Voltar
                  </Button>
                )}
                {currentStep < steps.length - 1 && (
                  <Button type="button" onClick={handleNextStep}>
                    Avançar
                  </Button>
                )}
                {currentStep === steps.length - 1 && (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar e Concluir
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
