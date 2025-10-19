
"use client"

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useScrollToError } from '@/lib/form-utils';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StandardDatePicker } from "@/components/ui/standard-date-picker";
import { cn } from "@/lib/utils";
import type { DataBloqueada } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";


const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

const blockFormSchema = z.object({
  reason: z.string().max(120, "O motivo não pode ter mais de 120 caracteres.").optional(),
  startDate: z.date({ required_error: "A data de início é obrigatória." }),
  startTime: z.string({ required_error: "A hora de início é obrigatória." }),
  endDate: z.date({ required_error: "A data de término é obrigatória." }),
  endTime: z.string({ required_error: "A hora de término é obrigatória." }),
}).refine(data => {
    if (!data.startDate || !data.endDate || !data.startTime || !data.endTime) return false;
    const startDateTime = new Date(data.startDate);
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    if (startHour === undefined || startMinute === undefined) return false;
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(data.endDate);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    if (endHour === undefined || endMinute === undefined) return false;
    endDateTime.setHours(endHour, endMinute, 0, 0);

    return endDateTime > startDateTime;
}, {
    message: "A data/hora de término deve ser posterior à data/hora de início.",
    path: ["endTime"],
});

type BlockFormValues = z.infer<typeof blockFormSchema>;

interface AppointmentBlockFormProps {
  block: DataBloqueada | null;
  onSubmit: (data: Omit<DataBloqueada, 'id'>) => void;
  isSubmitting: boolean;
  isPastBlock?: boolean;
}

export function AppointmentBlockForm({ block, onSubmit, isSubmitting, isPastBlock = false }: AppointmentBlockFormProps) {
  const isMobile = useIsMobile();
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  
  const form = useForm<BlockFormValues>({
    resolver: zodResolver(blockFormSchema),
    mode: "onChange",
    defaultValues: block ? {
      reason: block.reason,
      startDate: new Date(block.startDate),
      startTime: format(new Date(block.startDate), 'HH:mm'),
      endDate: new Date(block.endDate),
      endTime: format(new Date(block.endDate), 'HH:mm'),
    } : {
      reason: undefined,
      startDate: new Date(),
      startTime: '07:00',
      endDate: new Date(),
      endTime: '08:00',
    },
  });

  const { watch, setValue, trigger, formState } = form;
  const startDateValue = watch('startDate');
  const startTimeValue = watch('startTime');

  // Scroll automático para primeiro erro
  useEffect(() => {
    if (Object.keys(formState.errors).length > 0) {
      useScrollToError(formState.errors);
    }
  }, [formState.errors]);

  // Auto-update endDate when startDate changes (apenas para novos bloqueios)
  useEffect(() => {
    if (startDateValue && !block) {
        setValue('endDate', startDateValue);
        trigger(['startDate', 'endDate']);
    }
  }, [startDateValue, setValue, trigger, block]);

  // Auto-update endTime when startTime changes (apenas para novos bloqueios)
  useEffect(() => {
    if(startTimeValue && !block) {
      const startIndex = timeOptions.indexOf(startTimeValue);
      const nextTime = timeOptions[startIndex + 1] || timeOptions[startIndex];
      if (nextTime) {
        setValue('endTime', nextTime);
      }
      trigger(['startTime', 'endTime']);
    }
  }, [startTimeValue, setValue, trigger, block]);


  const handleSubmit = (data: BlockFormValues) => {
    const startDateTime = new Date(data.startDate);
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    if (startHour === undefined || startMinute === undefined) return;
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(data.endDate);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    if (endHour === undefined || endMinute === undefined) return;
    endDateTime.setHours(endHour, endMinute, 0, 0);

    onSubmit({
        reason: data.reason,
        startDate: startDateTime,
        endDate: endDateTime,
    });
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-4">
        {isPastBlock && (
          <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              ℹ️ Este é um bloqueio passado. Você pode editar apenas o motivo/descrição. As datas não podem ser alteradas.
            </p>
          </div>
        )}
        
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo do Bloqueio (Opcional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: Feriado, Férias da equipe" value={field.value || ""} />
              </FormControl>
              <FormDescription>
                {isPastBlock 
                  ? "Atualize a descrição para manter seu histórico organizado." 
                  : "Todo o estabelecimento será bloqueado durante este período."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl>
                        <StandardDatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Escolha a data de início"
                            isMobile={false}
                            fromYear={new Date().getFullYear()}
                            toYear={new Date().getFullYear() + 2}
                            disabled={isPastBlock}
                            minDate={!block ? new Date() : undefined}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Hora de Início</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPastBlock}>
                        <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {timeOptions.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Data de Término</FormLabel>
                     <FormControl>
                        <StandardDatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Escolha a data de término"
                            isMobile={false}
                            fromYear={new Date().getFullYear()}
                            toYear={new Date().getFullYear() + 2}
                            disabled={isPastBlock}
                            minDate={!block ? new Date() : undefined}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Hora de Término</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPastBlock}>
                        <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {timeOptions.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>Salvar Bloqueio</Button>
      </form>
    </Form>
  );
}
