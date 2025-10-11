'use client'

import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Upload, X } from 'lucide-react'
import type { Profissional, HorarioTrabalho } from '@/lib/types'
import BusinessAgendaForm from '../configuracoes/business-agenda-form'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import { formatPhoneNumber } from '@/lib/utils'
import { getAuth } from 'firebase/auth'

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
});


const professionalFormSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres.'),
  phone: z.string().refine(v => String(v).replace(/\D/g, "").length === 11, {
    message: "O telefone deve ter 11 dígitos (DDD + número)."
  }),
  status: z.enum(['Ativo', 'Inativo']),
  workHours: z.object({
    domingo: daySchema,
    segunda: daySchema,
    terca: daySchema,
    quarta: daySchema,
    quinta: daySchema,
    sexta: daySchema,
    sabado: daySchema,
  }),
  avatarUrl: z.string().optional(),
})

type ProfessionalFormValues = z.infer<typeof professionalFormSchema>

interface ProfessionalFormProps {
  professional: Profissional | null
  onSubmit: (data: any) => void
  isSubmitting: boolean,
  businessHours: HorarioTrabalho | undefined | null
}

export function ProfessionalForm({ professional, onSubmit, isSubmitting, businessHours }: ProfessionalFormProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(professional?.avatarUrl || null);
  
  const defaultWorkHours = businessHours || {
        domingo: { enabled: false, slots: [] },
        segunda: { enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
        terca: { enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
        quarta: { enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
        quinta: { enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
        sexta: { enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
        sabado: { enabled: false, slots: [] },
  };
  
  const form = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalFormSchema),
    defaultValues: {
      name: professional?.name || '',
      phone: formatPhoneNumber(String(professional?.phone || "")),
      status: professional?.status || 'Ativo',
      workHours: professional?.workHours || defaultWorkHours,
      avatarUrl: professional?.avatarUrl || "",
    },
    mode: 'onChange',
  })

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

      const responseText = await response.text();

      if (response.ok && responseText.startsWith('http')) {
        form.setValue('avatarUrl', responseText);
        toast({ title: "Imagem carregada com sucesso!" });
      } else {
        throw new Error(`Falha no upload: ${responseText}`);
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      toast({ variant: "destructive", title: "Erro no Upload", description: errorMessage });
      setImagePreview(professional?.avatarUrl || null);
       form.setValue('avatarUrl', professional?.avatarUrl || "");
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(previewUrl);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    form.setValue('avatarUrl', "");
  }

  const handleFormSubmit = (data: ProfessionalFormValues) => {
    onSubmit({
        ...data,
        workHours: data.workHours,
    });
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
            <FormField
            control={form.control}
            name="avatarUrl"
            render={({ field }) => (
                <FormItem className="flex flex-col items-center">
                <FormLabel>Foto de Perfil (Opcional)</FormLabel>
                <div className="relative group w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    
                    {imagePreview ? (
                        <>
                        <Image 
                            src={imagePreview} 
                            alt="Preview do Profissional" 
                            fill 
                            sizes="128px"
                            className="object-cover rounded-full" 
                        />
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-0 right-0 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={removeImage}
                            disabled={isUploading || isSubmitting}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remover imagem</span>
                        </Button>
                        </>
                    ) : (
                        <label htmlFor="image-upload-prof" className="cursor-pointer flex flex-col items-center justify-center h-full text-muted-foreground w-full rounded-full">
                            {isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
                        </label>
                    )}
                </div>
                {!imagePreview && (
                    <Button asChild variant="outline" size="sm" className="mt-2" disabled={isUploading}>
                        <label htmlFor="image-upload-prof" className="cursor-pointer">
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                            Adicionar Foto
                        </label>
                    </Button>
                )}
                <FormControl>
                    <Input
                    id="image-upload-prof"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                      <Input placeholder="Nome do profissional" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                        <Input
                            placeholder="(99) 99999-9999"
                            inputMode="numeric"
                            {...field}
                            maxLength={15}
                            onChange={(e) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                field.onChange(formatted);
                            }}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
              />
              <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Status</FormLabel>
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
          </div>


          <Separator />
          
          <div>
            <h3 className="text-lg font-medium">Horários de Trabalho</h3>
            <p className="text-sm text-muted-foreground">
                Defina os horários específicos para este profissional. Se um dia estiver fechado para o negócio, ele também estará para o profissional.
            </p>
          </div>

          <BusinessAgendaForm businessHours={businessHours} />

          <Button type="submit" className="w-full" disabled={isSubmitting || isUploading}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </Form>
    </FormProvider>
  )
}
