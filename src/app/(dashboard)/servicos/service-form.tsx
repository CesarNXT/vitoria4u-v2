
'use client'

import { useState, useEffect } from "react"
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
import type { Servico, Profissional } from "@/lib/types"
import { useToast } from '@/hooks/use-toast'
import { getAuth } from 'firebase/auth'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { generateServiceDescription } from "./actions"
import { useMemo } from "react"

const serviceFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter no mínimo 3 caracteres."),
  description: z.string().optional(),
  price: z.number().min(0, "O preço não pode ser negativo."),
  duration: z.number().min(5, "A duração deve ser de no mínimo 5 minutos."),
  status: z.enum(["Ativo", "Inativo"]),
  professionals: z.array(z.string()).min(1, "Selecione pelo menos um profissional."),
  imageUrl: z.string().optional(),
  enableReturn: z.boolean().optional(),
  returnInDays: z.string().optional(),
})

type ServiceFormValues = z.infer<typeof serviceFormSchema>

interface ServiceFormProps {
  service: Servico | null
  professionals: Profissional[]
  onSubmit: (data: Omit<Servico, 'id' | 'professionals'> & { professionals: string[] }) => void
  isSubmitting: boolean
  businessCategory?: string;
}

export function ServiceForm({ service, professionals, onSubmit, isSubmitting, businessCategory }: ServiceFormProps) {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(service?.imageUrl || null)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [professionalsDialogOpen, setProfessionalsDialogOpen] = useState(false)
  const [professionalSearchTerm, setProfessionalSearchTerm] = useState('')

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: service?.name || "",
      description: service?.description || "",
      price: service?.price || 0,
      duration: service?.duration || 30,
      status: service?.status || "Ativo",
      professionals: service?.professionals.map(p => p.id) || [],
      imageUrl: service?.imageUrl || "",
      enableReturn: !!service?.returnInDays,
      returnInDays: service?.returnInDays ? String(service.returnInDays) : '',
    },
  })

  const enableReturn = form.watch("enableReturn");
  const selectedProfessionalIds = form.watch("professionals")
  
  const filteredProfessionals = useMemo(() => {
    if (!professionalSearchTerm) return professionals;
    const lower = professionalSearchTerm.toLowerCase();
    return professionals.filter(p => 
      p.name.toLowerCase().includes(lower)
    );
  }, [professionalSearchTerm, professionals]);

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
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      toast({ variant: "destructive", title: "Erro no Upload", description: errorMessage });
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
    const dataToSubmit = {
      ...data,
      returnInDays: data.enableReturn && data.returnInDays ? parseInt(data.returnInDays, 10) : null,
    };
    onSubmit(dataToSubmit);
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
      console.error("Error generating service description:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Gerar Descrição",
        description: "Não foi possível gerar a descrição. Tente novamente.",
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const onFormErrors = (errors: any) => {
    console.error("Erros de validação do formulário:", errors);
    toast({ 
      variant: "destructive",
      title: "Erro de Validação", 
      description: "Por favor, corrija os erros no formulário antes de salvar."
    });
  };

  const selectedProfessionalsDetails = professionals.filter(p => selectedProfessionalIds.includes(p.id));

  // Handle currency formatting
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = Number(rawValue) / 100;
    form.setValue('price', numericValue, { shouldValidate: true });
  }

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(form.watch('price') || 0);

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit, onFormErrors)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Serviço</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Corte Masculino" {...field} />
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
                  <Textarea placeholder="Descreva o serviço..." {...field} value={field.value ?? ''}/>
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
            name="price"
            render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="R$ 0,00"
                      value={formattedPrice}
                      onChange={handlePriceChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
            )}
            />
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
                        onCheckedChange={field.onChange}
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
                                {...field} 
                                onChange={e => {
                                    const value = e.target.value.replace(/\D/g, '');
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
                <DialogContent className="sm:max-w-[425px]">
                  <VisuallyHidden>
                    <DialogTitle>Selecione os profissionais</DialogTitle>
                  </VisuallyHidden>
                  <div className="space-y-4">
                    <Input
                      placeholder="Buscar profissional..."
                      value={professionalSearchTerm}
                      onChange={(e) => setProfessionalSearchTerm(e.target.value)}
                      autoFocus
                    />
                    <div className="max-h-[300px] overflow-y-auto space-y-1">
                      {filteredProfessionals.length > 0 ? (
                        filteredProfessionals.map((prof) => {
                          const isSelected = field.value.includes(prof.id);
                          return (
                            <Button
                              key={prof.id}
                              variant={isSelected ? "secondary" : "ghost"}
                              className="w-full justify-start"
                              onClick={() => {
                                const currentIds = field.value || [];
                                const newIds = currentIds.includes(prof.id)
                                  ? currentIds.filter((id) => id !== prof.id)
                                  : [...currentIds, prof.id];
                                field.onChange(newIds);
                              }}
                            >
                              {isSelected && (
                                <Check className="mr-2 h-4 w-4" />
                              )}
                              {prof.name}
                            </Button>
                          );
                        })
                      ) : (
                        <p className="text-center text-sm text-muted-foreground py-6">
                          Nenhum profissional encontrado
                        </p>
                      )}
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

        <Button type="submit" className="w-full" disabled={isSubmitting || isUploading || isGeneratingDescription}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Salvando...' : 'Salvar Serviço'}
        </Button>
      </form>
    </Form>
    </>
  )
}
