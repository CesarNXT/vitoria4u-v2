
'use client'

import { useState, useEffect, useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Upload, X, WandSparkles, ChevronsUpDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Servico, Profissional, PlanoSaude } from "@/lib/types"
import { useToast } from '@/hooks/use-toast'
import { isCategoriaClinica } from '@/lib/categoria-utils'
import { getAuth } from 'firebase/auth'
import Image from 'next/image'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { cn, formatPhoneNumber } from '@/lib/utils';
import { handleError, getErrorMessage } from '@/lib/error-handler';
import { Switch } from "@/components/ui/switch"
import { generateServiceDescription } from "./actions"
import { useScrollToError } from '@/lib/form-utils'

const serviceFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter no mínimo 3 caracteres.").max(120, "O nome não pode ter mais de 120 caracteres."),
  description: z.string().max(800, "A descrição não pode ter mais de 800 caracteres.").optional(),
  price: z.number().min(0, "O preço não pode ser negativo.").max(100000, "O preço não pode ser maior que R$ 100.000,00."),
  priceType: z.enum(["fixed", "on_request", "starting_from"]),
  custo: z.number().min(0, "O custo não pode ser negativo.").max(100000, "O custo não pode ser maior que R$ 100.000,00.").optional(),
  duration: z.number().min(5, "A duração deve ser de no mínimo 5 minutos."),
  status: z.enum(["Ativo", "Inativo"]),
  professionals: z.array(z.string()).min(1, "Selecione pelo menos um profissional."),
  imageUrl: z.string().optional(),
  enableReturn: z.boolean().optional(),
  returnInDays: z.string().optional(),
  planosAceitos: z.array(z.string()).optional(), // IDs dos planos aceitos
})

type ServiceFormValues = z.infer<typeof serviceFormSchema>

interface ServiceFormProps {
  service: Servico | null
  professionals: Profissional[]
  planosSaudeDisponiveis?: PlanoSaude[] // Planos cadastrados no negócio
  onSubmit: (data: Omit<Servico, 'id' | 'professionals'> & { professionals: string[], planosAceitos?: string[] }) => void
  isSubmitting: boolean
  businessCategory?: string;
}

