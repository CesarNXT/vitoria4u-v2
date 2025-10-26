'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Trash2, PlusCircle, ChevronRight, Clock } from 'lucide-react';
import type { DiasDaSemana, HorarioTrabalho } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    const isMobile = useIsMobile();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
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

        const optionsSet = new Set<string>();
        businessDaySchedule.slots.forEach(slot => {
            const startIndex = allTimeOptions.indexOf(slot.start);
            const endIndex = allTimeOptions.indexOf(slot.end);
            if(startIndex !== -1 && endIndex !== -1) {
                 allTimeOptions.slice(startIndex, endIndex + 1).forEach(time => optionsSet.add(time));
            }
        });
        const uniqueOptions = Array.from(optionsSet).sort();
        return uniqueOptions.length > 0 ? uniqueOptions : allTimeOptions;

    }, [isProfessionalForm, businessDaySchedule]);


    const slotsCount = fields.length;
    const slotsText = slotsCount === 0 ? 'Sem horários' : slotsCount === 1 ? '1 intervalo' : `${slotsCount} intervalos`;

    // Renderizar conteúdo dos horários
    const renderTimeSlots = () => (
        <div className="space-y-3">
            {fields.map((field, index) => {
                const startTime = watch(`${workHoursField}.${diaKey}.slots.${index}.start`);
                const filteredEndOptions = timeOptions.filter(time => time > (startTime || '00:00'));
                
                // Para o 2º turno, filtrar opções de início para não permitir antes do fim do 1º turno
                const previousSlotEnd = index > 0 ? watch(`${workHoursField}.${diaKey}.slots.${index - 1}.end`) : null;
                const filteredStartOptions = index > 0 && previousSlotEnd 
                    ? timeOptions.filter(time => time >= previousSlotEnd)
                    : timeOptions.slice(0, -1);

                const canDelete = fields.length > 1;
                
                return (
                    <div key={field.id} className="flex items-end gap-2">
                        <FormField
                            control={control}
                            name={`${workHoursField}.${diaKey}.slots.${index}.start`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel className="text-xs">Início</FormLabel>
                                    <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value || ''}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent side="top" position="popper">
                                            {filteredStartOptions.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
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
                                    <FormLabel className="text-xs">Fim</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl>
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent side="top" position="popper">
                                            {filteredEndOptions.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                                if (canDelete) {
                                    remove(index);
                                }
                            }}
                            disabled={!canDelete}
                            className="text-destructive h-9 w-9 shrink-0 disabled:opacity-30"
                            title={!canDelete ? "Não é possível deletar o único horário. Desative o dia se necessário." : "Remover intervalo"}
                        >
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
                        if (fields.length > 0) {
                            // Segundo turno: sugerir começar onde o primeiro terminou
                            const lastSlot = watch(`${workHoursField}.${diaKey}.slots.${fields.length - 1}`);
                            const suggestedStart = lastSlot?.end || timeOptions[0] || '14:00';
                            const suggestedEnd = timeOptions[timeOptions.length - 1] || '23:30';
                            
                            // Validar que há espaço para novo turno
                            if (suggestedStart < suggestedEnd) {
                                append({ start: suggestedStart, end: suggestedEnd });
                            } else {
                                alert('Não há mais horários disponíveis para adicionar um novo intervalo.');
                            }
                        } else {
                            // Primeiro turno: usar padrão
                            const defaultStart = timeOptions[0] || '08:00';
                            const defaultEnd = timeOptions[timeOptions.length - 1] || '18:00';
                            append({ start: defaultStart, end: defaultEnd });
                        }
                    }}
                    className="w-full"
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Intervalo
                </Button>
            )}
            
            {fields.length === 0 && <FormDescription className="text-xs">Dia desativado. Ative o dia para configurar horários.</FormDescription>}
            {fields.length === 1 && <FormDescription className="text-xs">Adicione um segundo turno para criar intervalo (ex: almoço). Não é possível deletar o único horário.</FormDescription>}
            {fields.length === 2 && <FormDescription className="text-xs">Máximo de 2 intervalos por dia atingido.</FormDescription>}
        </div>
    );

    return (
        <>
            <FormItem 
                className={cn(
                    "p-3 border rounded-lg space-y-3 h-full flex flex-col", 
                    (!isEnabled || isDayDisabledByBusiness) && "bg-muted/50"
                )}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FormField
                            control={control}
                            name={fieldEnabledName}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Switch
                                            checked={isDayDisabledByBusiness ? false : field.value}
                                            onCheckedChange={(checked) => {
                                                // Não permitir ativar se o negócio está fechado neste dia
                                                if (checked && isDayDisabledByBusiness) {
                                                    return;
                                                }
                                                
                                                field.onChange(checked);
                                                
                                                if (checked && fields.length === 0) {
                                                    // Ao ativar, copiar horários do negócio (profissional) ou usar padrão
                                                    if (isProfessionalForm && businessDaySchedule && businessDaySchedule.slots.length > 0) {
                                                        // Copiar todos os slots do negócio
                                                        businessDaySchedule.slots.forEach(slot => {
                                                            append({ 
                                                                start: slot?.start || '08:00', 
                                                                end: slot?.end || '18:00' 
                                                            });
                                                        });
                                                    } else {
                                                        append({ start: '08:00', end: '18:00' });
                                                    }
                                                } else if (!checked) {
                                                    // Limpar todos os horários ao desativar
                                                    const currentLength = fields.length;
                                                    for (let i = currentLength - 1; i >= 0; i--) {
                                                        remove(i);
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
                        <div className="flex-1 min-w-0">
                            <FormLabel className="text-sm font-medium truncate block">{label}</FormLabel>
                            {isDayDisabledByBusiness && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Fechado no negócio
                                </p>
                            )}
                            {isEnabled && !isDayDisabledByBusiness && isMobile && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    <Clock className="inline h-3 w-3 mr-1" />
                                    {slotsText}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    {isMobile && isEnabled && !isDayDisabledByBusiness && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsDialogOpen(true)}
                            className="ml-2 shrink-0"
                        >
                            Editar
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Desktop: Inline */}
                {!isMobile && isEnabled && !isDayDisabledByBusiness && (
                    <div className="space-y-3 flex-1">
                        {renderTimeSlots()}
                    </div>
                )}
            </FormItem>

            {/* Mobile: Modal */}
            {isMobile && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Horários de {label}</DialogTitle>
                            <DialogDescription>
                              Configure os horários de funcionamento para este dia
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            {renderTimeSlots()}
                        </div>
                        <Button onClick={() => setIsDialogOpen(false)} className="w-full">
                            Concluir
                        </Button>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
