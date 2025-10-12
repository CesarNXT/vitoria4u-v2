'use client';

import { useEffect, useMemo } from 'react';
import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, PlusCircle } from 'lucide-react';
import type { DiasDaSemana, HorarioTrabalho } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

const diasDaSemana: { key: DiasDaSemana, label: string }[] = [
    { key: 'segunda', label: 'Segunda-feira' },
    { key: 'terca', label: 'Terça-feira' },
    { key: 'quarta', label: 'Quarta-feira' },
    { key: 'quinta', label: 'Quinta-feira' },
    { key: 'sexta', label: 'Sexta-feira' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' },
];

const allTimeOptions = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = (i % 2) * 30;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

interface BusinessAgendaFormProps {
    businessHours?: HorarioTrabalho | null;
}

export default function BusinessAgendaForm({ businessHours }: BusinessAgendaFormProps) {
    const form = useFormContext();

    const isProfessionalForm = form.getValues('name') !== undefined;

    const workHoursField = isProfessionalForm ? 'workHours' : 'horariosFuncionamento';

    return (
        <div className="space-y-6">
            {diasDaSemana.map((dia) => (
                <WorkingHoursDay 
                    key={dia.key} 
                    diaKey={dia.key} 
                    label={dia.label} 
                    isProfessionalForm={isProfessionalForm}
                    workHoursField={workHoursField}
                    businessDaySchedule={businessHours ? businessHours[dia.key] : null}
                />
            ))}
        </div>
    );
}

interface WorkingHoursDayProps {
    diaKey: DiasDaSemana;
    label: string;
    isProfessionalForm: boolean;
    workHoursField: string;
    businessDaySchedule: HorarioTrabalho[DiasDaSemana] | null;
}


function WorkingHoursDay({ diaKey, label, isProfessionalForm, workHoursField, businessDaySchedule }: WorkingHoursDayProps) {
    const { control, watch, setValue, getValues } = useFormContext();
    const fieldName = `${workHoursField}.${diaKey}.slots`;
    const fieldEnabledName = `${workHoursField}.${diaKey}.enabled`;

    const currentSlots = getValues(fieldName);
    if (!Array.isArray(currentSlots)) {
        setValue(fieldName, []);
    }
    
    const { fields, append, remove } = useFieldArray({
        control,
        name: fieldName
    });

    const isEnabled = watch(fieldEnabledName);
    const isDayDisabledByBusiness = isProfessionalForm && (!businessDaySchedule || !businessDaySchedule.enabled);

    useEffect(() => {
        if (isDayDisabledByBusiness && isEnabled) {
            setValue(fieldEnabledName, false);
        }
    }, [isDayDisabledByBusiness, isEnabled, setValue, fieldEnabledName]);

    const timeOptions = useMemo(() => {
        if (!isProfessionalForm || !businessDaySchedule || businessDaySchedule.slots.length === 0) {
            return allTimeOptions;
        }

        let options: string[] = [];
        businessDaySchedule.slots.forEach(slot => {
            const startIndex = allTimeOptions.indexOf(slot.start);
            const endIndex = allTimeOptions.indexOf(slot.end);
            if(startIndex !== -1 && endIndex !== -1) {
                 options.push(...allTimeOptions.slice(startIndex, endIndex + 1));
            }
        });
        return options.length > 0 ? options : allTimeOptions;

    }, [isProfessionalForm, businessDaySchedule]);


    return (
        <FormItem 
            className={cn(
                "p-4 border rounded-lg space-y-4", 
                (!isEnabled || isDayDisabledByBusiness) && "bg-muted/50"
            )}
        >
            <div className="flex items-center justify-between">
                <FormLabel className="text-base font-medium">{label}</FormLabel>
                <div className="flex items-center gap-2">
                    {isDayDisabledByBusiness && (
                        <span className="text-xs font-semibold text-muted-foreground pr-2">
                            Fechado no negócio
                        </span>
                    )}
                    <FormField
                        control={control}
                        name={fieldEnabledName}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Switch
                                        checked={field.value && !isDayDisabledByBusiness}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            if (checked && fields.length === 0) {
                                                if (isProfessionalForm && businessDaySchedule && businessDaySchedule.slots.length > 0) {
                                                    remove();
                                                    businessDaySchedule.slots.forEach(slot => {
                                                        append({ start: slot.start, end: slot.end });
                                                    });
                                                } else {
                                                    append({ start: '08:00', end: '18:00' });
                                                }
                                            }
                                        }}
                                        disabled={isDayDisabledByBusiness}
                                        aria-readonly={isDayDisabledByBusiness}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            { isEnabled && !isDayDisabledByBusiness && (
                <div className="space-y-4 pl-2 border-l-2 ml-2">
                    {fields.map((field, index) => {
                        const startTime = watch(`${workHoursField}.${diaKey}.slots.${index}.start`);
                        const filteredEndOptions = timeOptions.filter(time => time > (startTime || '00:00'));

                        return (
                            <div key={field.id} className="flex items-end gap-2">
                                <FormField
                                    control={control}
                                    name={`${workHoursField}.${diaKey}.slots.${index}.start`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Início</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent position="popper">
                                                    {timeOptions.slice(0, -1).map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`${workHoursField}.${diaKey}.slots.${index}.end`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Fim</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent position="popper">
                                                    {filteredEndOptions.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )
                    })}

                    {fields.length < 2 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                           onClick={() => {
                                const defaultStart = timeOptions[0] || '09:00';
                                const defaultEnd = timeOptions[timeOptions.length - 1] || '18:00';
                                append({ start: defaultStart, end: defaultEnd });
                            }}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Intervalo
                        </Button>
                    )}
                    
                    {fields.length === 0 && <FormDescription>Nenhum horário de trabalho definido. O dia será considerado fechado.</FormDescription>}
                    {fields.length === 1 && <FormDescription>Você pode adicionar um segundo intervalo para pausas, como horário de almoço.</FormDescription>}
                </div>
            )}
        </FormItem>
    );
}
