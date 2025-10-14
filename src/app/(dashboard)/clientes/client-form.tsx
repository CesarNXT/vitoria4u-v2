
'use client'

import { useForm } from 'react-hook-form'
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
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Loader2, Upload, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn, formatPhoneNumber } from '@/lib/utils'
import type { Cliente } from '@/lib/types'
import { useState, useEffect } from 'react'
import { useScrollToError } from '@/lib/form-utils'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import { CaptionProps, useDayPicker, useNavigation } from 'react-day-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { getAuth } from 'firebase/auth'

const clientFormSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres.'),
  phone: z.string().refine(v => String(v).replace(/\D/g, "").length === 11, {
    message: "O telefone deve ter 11 dígitos (DDD + número)."
  }),
  birthDate: z.date().optional(),
  status: z.enum(['Ativo', 'Inativo']),
  avatarUrl: z.string().optional(),
})

type ClientFormValues = z.infer<typeof clientFormSchema>

interface ClientFormProps {
  client: Cliente | null
  onSubmit: (data: ClientFormValues) => void
  isSubmitting: boolean
}

function CustomCaption(props: CaptionProps) {
  const { goToMonth, currentMonth } = useNavigation();
  const { fromDate, toDate, locale } = useDayPicker();

  const handleMonthChange = (value: string) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(parseInt(value, 10));
    goToMonth(newMonth);
  };

  const handleYearChange = (value: string) => {
    const newMonth = new Date(currentMonth);
    newMonth.setFullYear(parseInt(value, 10));
    goToMonth(newMonth);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2000, i), 'MMMM', { locale }),
  }));

  const years: number[] = [];
  const startYear = fromDate?.getFullYear() || 1950;
  const endYear = toDate?.getFullYear() || new Date().getFullYear();
  for (let i = startYear; i <= endYear; i++) {
    years.push(i);
  }

  return (
    <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
       <Select
        value={currentMonth.getMonth().toString()}
        onValueChange={handleMonthChange}
        aria-label="Mês"
      >
        <SelectTrigger className="w-[120px]" onClick={(e) => e.stopPropagation()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent onClick={(e) => e.stopPropagation()}>
          {months.map((month) => (
            <SelectItem key={month.value} value={month.value.toString()}>
              {month.label.charAt(0).toUpperCase() + month.label.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={currentMonth.getFullYear().toString()}
        onValueChange={handleYearChange}
        aria-label="Ano"
      >
        <SelectTrigger className="w-[80px]" onClick={(e) => e.stopPropagation()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent onClick={(e) => e.stopPropagation()}>
          {years.reverse().map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}


export function ClientForm({ client, onSubmit, isSubmitting }: ClientFormProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(client?.avatarUrl || null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || '',
      phone: formatPhoneNumber(String(client?.phone || "")),
      birthDate: client?.birthDate ? new Date(client.birthDate) : undefined,
      status: client?.status || 'Ativo',
      avatarUrl: client?.avatarUrl || undefined,
    },
    mode: 'onChange',
  })

  // Scroll automático para primeiro erro
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      useScrollToError(form.formState.errors);
    }
  }, [form.formState.errors]);

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
    setAvatarPreview(previewUrl);

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
      setAvatarPreview(client?.avatarUrl || null);
      form.setValue('avatarUrl', client?.avatarUrl || undefined);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(previewUrl);
    }
  };

  const removeImage = () => {
    setAvatarPreview(null);
    form.setValue('avatarUrl', undefined);
  }
  
  const calendarComponent = (field: any) => (
       <div onClick={(e) => e.stopPropagation()}>
         <Calendar
              mode="single"
              selected={field.value}
              onSelect={(date) => {
                  if (date) field.onChange(date);
                  setIsCalendarOpen(false);
              }}
              locale={ptBR}
              captionLayout="dropdown-buttons"
              fromYear={1950}
              toYear={new Date().getFullYear()}
              disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
              }
              initialFocus
              components={{
                  Caption: CustomCaption,
              }}
          />
       </div>
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem className="flex flex-col items-center">
              <FormLabel>Foto de Perfil (Opcional)</FormLabel>
              <div className="relative group w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                
                  {avatarPreview ? (
                    <>
                      <Image 
                        src={avatarPreview} 
                        alt="Preview do Cliente" 
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
                     <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center h-full text-muted-foreground w-full rounded-full">
                        {isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
                     </label>
                  )}
              </div>
              {!avatarPreview && (
                <Button asChild variant="outline" size="sm" className="mt-2" disabled={isUploading}>
                    <label htmlFor="image-upload" className="cursor-pointer">
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                        Adicionar Foto
                    </label>
                </Button>
              )}
              <FormControl>
                <Input
                  id="image-upload"
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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome do cliente" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            name="birthDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Data de Nascimento</FormLabel>
                 <FormControl>
                    <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <DialogTrigger asChild>
                            <Button
                                type="button"
                                variant={"outline"}
                                className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                                {field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? (
                                    format(field.value, "PPP", { locale: ptBR })
                                ) : (
                                    <span>Escolha uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="w-auto p-2 max-w-[calc(100vw-2rem)]">
                            <DialogHeader>
                                <DialogTitle className="sr-only">Data de Nascimento</DialogTitle>
                                <DialogDescription className="sr-only">Selecione a data de nascimento do cliente.</DialogDescription>
                            </DialogHeader>
                            {calendarComponent(field)}
                        </DialogContent>
                    </Dialog>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
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
        <Button type="submit" className="w-full" disabled={isSubmitting || isUploading}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </Form>
  )
}

    