export function ServiceForm({ service, professionals, planosSaudeDisponiveis = [], onSubmit, isSubmitting, businessCategory }: ServiceFormProps) {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(service?.imageUrl || null)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [professionalsDialogOpen, setProfessionalsDialogOpen] = useState(false)
  const [professionalSearchTerm, setProfessionalSearchTerm] = useState('')
  const [planosDialogOpen, setPlanosDialogOpen] = useState(false)
  const [planoSearchTerm, setPlanoSearchTerm] = useState('')

  const isClinica = isCategoriaClinica(businessCategory);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: service?.name || "",
      description: service?.description || "",
      price: service?.price || 0,
      priceType: service?.priceType || "fixed",
      custo: service?.custo || 0,
      duration: service?.duration || 30,
      status: service?.status || "Ativo",
      professionals: service?.professionals.map(p => p.id) || [],
      imageUrl: service?.imageUrl || "",
      enableReturn: !!service?.returnInDays,
      returnInDays: service?.returnInDays ? String(service.returnInDays) : '',
      planosAceitos: service?.planosAceitos?.map(p => p.id) || [],
    },
  })

  const enableReturn = form.watch("enableReturn");
  const priceType = form.watch("priceType");
  const selectedProfessionalIds = form.watch("professionals")
  const selectedPlanosIds = form.watch("planosAceitos")
  
  // Scroll automático para primeiro erro
  useScrollToError(form.formState.errors);
  
  const filteredProfessionals = useMemo(() => {
    if (!professionalSearchTerm) return professionals;
    const lower = professionalSearchTerm.toLowerCase();
    return professionals.filter(p => 
      p.name.toLowerCase().includes(lower)
    );
  }, [professionalSearchTerm, professionals]);

  const filteredPlanos = useMemo(() => {
    if (!planoSearchTerm) return planosSaudeDisponiveis;
    const lower = planoSearchTerm.toLowerCase();
    return planosSaudeDisponiveis.filter(p => 
      p.nome.toLowerCase().includes(lower)
    );
  }, [planoSearchTerm, planosSaudeDisponiveis]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024 * 1024) { // 200MB limit for catbox
        toast({
            variant: "destructive",
            title: "Arquivo muito grande",
            description: "O tamanho máximo do arquivo é 200MB.",
        });
        return;
    }

    setIsUploading(true);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', file);
    formData.append('userhash', '');

    try {
      const user = getAuth().currentUser;
      if (!user) {
        toast({ variant: "destructive", title: "Erro de Autenticação", description: "Você precisa estar logado para fazer upload." });
        setIsUploading(false);
        return;
      }
      const token = await user.getIdToken();

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const responseText = await response.text();
        if (responseText.startsWith('http')) {
          form.setValue('imageUrl', responseText);
          toast({ title: "Imagem carregada com sucesso!" });
        } else {
           throw new Error(`Falha no upload: ${responseText}`);
        }
      } else {
        const errorText = await response.text();
        throw new Error(`Falha no upload: ${errorText}`);
      }
    } catch (error) {
      handleError(error, { context: 'Image upload' });
      toast({ variant: "destructive", title: "Erro no Upload", description: getErrorMessage(error) });
      setImagePreview(service?.imageUrl || null);
       form.setValue('imageUrl', service?.imageUrl || "");
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(previewUrl);
    }
  };
  const removeImage = () => {
    setImagePreview(null);
    form.setValue('imageUrl', "");
  }

  const handleFormSubmit = (data: ServiceFormValues) => {
    const { planosAceitos, ...rest } = data;
    const dataToSubmit = {
      ...rest,
      returnInDays: data.enableReturn && data.returnInDays ? parseInt(data.returnInDays, 10) : null,
      planosAceitos: planosAceitos as string[] | undefined, // IDs dos planos
    };
    onSubmit(dataToSubmit as any); // Type assertion necessária devido à complexidade do tipo
  }
  
  const handleGenerateDescription = async () => {
    const serviceName = form.getValues("name");
    if (!serviceName) {
      toast({
        variant: "destructive",
        title: "Nome do Serviço Vazio",
        description: "Por favor, insira um nome para o serviço antes de gerar a descrição.",
      });
      return;
    }
     if (!businessCategory) {
      toast({
        variant: "destructive",
        title: "Categoria do Negócio Indefinida",
        description: "Não foi possível encontrar a categoria do seu negócio. Salve suas configurações primeiro.",
      });
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const result = await generateServiceDescription({ serviceName, businessCategory });
      form.setValue("description", result.description, { shouldValidate: true });
      toast({
        title: "Descrição Gerada!",
        description: "A descrição do serviço foi gerada com sucesso.",
      });
    } catch (error) {
      handleError(error, { context: 'Generate service description' });
      toast({
        variant: "destructive",
        title: "Erro ao Gerar Descrição",
        description: "Não foi possível gerar a descrição. Tente novamente.",
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Scroll automático para o primeiro erro (sem toast)

  const selectedProfessionalsDetails = professionals.filter(p => selectedProfessionalIds.includes(p.id));
  const selectedPlanosDetails = planosSaudeDisponiveis.filter(p => selectedPlanosIds?.includes(p.id));

  // Handle currency formatting
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = Number(rawValue) / 100;
    if (numericValue <= 100000) {
      form.setValue('price', numericValue, { shouldValidate: true });
    }
  }

  const handleCustoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = Number(rawValue) / 100;
    if (numericValue <= 100000) {
      form.setValue('custo', numericValue, { shouldValidate: true });
    }
  }

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(form.watch('price') || 0);

  const formattedCusto = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(form.watch('custo') || 0);

  const price = form.watch('price') || 0;
  const custo = form.watch('custo') || 0;
  const lucro = price - custo;
  const margemPercentual = price > 0 ? ((lucro / price) * 100).toFixed(1) : '0.0';

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Serviço</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Corte Masculino" maxLength={120} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (Opcional)</FormLabel>
              <div className="relative">
                <FormControl>
                  <Textarea placeholder="Descreva o serviço..." maxLength={800} {...field} value={field.value ?? ''}/>
                </FormControl>
                <Button 
                    type="button" 
                    size="icon" 
                    variant="ghost" 
                    className="absolute bottom-2 right-2 h-7 w-7 text-primary hover:text-primary"
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDescription}
                >
                    {isGeneratingDescription ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <WandSparkles className="h-4 w-4" />
                    )}
                    <span className="sr-only">Gerar descrição com IA</span>
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="priceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Precificação</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fixed">Preço Fixo</SelectItem>
                      <SelectItem value="starting_from">A partir de</SelectItem>
                      <SelectItem value="on_request">Sob Orçamento</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {priceType === 'fixed' && 'Preço fixo do serviço'}
                    {priceType === 'starting_from' && 'Mostra "A partir de R$ X"'}
                    {priceType === 'on_request' && 'Mostra "Sob orçamento"'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={priceType === 'on_request' ? 'R$ 0,00 (opcional)' : 'R$ 0,00'}
                      value={formattedPrice}
                      onChange={handlePriceChange}
                      disabled={priceType === 'on_request'}
                    />
                  </FormControl>
                  {priceType === 'on_request' && (
                    <FormDescription className="text-xs">
                      Campo desabilitado para "Sob Orçamento"
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duração (min)</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                defaultValue={String(field.value)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360].map(minutes => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {minutes} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 rounded-lg border border-dashed p-4 bg-muted/20">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            💰 Controle Financeiro (Opcional)
          </div>
          <FormField
            control={form.control}
            name="custo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custo Médio do Serviço (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="R$ 0,00"
                    value={formattedCusto}
                    onChange={handleCustoChange}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Inclua custos de produtos, materiais e insumos utilizados neste serviço
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {(price > 0 || custo > 0) && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Preço</p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{formattedPrice}</p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Custo</p>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">{formattedCusto}</p>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Lucro</p>
                <p className="text-sm font-bold text-green-700 dark:text-green-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lucro)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">({margemPercentual}%)</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-4 rounded-lg border p-4">
            <FormField
                control={form.control}
                name="enableReturn"
                render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                    <FormLabel>Lembrete de Retorno</FormLabel>
                     <FormDescription>
                        Ativar lembretes para os clientes retornarem.
                    </FormDescription>
                    </div>
                    <FormControl>
                    <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          // Usar setTimeout para evitar flushSync durante renderização
                          setTimeout(() => field.onChange(checked), 0);
                        }}
                    />
                    </FormControl>
                </FormItem>
                )}
            />
            {enableReturn && (
                <FormField
                    control={form.control}
                    name="returnInDays"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Lembrar após (dias)</FormLabel>
                        <FormControl>
                            <Input 
                                type="text"
                                inputMode="numeric"
                                maxLength={3}
                                {...field} 
                                onChange={e => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                                    field.onChange(value);
                                }}
                                value={field.value || ''}
                                placeholder="Ex: 30"
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>

        {/* Status do Serviço - Linha separada */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status do Serviço</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Profissionais - Linha separada com mais espaço */}
        <FormField
          control={form.control}
          name="professionals"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Profissionais que realizam</FormLabel>
              <FormControl>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProfessionalsDialogOpen(true)}
                  className={cn(
                    "w-full justify-between",
                    !field.value.length && "text-muted-foreground"
                  )}
                >
                  <span className="truncate">
                    {selectedProfessionalsDetails.length > 0 
                      ? selectedProfessionalsDetails.map(p => p.name).join(', ')
                      : "Selecione os profissionais"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
              
              <Dialog open={professionalsDialogOpen} onOpenChange={setProfessionalsDialogOpen}>
                <DialogContent className="max-w-[90vw] sm:max-w-[425px] overflow-hidden">
                  <VisuallyHidden>
                    <DialogTitle>Selecione os profissionais</DialogTitle>
                    <DialogDescription>Escolha os profissionais que executarão este serviço</DialogDescription>
                  </VisuallyHidden>
                  <div className="space-y-4 min-w-0">
                    <Input
                      placeholder="Buscar profissional..."
                      value={professionalSearchTerm}
                      onChange={(e) => setProfessionalSearchTerm(e.target.value)}
                    />
                    <div className="max-h-[300px] overflow-y-auto space-y-1">
                      {filteredProfessionals.length > 0 ? (
                        filteredProfessionals.map((prof) => {
                          const isSelected = field.value.includes(prof.id);
                          const isInactive = prof.status === 'Inativo';
                          return (
                            <Button
                              key={prof.id}
                              variant={isSelected ? "secondary" : "ghost"}
                              className={cn(
                                "w-full justify-start min-w-0",
                                isInactive && "opacity-50 cursor-not-allowed grayscale hover:bg-transparent"
                              )}
                              onClick={() => {
                                if (isInactive) {
                                  toast({
                                    variant: "destructive",
                                    title: "Profissional Inativo",
                                    description: `${prof.name} está inativo e não pode ser selecionado. Ative o profissional primeiro.`,
                                  });
                                  return;
                                }
                                const currentIds = field.value || [];
                                const newIds = currentIds.includes(prof.id)
                                  ? currentIds.filter((id) => id !== prof.id)
                                  : [...currentIds, prof.id];
                                field.onChange(newIds);
                              }}
                              disabled={isInactive}
                            >
                              {isSelected && (
                                <Check className="mr-2 h-4 w-4 flex-shrink-0" />
                              )}
                              <span className="truncate block min-w-0 flex-1 text-left">{prof.name}</span>
                              {isInactive && (
                                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">(Inativo)</span>
                              )}
                            </Button>
                          );
                        })
                      ) : (
                        <p className="text-center text-sm text-muted-foreground py-6">
                          Nenhum profissional encontrado
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        type="button"
                        onClick={() => setProfessionalsDialogOpen(false)}
                        className="w-full sm:w-auto"
                      >
                        Salvar Seleção
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem className="flex flex-col items-center">
              <FormLabel>Imagem do Serviço (Opcional)</FormLabel>
              <div className="relative group w-48 h-48 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                {imagePreview ? (
                  <>
                    <Image 
                      src={imagePreview} 
                      alt="Preview do Serviço" 
                      fill 
                      sizes="192px"
                      className="object-cover rounded-md" 
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={removeImage}
                      disabled={isUploading || isSubmitting}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remover imagem</span>
                    </Button>
                  </>
                ) : (
                   <label htmlFor="image-upload-service" className="cursor-pointer flex flex-col items-center justify-center h-full text-muted-foreground w-full rounded-md">
                      {isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
                   </label>
                )}
              </div>
              {!imagePreview && (
                <Button asChild variant="outline" size="sm" className="mt-2" disabled={isUploading}>
                    <label htmlFor="image-upload-service" className="cursor-pointer">
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                        Adicionar Imagem
                    </label>
                </Button>
              )}
              <FormControl>
                <Input
                  id="image-upload-service"
                  type="file"
                  className="hidden"
                  onChange={handleImageUpload}
                  accept="image/*"
                  disabled={isUploading || isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Planos de Saúde Aceitos - Só aparece para clínicas */}
        {isClinica && planosSaudeDisponiveis.length > 0 && (
          <FormField
            control={form.control}
            name="planosAceitos"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Planos de Saúde Aceitos (Opcional)</FormLabel>
                <FormDescription>
                  Selecione quais planos de saúde aceitam este serviço. Deixe em branco para aceitar todos.
                </FormDescription>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    onClick={() => setPlanosDialogOpen(true)}
                    className={cn(
                      "w-full justify-between",
                      !field.value?.length && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate">
                      {selectedPlanosDetails.length > 0 
                        ? selectedPlanosDetails.map(p => p.nome).join(', ')
                        : "Selecione os planos de saúde"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
                
                <Dialog open={planosDialogOpen} onOpenChange={setPlanosDialogOpen}>
                  <DialogContent className="max-w-[90vw] sm:max-w-[425px] overflow-hidden">
                    <VisuallyHidden>
                      <DialogTitle>Selecione os planos de saúde</DialogTitle>
                      <DialogDescription>Escolha os planos de saúde aceitos para este serviço</DialogDescription>
                    </VisuallyHidden>
                    <div className="space-y-4 min-w-0">
                      <Input
                        placeholder="Buscar plano..."
                        value={planoSearchTerm}
                        onChange={(e) => setPlanoSearchTerm(e.target.value)}
                      />
                      <div className="max-h-[300px] overflow-y-auto space-y-1">
                        {filteredPlanos.length > 0 ? (
                          filteredPlanos.map((plano) => {
                            const isSelected = field.value?.includes(plano.id);
                            return (
                              <Button
                                key={plano.id}
                                variant={isSelected ? "secondary" : "ghost"}
                                className="w-full justify-start min-w-0"
                                onClick={() => {
                                  const currentIds = field.value || [];
                                  const newIds = currentIds.includes(plano.id)
                                    ? currentIds.filter((id) => id !== plano.id)
                                    : [...currentIds, plano.id];
                                  field.onChange(newIds);
                                }}
                              >
                                {isSelected && (
                                  <Check className="mr-2 h-4 w-4 flex-shrink-0" />
                                )}
                                <span className="truncate block min-w-0 flex-1 text-left">{plano.nome}</span>
                              </Button>
                            );
                          })
                        ) : (
                          <p className="text-center text-sm text-muted-foreground py-6">
                            Nenhum plano encontrado
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                          type="button"
                          onClick={() => setPlanosDialogOpen(false)}
                          className="w-full sm:w-auto"
                        >
                          Salvar Seleção
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting || isUploading || isGeneratingDescription}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Salvando...' : 'Salvar Serviço'}
        </Button>
      </form>
    </Form>
    </>
  )
}
