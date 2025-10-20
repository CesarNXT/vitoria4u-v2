

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
import { usePlanFeatures } from '@/hooks/use-plan-features';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useScrollToError } from '@/lib/form-utils';
import { Loader2, LogOut, ChevronRight, Search, Building2, Bell, Bot, Clock, Heart } from 'lucide-react';
import BusinessAgendaForm from './business-agenda-form';
import HealthInsuranceManager from './health-insurance-manager';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { isCategoriaClinica } from '@/lib/categoria-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';


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
    // Se o dia está ativo, deve ter pelo menos 1 horário configurado
    if (data.enabled && data.slots.length === 0) {
      return false;
    }
    // Se o dia está ativo, os horários não podem estar vazios
    if (data.enabled && data.slots.some(slot => !slot.start || !slot.end)) {
      return false;
    }
    return true;
  },
  {
    message: "Dia ativo deve ter pelo menos um horário configurado.",
    path: ["slots"],
  }
);

const businessSettingsSchema = z.object({
  nome: z.string().min(2, { message: 'O nome do negócio deve ter pelo menos 2 caracteres.' }).max(64, { message: 'Nome muito longo (máx. 64 caracteres).' }),
  telefone: z.string().refine(v => {
    const digits = String(v).replace(/\D/g, "").length;
    return digits === 11;
  }, {
    message: "O WhatsApp deve ter 11 dígitos (DDD + 9 + número). Exemplo: 11999887766"
  }),
  categoria: z.string().min(1, { message: 'A categoria é obrigatória.' }),
  endereco: z.object({
    cep: z.string()
      .min(1, { message: 'O CEP é obrigatório.' })
      .refine(v => String(v).replace(/\D/g, "").length === 8, { message: 'O CEP deve ter 8 dígitos.' }),
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
  habilitarAniversario: z.boolean().optional(),
  habilitarEscalonamento: z.boolean().optional(),
  numeroEscalonamento: z.string().optional(),
  nomeIa: z.string().optional(),
  instrucoesIa: z.string().optional(),
  iaAtiva: z.boolean().optional(),
  planosSaudeAceitos: z.array(z.object({
    id: z.string(),
    nome: z.string(),
  })).optional(),
  notificarClienteAgendamento: z.boolean().optional(),
  notificarGestorAgendamento: z.boolean().optional(),
}).superRefine((data, ctx) => {
    // Escalation validation
     if (data.habilitarEscalonamento && data.numeroEscalonamento) {
      const digits = String(data.numeroEscalonamento).replace(/\D/g, "").length;
      if (digits !== 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O celular deve ter 11 dígitos (DDD + 9 + número). Exemplo: 11999887766",
          path: ["numeroEscalonamento"],
        });
      }
    } else if (data.habilitarEscalonamento && !data.numeroEscalonamento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O número para escalonamento é obrigatório.",
        path: ["numeroEscalonamento"],
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
    <div className="mb-8 space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-muted-foreground">
          Passo {currentStep + 1} de {totalSteps}
        </p>
        <p className="text-sm font-medium text-primary">
          {Math.round(progress)}% concluído
        </p>
      </div>
      <Progress value={progress} className="w-full h-2" />
    </div>
  );
}

interface BusinessSettingsFormProps {
  settings: ConfiguracoesNegocio | null;
  userPlan: any | null;
  userId: string;
  onSave: (settings: ConfiguracoesNegocio) => void;
  onLogout?: () => void;
  isSetupMode?: boolean;
}

export default function BusinessSettingsForm({ 
    settings,
    userPlan,
    userId, 
    onSave, 
    onLogout, 
    isSetupMode = false 
}: BusinessSettingsFormProps) {
  const { toast } = useToast();
  
  // Hook para verificar features do plano
  const { hasFeature } = usePlanFeatures(settings, userPlan);
  
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  // Chave localStorage para salvar progresso do setup
  const setupProgressKey = `vitoria4u-setup-${userId}`;

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

  // Carregar dados salvos do localStorage (apenas em setup mode)
  const getDefaultValues = (): Partial<FormData> => {
    const baseValues = {
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
      habilitarAniversario: settings?.habilitarAniversario ?? false,
      notificarClienteAgendamento: settings?.notificarClienteAgendamento ?? false,
      notificarGestorAgendamento: settings?.notificarGestorAgendamento ?? true,
      habilitarEscalonamento: settings?.habilitarEscalonamento ?? false,
      numeroEscalonamento: formatPhoneNumber(settings?.numeroEscalonamento ? String(settings.numeroEscalonamento) : ""),
      nomeIa: settings?.nomeIa || 'Vitoria',
      instrucoesIa: settings?.instrucoesIa || '',
      iaAtiva: settings?.iaAtiva ?? true,
      planosSaudeAceitos: settings?.planosSaudeAceitos || [],
    };

    // Em setup mode, tentar carregar dados salvos do localStorage
    if (isSetupMode && typeof window !== 'undefined') {
      try {
        const savedData = localStorage.getItem(setupProgressKey);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          return { ...baseValues, ...parsed };
        }
      } catch (error) {
        // Silencioso - não expor informações no console
      }
    }

    return baseValues;
  };

  const defaultValues = getDefaultValues();


  const form = useForm<FormData>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: defaultValues as any, // Zod handles transformation, so this is okay
    mode: 'onChange',
  });

  const { control, watch, setValue, trigger, formState: { errors, isSubmitting } } = form;

  // Verificar se a categoria atual é uma clínica
  const categoriaAtual = watch('categoria');
  const isClinica = isCategoriaClinica(categoriaAtual);

  // Setup steps dinâmico - adiciona passo de planos de saúde para clínicas
  const setupSteps = useMemo(() => {
    const baseSetupSteps = [
      { title: "Detalhes do Negócio", fields: ["nome", "telefone", "categoria", "endereco.cep", "endereco.logradouro", "endereco.numero", "endereco.bairro", "endereco.cidade", "endereco.estado"] },
      { title: "Horários de Funcionamento", fields: ["horariosFuncionamento"] },
    ];

    const clinicSetupStep = { title: "Planos de Saúde", fields: ["planosSaudeAceitos"] };
    
    const notificationsStep = { title: "Notificações", fields: ["habilitarLembrete24h", "habilitarLembrete2h", "habilitarAniversario", "habilitarEscalonamento", "numeroEscalonamento"] };

    // Se for clínica, adiciona passo de planos de saúde antes das notificações
    return isClinica 
      ? [...baseSetupSteps, clinicSetupStep, notificationsStep]
      : [...baseSetupSteps, notificationsStep];
  }, [isClinica]);

  const allSteps = useMemo(() => [...setupSteps, { title: "Configurações de IA", fields: ["nomeIa", "instrucoesIa"] }], [setupSteps]);
  const steps = isSetupMode ? setupSteps : allSteps;

  // Scroll automático para primeiro erro
  useScrollToError(errors);

  /* --- CEP lookup via ViaCEP (API confiável) --- */
  const fetchAddressFromCep = useCallback(
    async (cep: string) => {
      const cleanCep = String(cep ?? "").replace(/\D/g, "");
      if (cleanCep.length !== 8) return;
      setIsFetchingCep(true);
      try {
        // Usar API própria que consulta ViaCEP
        const response = await fetch(`/api/address/cep?cep=${cleanCep}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "CEP não encontrado");
        }
        
        const data = await response.json();

        // Preencher campos automaticamente
        setValue("endereco.logradouro", data.logradouro || "", { shouldValidate: true });
        setValue("endereco.bairro", data.bairro || "", { shouldValidate: true });
        setValue("endereco.cidade", data.localidade || "", { shouldValidate: true });
        setValue("endereco.estado", data.uf || "", { shouldValidate: true });
        
        // Limpar erro do CEP se havia
        form.clearErrors("endereco.cep");
        
        await trigger();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "❌ CEP não encontrado",
          description: error.message || "Verifique o CEP digitado ou preencha os campos manualmente.",
        });
      } finally {
        setIsFetchingCep(false);
      }
    }, [setValue, form, trigger, toast]
  );

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === "endereco.cep") {
        const cepValue = value.endereco?.cep || "";
        if (String(cepValue).replace(/\D/g, "").length === 8) {
          // Usar setTimeout para evitar flushSync durante renderização
          setTimeout(() => fetchAddressFromCep(cepValue), 0);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, fetchAddressFromCep]);

  // 💾 Salvar progresso no localStorage (apenas em setup mode)
  useEffect(() => {
    if (!isSetupMode || typeof window === 'undefined') return;

    const subscription = watch((value) => {
      try {
        // Salvar dados no localStorage automaticamente
        localStorage.setItem(setupProgressKey, JSON.stringify(value));
      } catch (error) {
        console.error('Erro ao salvar progresso:', error);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, isSetupMode, setupProgressKey]);

  /* --- step validation & navigation --- */
  const validateStep = async (stepIndex: number): Promise<boolean> => {
    const step = steps[stepIndex];
    if (!step) return false;
    const fieldsToValidate = step.fields;
    const result = await trigger(fieldsToValidate as any);
    return result;
  };

  const handleNextStep = async () => {
    if (await validateStep(currentStep)) {
      setCurrentStep((s) => s + 1);
      // Scroll suave para o topo
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    };
    
    // 🗑️ Limpar progresso salvo do localStorage quando concluir setup
    if (isSetupMode && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(setupProgressKey);
      } catch (error) {
        // Silencioso - não expor informações no console
      }
    }
    
    onSave({ ...settings, ...dataToSave } as ConfiguracoesNegocio);
    
    if(!isSetupMode) {
        form.reset(data); 
        toast({
            title: 'Sucesso!',
            description: "Configurações salvas.",
        });
    }
  });

  const habilitarEscalonamento = watch('habilitarEscalonamento');


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
                render={({ field }) => {
                  const categories = [
                    { value: "Barbearia", label: "Barbearia 💈" },
                    { value: "ClinicaDeFisioterapia", label: "Clínica de Fisioterapia 🏃‍♂️" },
                    { value: "ClinicaMedica", label: "Clínica Médica 🩺" },
                    { value: "ClinicaNutricionista", label: "Clínica Nutricionista 🥗" },
                    { value: "ClinicaOdontologica", label: "Clínica Odontológica 🦾" },
                    { value: "ClinicaPsicologica", label: "Clínica Psicológica 🧠" },
                    { value: "Estetica", label: "Estética 💆‍♀️" },
                    { value: "LashDesigner", label: "Lash Designer 👁️" },
                    { value: "NailDesigner", label: "Nail Designer 💅" },
                    { value: "SalaoDeBeleza", label: "Salão de Beleza 💇‍♀️" },
                    { value: "TecnicoInformatica", label: "Técnico de Informática 💻" },
                  ];

                  const selectedCategory = categories.find(cat => cat.value === field.value);
                  const filteredCategories = categories.filter(cat => 
                    cat.label.toLowerCase().includes(categorySearch.toLowerCase())
                  );

                  return (
                    <>
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            onClick={() => setIsCategoryDialogOpen(true)}
                          >
                            {selectedCategory ? selectedCategory.label : "Selecione a categoria"}
                            <ChevronRight className="ml-2 h-4 w-4 shrink-0" />
                          </Button>
                        </FormControl>
                        <FormMessage />
                      </FormItem>

                      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Selecione a Categoria</DialogTitle>
                            <DialogDescription>
                              Escolha a categoria que melhor representa seu negócio
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Buscar categoria..."
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                            <div className="max-h-[400px] overflow-y-auto space-y-1">
                              {filteredCategories.length > 0 ? (
                                filteredCategories.map((category) => (
                                  <Button
                                    key={category.value}
                                    type="button"
                                    variant={field.value === category.value ? "secondary" : "ghost"}
                                    className="w-full justify-start text-left h-auto py-3"
                                    onClick={() => {
                                      field.onChange(category.value);
                                      setIsCategoryDialogOpen(false);
                                      setCategorySearch('');
                                    }}
                                  >
                                    <span className="text-base">{category.label}</span>
                                  </Button>
                                ))
                              ) : (
                                <p className="text-center text-muted-foreground py-8">
                                  Nenhuma categoria encontrada
                                </p>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  );
                }}
              />

              <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium">Endereço</h4>
                  <p className="text-xs text-muted-foreground">Digite o CEP para preencher automaticamente</p>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={control}
                    name="endereco.cep"
                    render={({ field }) => (
                      <FormItem className="md:col-span-1 relative">
                        <FormLabel>CEP *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: 01310100"
                            {...field}
                            inputMode="numeric"
                            maxLength={8}
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                            className="pr-10"
                          />
                        </FormControl>
                        {isFetchingCep && (
                          <Loader2 className="absolute right-3 top-9 h-4 w-4 animate-spin text-primary" />
                        )}
                        <p className="text-xs text-muted-foreground mt-1">8 dígitos sem traço</p>
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
                            <Input 
                              placeholder="Rua das Flores" 
                              {...field} 
                              readOnly
                              className="bg-muted/50 cursor-not-allowed"
                            />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">Preenchido automaticamente pelo CEP</p>
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
                        <FormLabel>Número *</FormLabel>
                        <FormControl>
                            <Input 
                              placeholder="Ex: 123" 
                              {...field} 
                              maxLength={10}
                              className="border-primary/50"
                            />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">Editável</p>
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
                            <Input 
                              placeholder="Centro" 
                              {...field}
                              readOnly
                              className="bg-muted/50 cursor-not-allowed"
                            />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">Preenchido automaticamente pelo CEP</p>
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
                                <Input 
                                  placeholder="São Paulo" 
                                  {...field}
                                  readOnly
                                  className="bg-muted/50 cursor-not-allowed"
                                />
                            </FormControl>
                            <p className="text-xs text-muted-foreground mt-1">Preenchido automaticamente</p>
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
                                <Input 
                                  placeholder="SP" 
                                  {...field}
                                  readOnly
                                  className="bg-muted/50 cursor-not-allowed"
                                  maxLength={2}
                                />
                            </FormControl>
                            <p className="text-xs text-muted-foreground mt-1">Preenchido automaticamente</p>
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
      case 2: // Planos de Saúde (apenas para clínicas) ou Notificações
        // Se for clínica, case 2 é Planos de Saúde
        if (isClinica && steps[2]?.title === "Planos de Saúde") {
          return (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/20">
                <p className="text-sm text-muted-foreground mb-4">
                  Configure os planos de saúde e odontológicos que sua clínica aceita. Isso facilitará o agendamento e controle.
                </p>
                <HealthInsuranceManager categoria={categoriaAtual} />
              </div>
            </div>
          );
        }
        // Caso contrário, é Notificações
        return (
          <div className="space-y-6">
              <FormField
                control={control}
                name="habilitarLembrete24h"
                render={({ field }) => (
                  <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                    <div className="space-y-0.5 flex-1">
                      <FormLabel className="text-base">🔔 Lembrete de 24h</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        <strong>Como funciona:</strong> Sistema envia mensagem automática 24 horas antes do horário agendado.<br/>
                        <strong>Para que serve:</strong> Reduz faltas lembrando o cliente com antecedência.
                      </p>
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
                  <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                    <div className="space-y-0.5 flex-1">
                      <FormLabel className="text-base">⏰ Lembrete de 2h</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        <strong>Como funciona:</strong> Mensagem enviada 2 horas antes do atendimento.<br/>
                        <strong>Para que serve:</strong> Último aviso para evitar esquecimentos de última hora.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="habilitarAniversario"
                render={({ field }) => (
                  <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                    <div className="space-y-0.5 flex-1">
                      <FormLabel className="text-base">🎂 Mensagem de Aniversário</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        <strong>Como funciona:</strong> No dia do aniversário do cliente, envia felicitações automáticas.<br/>
                        <strong>Para que serve:</strong> Fideliza clientes mostrando cuidado e atenção pessoal.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="notificarClienteAgendamento"
                render={({ field }) => (
                  <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                    <div className="space-y-0.5 flex-1">
                      <FormLabel className="text-base">✅ Confirmação de Agendamento</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        <strong>Como funciona:</strong> Envia mensagem de confirmação para o cliente assim que um agendamento é criado.<br/>
                        <strong>Para que serve:</strong> Confirma o horário marcado e passa segurança para o cliente.
                      </p>
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
                    name="habilitarEscalonamento"
                    render={({ field }) => (
                      <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-0.5 flex-1">
                          <FormLabel>👤 Escalonamento Humano</FormLabel>
                          <FormDescription>
                            <strong>Como funciona:</strong> Quando a IA não souber responder, transfere conversa para um atendente humano.<br/>
                            <strong>Para que serve:</strong> Garante que nenhum cliente fique sem atendimento em situações complexas.
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
      case 3: // Notificações (para clínicas no setup) ou Configurações de IA
        // Se for clínica no setup mode, case 3 são Notificações
        if (isClinica && isSetupMode && steps[3]?.title === "Notificações") {
          return (
            <div className="space-y-6">
              <FormField
                control={control}
                name="habilitarLembrete24h"
                render={({ field }) => (
                  <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                    <div className="space-y-0.5 flex-1">
                      <FormLabel className="text-base">🔔 Lembrete de 24h</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        <strong>Como funciona:</strong> Sistema envia mensagem automática 24 horas antes do horário agendado.<br/>
                        <strong>Para que serve:</strong> Reduz faltas lembrando o cliente com antecedência.
                      </p>
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
                  <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                    <div className="space-y-0.5 flex-1">
                      <FormLabel className="text-base">⏰ Lembrete de 2h</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        <strong>Como funciona:</strong> Mensagem enviada 2 horas antes do atendimento.<br/>
                        <strong>Para que serve:</strong> Último aviso para evitar esquecimentos de última hora.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="habilitarAniversario"
                render={({ field }) => (
                  <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                    <div className="space-y-0.5 flex-1">
                      <FormLabel className="text-base">🎂 Mensagem de Aniversário</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        <strong>Como funciona:</strong> No dia do aniversário do cliente, envia felicitações automáticas.<br/>
                        <strong>Para que serve:</strong> Fideliza clientes mostrando cuidado e atenção pessoal.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="notificarClienteAgendamento"
                render={({ field }) => (
                  <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                    <div className="space-y-0.5 flex-1">
                      <FormLabel className="text-base">✅ Confirmação de Agendamento</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        <strong>Como funciona:</strong> Envia mensagem de confirmação para o cliente assim que um agendamento é criado.<br/>
                        <strong>Para que serve:</strong> Confirma o horário marcado e passa segurança para o cliente.
                      </p>
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
                  name="habilitarEscalonamento"
                  render={({ field }) => (
                    <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-0.5 flex-1">
                        <FormLabel>👤 Escalonamento Humano</FormLabel>
                        <FormDescription>
                          <strong>Como funciona:</strong> Quando a IA não souber responder, transfere conversa para um atendente humano.<br/>
                          <strong>Para que serve:</strong> Garante que nenhum cliente fique sem atendimento em situações complexas.
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
                        <FormLabel>Número para Escalonamento *</FormLabel>
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
        }
        // Caso contrário, é Configurações de IA
        return (
           <div className="space-y-4">
              <FormField
                control={control}
                name="iaAtiva"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Status da IA</FormLabel>
                      <FormDescription>
                        Ative ou desative o atendimento automático por IA. Quando desativado, a IA não responderá mensagens.
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
            <Tabs defaultValue="business" className="w-full">
              <TabsList className={cn(
                "grid w-full gap-2 h-auto p-1",
                isClinica ? "grid-cols-3 lg:grid-cols-5" : "grid-cols-2 lg:grid-cols-4"
              )}>
                <TabsTrigger value="business" className="flex items-center gap-2 py-3">
                  <Building2 className="h-5 w-5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Negócio</span>
                </TabsTrigger>
                <TabsTrigger value="hours" className="flex items-center gap-2 py-3">
                  <Clock className="h-5 w-5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Horários</span>
                </TabsTrigger>
                {isClinica && (
                  <TabsTrigger value="health" className="flex items-center gap-2 py-3">
                    <Heart className="h-5 w-5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Planos</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="notifications" className="flex items-center gap-2 py-3">
                  <Bell className="h-5 w-5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Notificações</span>
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2 py-3">
                  <Bot className="h-5 w-5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">IA</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="business" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Dados do Negócio
                    </CardTitle>
                    <CardDescription>
                      Informações básicas e endereço do seu estabelecimento
                    </CardDescription>
                  </CardHeader>
                  <CardContent>{renderStepContent(0)}</CardContent>
                </Card>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="hours" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Horários de Funcionamento
                    </CardTitle>
                    <CardDescription>
                      Configure os dias e horários que seu negócio está aberto
                    </CardDescription>
                  </CardHeader>
                  <CardContent>{renderStepContent(1)}</CardContent>
                </Card>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </TabsContent>

              {isClinica && (
                <TabsContent value="health" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5" />
                        Planos de Saúde
                      </CardTitle>
                      <CardDescription>
                        Configure os planos de saúde e odontológicos que sua clínica aceita
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <HealthInsuranceManager categoria={categoriaAtual} />
                    </CardContent>
                  </Card>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Alterações
                    </Button>
                  </div>
                </TabsContent>
              )}

              <TabsContent value="notifications" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notificações
                    </CardTitle>
                    <CardDescription>
                      Configure lembretes e notificações para seus clientes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Notificações condicionais baseadas nas features do plano */}
                    <div className="space-y-6">
                      {/* Aviso Gestor - SEMPRE aparece (não depende de WhatsApp) */}
                      <FormField
                        control={control}
                        name="notificarGestorAgendamento"
                        render={({ field }) => (
                          <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4 bg-blue-50 dark:bg-blue-950">
                            <div className="space-y-0.5 flex-1">
                              <FormLabel className="text-base">🔔 Aviso ao Gestor</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                <strong>Como funciona:</strong> Notifica o gestor sobre novos agendamentos e cancelamentos.<br/>
                                <strong>Para que serve:</strong> Mantém você informado em tempo real. <strong>Não requer WhatsApp conectado.</strong>
                              </p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {/* Lembrete 24h - Só aparece se plano tiver */}
                      {hasFeature('lembrete_24h') && (
                        <FormField
                          control={control}
                          name="habilitarLembrete24h"
                          render={({ field }) => (
                            <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                              <div className="space-y-0.5 flex-1">
                                <FormLabel className="text-base">🔔 Lembrete de 24h</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  <strong>Como funciona:</strong> Sistema envia mensagem automática 24 horas antes do horário agendado.<br/>
                                  <strong>Para que serve:</strong> Reduz faltas lembrando o cliente com antecedência.
                                </p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Lembrete 2h - Só aparece se plano tiver */}
                      {hasFeature('lembrete_2h') && (
                        <FormField
                          control={control}
                          name="habilitarLembrete2h"
                          render={({ field }) => (
                            <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                              <div className="space-y-0.5 flex-1">
                                <FormLabel className="text-base">⏰ Lembrete de 2h</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  <strong>Como funciona:</strong> Envia lembrete 2 horas antes da consulta.<br/>
                                  <strong>Para que serve:</strong> Reforça o compromisso próximo ao horário.
                                </p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Lembrete Aniversário - Só aparece se plano tiver */}
                      {hasFeature('lembrete_aniversario') && (
                        <FormField
                          control={control}
                          name="habilitarAniversario"
                          render={({ field }) => (
                            <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                              <div className="space-y-0.5 flex-1">
                                <FormLabel className="text-base">🎂 Mensagem de Aniversário</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  <strong>Como funciona:</strong> Envia parabéns automático no dia do aniversário do cliente.<br/>
                                  <strong>Para que serve:</strong> Fortalece relacionamento e fidelização.
                                </p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Confirmação Cliente - Só aparece se plano tiver */}
                      {hasFeature('notificacao_cliente_agendamento') && (
                        <FormField
                          control={control}
                          name="notificarClienteAgendamento"
                          render={({ field }) => (
                            <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                              <div className="space-y-0.5 flex-1">
                                <FormLabel className="text-base">✅ Confirmação de Agendamento</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  <strong>Como funciona:</strong> Envia mensagem de confirmação para o cliente assim que um agendamento é criado.<br/>
                                  <strong>Para que serve:</strong> Confirma o horário marcado e passa segurança para o cliente.
                                </p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Feedback - Só aparece se plano tiver */}
                      {hasFeature('feedback_pos_atendimento') && (
                        <FormField
                          control={control}
                          name="habilitarFeedback"
                          render={({ field }) => (
                            <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4">
                              <div className="space-y-0.5 flex-1">
                                <FormLabel className="text-base">⭐ Feedback Pós-Atendimento</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  <strong>Como funciona:</strong> Após o atendimento, envia link para avaliação.<br/>
                                  <strong>Para que serve:</strong> Coleta avaliações e melhora a reputação online.
                                </p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                      {habilitarFeedback && (
                        <div className="ml-4 space-y-4 pl-4 border-l-2">
                          <FormField
                            control={control}
                            name="feedbackPlatform"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Plataforma de Avaliação</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione onde coletar avaliações" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="google">Google Meu Negócio</SelectItem>
                                    <SelectItem value="instagram">Instagram</SelectItem>
                                    <SelectItem value="custom">Link Personalizado</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={control}
                            name="feedbackLink"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Link para Avaliação</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      
                      {/* Escalonamento Humano - Só aparece se plano tiver */}
                      {hasFeature('escalonamento_humano') && (
                        <div className="space-y-4 rounded-lg border p-4">
                          <FormField
                            control={control}
                            name="habilitarEscalonamento"
                            render={({ field }) => (
                              <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-0.5 flex-1">
                                  <FormLabel className="text-base">👤 Escalonamento Humano</FormLabel>
                                  <p className="text-sm text-muted-foreground">
                                    <strong>Como funciona:</strong> Quando a IA não souber responder, transfere conversa para um atendente humano.<br/>
                                    <strong>Para que serve:</strong> Garante que nenhum cliente fique sem atendimento em situações complexas.
                                  </p>
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
                                  <FormLabel>Número para Escalonamento *</FormLabel>
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
                      )}
                    </div>
                  </CardContent>
                </Card>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      Configurações de IA
                    </CardTitle>
                    <CardDescription>
                      Personalize o assistente virtual do seu negócio
                    </CardDescription>
                  </CardHeader>
                  <CardContent>{renderStepContent(3)}</CardContent>
                </Card>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-6">
              {/* Título do Step Atual */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">{steps[currentStep]?.title || 'Configuração'}</h2>
                <p className="text-sm text-muted-foreground">
                  {currentStep === 0 && "Configure as informações básicas do seu negócio"}
                  {currentStep === 1 && "Defina os horários de funcionamento do seu estabelecimento"}
                  {currentStep === 2 && isClinica && steps[2]?.title === "Planos de Saúde" && "Configure os planos de saúde aceitos pela sua clínica"}
                  {currentStep === 2 && (!isClinica || steps[2]?.title !== "Planos de Saúde") && "Configure as notificações e lembretes para seus clientes"}
                  {currentStep === 3 && "Configure as notificações e lembretes para seus clientes"}
                </p>
              </div>
              <div className="min-h-[350px]">{renderStepContent(currentStep)}</div>
            </div>
          )}

          {isSetupMode && (
            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-between items-center mt-8 pt-6 border-t">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onLogout} 
                size="sm"
                className="w-full sm:w-auto text-muted-foreground"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>

              <div className="flex gap-2 w-full sm:w-auto">
                {currentStep > 0 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setCurrentStep((s) => s - 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                    className="flex-1 sm:w-32"
                  >
                    Voltar
                  </Button>
                )}
                {currentStep < steps.length - 1 && (
                  <Button 
                    type="button" 
                    onClick={handleNextStep} 
                    className="flex-1 sm:w-32"
                  >
                    Avançar
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {currentStep === steps.length - 1 && (
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="flex-1 sm:w-auto"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Salvando...' : 'Salvar e Concluir'}
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
