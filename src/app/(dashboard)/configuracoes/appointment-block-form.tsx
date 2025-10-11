
"use client"

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
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
  reason: z.string().min(3, "O motivo é obrigatório.").max(120, "O motivo não pode ter mais de 120 caracteres."),
  startDate: z.date({ required_error: "A data de início é obrigatória." }),
  startTime: z.string({ required_error: "A hora de início é obrigatória." }),
  endDate: z.date({ required_error: "A data de término é obrigatória." }),
  endTime: z.string({ required_error: "A hora de término é obrigatória." }),
}).refine(data => {
    if (!data.startDate || !data.endDate || !data.startTime || !data.endTime) return false;
    const startDateTime = new Date(data.startDate);
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(data.endDate);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
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
}

export function AppointmentBlockForm({ block, onSubmit, isSubmitting }: AppointmentBlockFormProps) {
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
      reason: "",
      startDate: new Date(),
      startTime: '07:00',
      endDate: new Date(),
      endTime: '08:00',
    },
  });

  const { watch, setValue, trigger } = form;
  const startDateValue = watch('startDate');
  const startTimeValue = watch('startTime');


  // Auto-update endDate when startDate changes
  useEffect(() => {
    if (startDateValue) {
        setValue('endDate', startDateValue);
        trigger(['startDate', 'endDate']);
    }
  }, [startDateValue, setValue, trigger]);

  // Auto-update endTime when startTime changes
  useEffect(() => {
    if(startTimeValue) {
      const startIndex = timeOptions.indexOf(startTimeValue);
      const nextTime = timeOptions[startIndex + 1] || timeOptions[startIndex];
      setValue('endTime', nextTime);
      trigger(['startTime', 'endTime']);
    }
  }, [startTimeValue, setValue, trigger]);


  const handleSubmit = (data: BlockFormValues) => {
    const startDateTime = new Date(data.startDate);
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(data.endDate);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    onSubmit({
        reason: data.reason,
        startDate: startDateTime,
        endDate: endDateTime,
    });
  };

  const renderCalendar = (field: any, setOpen: (open: boolean) => void, disabledDateCheck: (date: Date) => boolean) => (
      <Calendar 
          mode="single" 
          selected={field.value} 
          onSelect={(date) => {
            if (date) field.onChange(date);
            setOpen(false);
          }}
          disabled={disabledDateCheck}
          initialFocus 
          locale={ptBR}
          captionLayout="dropdown-buttons"
          fromYear={new Date().getFullYear()}
          toYear={new Date().getFullYear() + 2}
      />
  );
  
  const renderDatePicker = (
      field: any,
      isOpen: boolean,
      setOpen: (open: boolean) => void,
      disabledDateCheck: (date: Date) => boolean,
      label: string
  ) => {
      const triggerButton = (
          <Button variant={"outline"} className={cn("pl-3 text-left font-normal w-full", !field.value && "text-muted-foreground")}>
              {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : <span>Escolha uma data</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
      );

      if (isMobile) {
          return (
              <Dialog open={isOpen} onOpenChange={setOpen}>
                  <DialogTrigger asChild>{triggerButton}</DialogTrigger>
                  <DialogContent className="w-auto p-2">
                    <DialogHeader>
                        <DialogTitle className="sr-only">{label}</DialogTitle>
                        <DialogDescription className="sr-only">Selecione uma data no calendário abaixo.</DialogDescription>
                    </DialogHeader>
                    {renderCalendar(field, setOpen, disabledDateCheck)}
                  </DialogContent>
              </Dialog>
          );
      }

      return (
          <Popover open={isOpen} onOpenChange={setOpen}>
              <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                  {renderCalendar(field, setOpen, disabledDateCheck)}
              </PopoverContent>
          </Popover>
      );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo do Bloqueio</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: Feriado, Férias da equipe" />
              </FormControl>
              <FormDescription>
                Todo o estabelecimento será bloqueado durante este período.
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
                        {renderDatePicker(field, isStartDatePickerOpen, setIsStartDatePickerOpen, (date) => date < new Date(new Date().setHours(0,0,0,0)), 'Selecione a data de início')}
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                        {renderDatePicker(field, isEndDatePickerOpen, setIsEndDatePickerOpen, (date) => {
                            const startDate = form.getValues('startDate');
                            return startDate ? date < new Date(startDate.setHours(0,0,0,0)) : date < new Date(new Date().setHours(0,0,0,0));
                        }, 'Selecione a data de término')}
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
