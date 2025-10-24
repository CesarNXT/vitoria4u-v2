'use client'

import * as React from 'react'
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
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Loader2, Upload, X, Bell, BellOff, Calendar, CalendarX } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Profissional, HorarioTrabalho } from '@/lib/types'
import BusinessAgendaForm from '../configuracoes/business-agenda-form'
import { Separator } from '@/components/ui/separator'
import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useScrollToError } from '@/lib/form-utils'
import Image from 'next/image'
import { cn, formatPhoneNumber, formatPhoneInput } from '@/lib/utils';
import { handleError, getErrorMessage } from '@/lib/error-handler';
import { getAuth } from 'firebase/auth'
import { saveOrUpdateDocument } from '@/lib/firestore'
import { ProfessionalBlocksManager } from './professional-blocks-manager'

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


const professionalFormSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres.'),
  phone: z.string().refine(v => {
    const digits = String(v).replace(/\D/g, "").length;
    return digits === 11;
  }, {
    message: "O celular deve ter 11 dígitos (DDD + 9 + número). Exemplo: 11999887766"
  }),
  status: z.enum(['Ativo', 'Inativo']),
  notificarAgendamentos: z.boolean().default(true),
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
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isBlocksModalOpen, setIsBlocksModalOpen] = useState(false);
  
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
      notificarAgendamentos: professional?.notificarAgendamentos ?? true,
      workHours: professional?.workHours || defaultWorkHours,
      avatarUrl: professional?.avatarUrl || "",
    },
    mode: 'onChange',
  })

  // Resetar formulário quando professional mudar (modo edição)
  React.useEffect(() => {
    if (professional) {
      // Usar setTimeout para evitar flushSync durante montagem
      setTimeout(() => {
        form.reset({
          name: professional.name || '',
          phone: formatPhoneNumber(String(professional.phone || "")),
          status: professional.status || 'Ativo',
          notificarAgendamentos: professional.notificarAgendamentos ?? true,
          workHours: professional.workHours || defaultWorkHours,
          avatarUrl: professional.avatarUrl || "",
        });
      }, 0);
    }
  }, [professional?.id]);

  // Scroll automático para primeiro erro
  useScrollToError(form.formState.errors);

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
      handleError(error, { context: 'Avatar upload' });
      toast({ variant: "destructive", title: "Erro no Upload", description: getErrorMessage(error) });
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
        notificarAgendamentos: data.notificarAgendamentos,
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
                      <Input placeholder="Nome do profissional" maxLength={120} {...field} />
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
                            type="tel"
                            placeholder="(00) 00000-0000"
                            {...field}
                            maxLength={15}
                            onChange={(e) => {
                                const formatted = formatPhoneInput(e.target.value);
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

          <FormField
            control={form.control}
            name="notificarAgendamentos"
            render={({ field }) => {
              // Armazenar o ícone para evitar mudança durante render
              const NotificationIcon = field.value ? Bell : BellOff;
              
              return (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      <NotificationIcon className="h-4 w-4" />
                      Notificações de Agendamentos
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Quando ativado, o profissional recebe notificações via WhatsApp sobre novos agendamentos e cancelamentos.
                    </div>
                  </div>
                  <FormControl>
                    <CustomSwitch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              );
            }}
          />


          <Separator />
          
          {/* Botão de Bloqueios - Apenas para profissionais existentes */}
          {professional && professional.id && (
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium">Bloqueios de Agenda</h3>
                <p className="text-sm text-muted-foreground">
                  Bloqueie períodos específicos (férias, folgas, etc)
                </p>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => setIsBlocksModalOpen(true)}
              >
                <CalendarX className="mr-2 h-4 w-4" />
                Gerenciar Bloqueios
              </Button>
            </div>
          )}

          {professional && professional.id && <Separator />}
          
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-medium">Horários de Trabalho</h3>
              <p className="text-sm text-muted-foreground">
                  Defina os horários específicos para este profissional. Se um dia estiver fechado para o negócio, ele também estará para o profissional.
              </p>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={() => setIsScheduleModalOpen(true)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Configurar Horários de Trabalho
            </Button>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || isUploading}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </Form>

      {/* Modal de Bloqueios */}
      {professional && professional.id && (
        <Dialog open={isBlocksModalOpen} onOpenChange={setIsBlocksModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Bloqueios de Agenda</DialogTitle>
              <DialogDescription>
                Gerencie os bloqueios de agenda de {professional.name}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-1 -mx-1">
              <ProfessionalBlocksManager
                profissionalId={professional.id}
                profissionalNome={professional.name}
                bloqueios={professional.datasBloqueadas || []}
                onSave={async (bloqueios) => {
                  try {
                    // Salvar bloqueios no Firestore
                    const auth = getAuth();
                    const userId = auth.currentUser?.uid;
                    if (!userId) {
                      console.error('[BLOQUEIOS] userId não encontrado');
                      toast({
                        variant: 'destructive',
                        title: 'Erro ao salvar',
                        description: 'Usuário não autenticado',
                      });
                      return;
                    }
                    
                    await saveOrUpdateDocument(
                      'profissionais',
                      professional.id,
                      { datasBloqueadas: bloqueios },
                      userId
                    );
                    
                    toast({
                      title: 'Bloqueios salvos!',
                      description: 'Os bloqueios foram atualizados com sucesso.',
                    });
                  } catch (error) {
                    console.error('[BLOQUEIOS] Erro ao salvar:', error);
                    toast({
                      variant: 'destructive',
                      title: 'Erro ao salvar',
                      description: 'Não foi possível salvar os bloqueios. Tente novamente.',
                    });
                  }
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Horários */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Horários de Trabalho</DialogTitle>
            <DialogDescription>
              Configure os dias e horários específicos deste profissional. Os dias fechados para o negócio também estarão fechados para o profissional.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1 -mx-1">
            <BusinessAgendaForm businessHours={businessHours} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsScheduleModalOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </FormProvider>
  )
}
