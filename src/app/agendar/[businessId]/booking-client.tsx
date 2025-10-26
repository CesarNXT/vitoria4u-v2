"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Cliente, Servico, Profissional, Agendamento, ConfiguracoesNegocio, DataBloqueada, HorarioTrabalho, PlanoSaude } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Logo } from '@/components/logo';
import { ArrowLeft, ChevronRight, CheckCircle2, AlertTriangle, XCircle, CalendarDays, Loader2, Link2Off, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { StandardDatePicker } from "@/components/ui/standard-date-picker"
import { cn, formatPhoneNumber, formatPhoneInput, normalizePhoneNumber, capitalizeWords, convertTimestamps, formatServicePrice } from '@/lib/utils';
import { isCategoriaClinica } from '@/lib/categoria-utils';
import { getAvailableTimes } from '@/lib/availability';
import { format, getDay, parse, getMonth, isSameDay, isDate } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


type Step = 'IDENTIFICACAO' | 'NEW_CLIENT_FORM' | 'LIMIT_REACHED' | 'MODIFY_EXISTING' | 'TIPO_ATENDIMENTO' | 'SERVICE' | 'PROFESSIONAL' | 'DATETIME' | 'CONFIRMATION' | 'COMPLETED';

const newClientFormSchema = z.object({
  name: z.string()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(120, "O nome não pode ter mais de 120 caracteres.")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "O nome não pode conter números ou caracteres especiais."),
  birthDate: z.date({
    required_error: "A data de nascimento é obrigatória.",
  }).refine((date) => {
    // Validar que a pessoa tem pelo menos 1 ano de idade
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return date <= oneYearAgo;
  }, {
    message: "Selecione uma data válida.",
  }),
  temPlano: z.boolean().optional(),
  planoSaude: z.object({
    id: z.string(),
    nome: z.string(),
  }).optional(),
  matriculaPlano: z.string().max(64, 'A matrícula deve ter no máximo 64 caracteres.').optional(),
})

type NewClientFormValues = z.infer<typeof newClientFormSchema>

interface BookingClientProps {
    businessId: string;
    initialSettings: ConfiguracoesNegocio;
    initialClients: Cliente[];
    initialServices: Servico[];
    initialProfessionals: Profissional[];
    initialAppointments: Agendamento[];
    initialBlockedDates: DataBloqueada[];
}

export default function BookingClient({
    businessId,
    initialSettings,
    initialClients,
    initialServices,
    initialProfessionals,
    initialAppointments,
    initialBlockedDates
}: BookingClientProps) {
    const { toast } = useToast();
    
    // Dates are received as strings, convert them back to Date objects
    const [businessSettings, setBusinessSettings] = useState<ConfiguracoesNegocio | null>(() => initialSettings ? { ...initialSettings, access_expires_at: new Date(initialSettings.access_expires_at), createdAt: new Date(initialSettings.createdAt) } : null);
    const [services, setServices] = useState<Servico[]>(initialServices);
    const [professionals, setProfessionals] = useState<Profissional[]>(initialProfessionals);
    const [appointments, setAppointments] = useState<Agendamento[]>(() => initialAppointments.map(a => ({...a, date: convertTimestamps(a.date) })));
    const [blockedDates, setBlockedDates] = useState<DataBloqueada[]>(() => initialBlockedDates.map(b => ({...b, startDate: new Date(b.startDate), endDate: new Date(b.endDate)})));
    const [clients, setClients] = useState<Cliente[]>(() => initialClients.map(c => ({...c, birthDate: c.birthDate ? convertTimestamps(c.birthDate) : undefined})));

    const [step, setStep] = useState<Step>('IDENTIFICACAO');
    const [phone, setPhone] = useState('');
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<Cliente | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [existingAppointment, setExistingAppointment] = useState<Agendamento | null>(null);

    const [selectedService, setSelectedService] = useState<Servico | null>(null);
    const [selectedProfessional, setSelectedProfessional] = useState<Profissional | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [isCanceling, setIsCanceling] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [tipoAtendimento, setTipoAtendimento] = useState<'particular' | 'plano' | null>(null);
    const [planoSaudeSelecionado, setPlanoSaudeSelecionado] = useState<PlanoSaude | null>(null);
    
    // Verificar se o negócio é uma clínica
    const isClinica = isCategoriaClinica(businessSettings?.categoria);
    const temPlanosSaude = isClinica && businessSettings?.planosSaudeAceitos && businessSettings.planosSaudeAceitos.length > 0;

    // Appointments são carregados via props (initialAppointments)
    // E atualizados localmente após criar/cancelar via API

    const MAX_SCHEDULED_APPOINTMENTS = 1;
    
    // 🔄 Sistema de sincronização global (a cada 60 segundos)
    const syncIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
    const lastSyncRef = React.useRef<string>('');
    
    useEffect(() => {
        // Limpar intervalo anterior
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }
        
        const syncKey = `${selectedDate?.toDateString()}-${selectedProfessional?.id}`;
        
        // Só criar intervalo se data e profissional estão selecionados
        if (selectedDate && selectedProfessional && businessId) {
            const refreshAppointments = async () => {
                try {
                    const response = await fetch(`/api/booking/appointments?businessId=${businessId}&professionalId=${selectedProfessional.id}&date=${selectedDate.toISOString()}`);
                    if (response.ok) {
                        const data = await response.json();
                        const updatedAppointments = data.appointments.map((a: any) => ({
                            ...a,
                            date: convertTimestamps(a.date)
                        }));
                        
                        setAppointments(prev => {
                            const otherAppointments = prev.filter(
                                a => a.profissional.id !== selectedProfessional.id || 
                                new Date(a.date).toDateString() !== selectedDate.toDateString()
                            );
                            return [...otherAppointments, ...updatedAppointments];
                        });
                    }
                } catch (error) {
                    console.error("Erro ao sincronizar agendamentos:", error);
                }
            };
            
            // Executar imediatamente se mudou data/profissional
            if (lastSyncRef.current !== syncKey) {
                refreshAppointments();
                lastSyncRef.current = syncKey;
            }
            
            // Configurar intervalo de 60 segundos
            syncIntervalRef.current = setInterval(refreshAppointments, 60000);
        }
        
        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        };
    }, [selectedDate?.toDateString(), selectedProfessional?.id, businessId]);

    const scheduledAppointmentsForCurrentUser = useMemo(() => {
        if (!currentUser) return [];
        return appointments.filter(
        (appt) => appt.cliente.id === currentUser.id && appt.status === 'Agendado'
        );
    }, [currentUser, appointments]);
    
    const validatePhone = (value: string): boolean => {
        const rawPhone = value.replace(/\D/g, '');
        if (rawPhone.length !== 11) {
            setPhoneError('O número de celular deve ter 11 dígitos (DDD + número).');
            return false;
        }
        setPhoneError(null);
        return true;
    };
    
    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validatePhone(phone)) {
            return;
        }

        const normalizedPhoneStr = normalizePhoneNumber(phone);
        const phoneAsNumber = parseInt(normalizedPhoneStr, 10);

        try {
            // Verificar cliente via API
            const response = await fetch('/api/booking/check-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId,
                    phone: normalizedPhoneStr,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao verificar cliente');
            }

            // Se cliente existe, converter birthDate de string para Date
            const foundClient = result.exists && result.client ? {
                ...result.client,
                birthDate: result.client.birthDate ? new Date(result.client.birthDate) : undefined
            } : null;

            setCurrentUser(foundClient);

            // ✅ Buscar agendamentos ativos do cliente no servidor
            try {
                const appointmentsResponse = await fetch(`/api/booking/client-appointments?businessId=${businessId}&phone=${phoneAsNumber}`);
                
                if (appointmentsResponse.ok) {
                    const appointmentsData = await appointmentsResponse.json();
                    
                    if (appointmentsData.hasActiveAppointment && appointmentsData.appointment) {
                        const appointment = appointmentsData.appointment;
                        
                        // Garantir que a data está no formato Date correto
                        let convertedDate: Date;
                        if (appointment.date instanceof Date) {
                            convertedDate = appointment.date;
                        } else if (typeof appointment.date === 'string') {
                            convertedDate = new Date(appointment.date);
                        } else if (appointment.date && typeof appointment.date === 'object' && 'seconds' in appointment.date) {
                            // Firestore Timestamp
                            convertedDate = new Date((appointment.date as any).seconds * 1000);
                        } else {
                            convertedDate = new Date();
                        }
                        
                        const convertedAppointment = {
                            ...appointment,
                            id: appointment.id || '',
                            date: convertedDate
                        };
                        
                        setExistingAppointment(convertedAppointment);
                        setStep('MODIFY_EXISTING');
                        return;
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar agendamentos do cliente:', error);
                // Continua o fluxo normal se falhar
            }
            
            // Se não tem agendamento ativo, vai para o formulário
            setStep('NEW_CLIENT_FORM');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro ao verificar telefone',
                description: error.message || 'Tente novamente',
            });
        }
    };

    const handleNewClientSubmit = async (data: NewClientFormValues) => {
        if (!businessId || !businessSettings) return;
        
        const capitalizedName = capitalizeWords(data.name);
        const normalizedPhoneStr = normalizePhoneNumber(phone);
        const phoneAsNumber = parseInt(normalizedPhoneStr, 10);

        if (isNaN(phoneAsNumber)) {
            toast({ variant: "destructive", title: "Erro", description: "O número de telefone fornecido é inválido." });
            return;
        }

        try {
            // Chamar API ao invés de gravar direto no Firestore
            const response = await fetch('/api/booking/client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId,
                    name: capitalizedName,
                    phone: normalizedPhoneStr,
                    birthDate: data.birthDate?.toISOString(),
                    planoSaude: data.temPlano && data.planoSaude ? data.planoSaude : null,
                    matriculaPlano: data.matriculaPlano || null,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao salvar cliente');
            }

            const clientId = result.clientId;
            const clientData: Cliente = { 
                id: clientId,
                name: capitalizedName,
                birthDate: data.birthDate,
                phone: phoneAsNumber,
                status: currentUser?.status || "Ativo",
                avatarUrl: currentUser?.avatarUrl || undefined,
                instanciaWhatsapp: businessSettings.id,
                planoSaude: data.temPlano && data.planoSaude ? data.planoSaude : undefined,
                matriculaPlano: data.matriculaPlano || undefined,
            };
            
            if (currentUser) {
                setClients(prev => prev.map(c => c.id === clientId ? clientData : c));
            } else {
                setClients(prev => [clientData, ...prev]);
            }
            
            setCurrentUser(clientData);
            
            // Se É CLÍNICA e o cliente tem plano cadastrado, ir para seleção de tipo de atendimento
            // Senão, ir direto para seleção de serviço
            setStep(isClinica && clientData.planoSaude ? 'TIPO_ATENDIMENTO' : 'SERVICE');
            
            toast({
                title: currentUser ? "Dados Confirmados!" : "Cadastro Concluído!",
                description: `Bem-vindo(a), ${clientData.name}!`,
            });
        } catch (error: any) {
            toast({ 
                variant: "destructive", 
                title: "Erro", 
                description: error.message || "Erro ao processar cadastro" 
            });
        }
    }

    const handleSelectService = (service: Servico) => {
        setSelectedService(service);
        setSelectedProfessional(null);
        setStep('PROFESSIONAL');
    }

    const handleSelectProfessional = (professional: Profissional) => {
        setSelectedProfessional(professional);
        setSelectedDate(undefined);
        setSelectedTime(null);
        setStep('DATETIME');
    }
    
    const handleSelectTime = (time: string) => {
        setSelectedTime(time);
    }
    
    const handleConfirmAppointment = async () => {
        if (isConfirming) return; // Evita múltiplos cliques
        
        if (!currentUser || !selectedService || !selectedProfessional || !selectedDate || !selectedTime || !businessId || !businessSettings) {
            toast({ variant: "destructive", title: "Erro", description: "Todos os dados são necessários." });
            return;
        }
        
        setIsConfirming(true);
        
        try {
            // Chamar API ao invés de gravar direto no Firestore
            const response = await fetch('/api/booking/appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId,
                    clientId: currentUser.id,
                    serviceId: selectedService.id,
                    professionalId: selectedProfessional.id,
                    date: selectedDate.toISOString(),
                    startTime: selectedTime,
                    clientPhone: currentUser.phone.toString(),
                    tipoAtendimento: tipoAtendimento || 'particular',
                    planoSaude: planoSaudeSelecionado || null,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao criar agendamento');
            }

            const newAppointmentData: Agendamento = {
                id: result.appointmentId,
                cliente: currentUser,
                servico: selectedService,
                profissional: selectedProfessional,
                date: selectedDate,
                startTime: selectedTime,
                status: 'Agendado',
                instanciaWhatsapp: businessSettings.id,
                tokenInstancia: businessSettings.tokenInstancia ?? null
            };

            setAppointments(prev => {
                const otherAppointments = prev.filter(a => a.id !== result.appointmentId);
                return [newAppointmentData, ...otherAppointments];
            });
            
            setIsEditing(false);
            setStep('COMPLETED');
        } catch (error: any) {
            console.error('Erro ao confirmar agendamento:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Agendar',
                description: error.message || 'Não foi possível confirmar o agendamento. Tente novamente.',
            });
        } finally {
            setIsConfirming(false);
        }
    }
    
const handleCancelAppointment = async (appointmentId: string) => {
    if (!businessId || !currentUser || isCanceling) return;
    
    setIsCanceling(true);

    try {
        const appointmentToUpdate = appointments.find(a => a.id === appointmentId);
        if (!appointmentToUpdate) {
            setIsCanceling(false);
            return;
        }

        // Chamar API ao invés de gravar direto no Firestore
        const response = await fetch('/api/booking/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                businessId,
                appointmentId,
                clientPhone: currentUser.phone.toString(),
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao cancelar agendamento');
        }
        
        setAppointments(prev => prev.map((appt) => appt.id === appointmentId ? { ...appt, status: 'Cancelado'} : appt));
        
        toast({
            title: 'Agendamento Cancelado',
            description: 'Seu horário foi cancelado com sucesso.',
        });

        resetFlow();
    } catch (error: any) {
        console.error('Erro ao cancelar agendamento:', error);
        toast({
            variant: 'destructive',
            title: 'Erro ao Cancelar',
            description: error.message || 'Não foi possível cancelar o agendamento. Tente novamente.',
        });
    } finally {
        setIsCanceling(false);
    }
};

    const handleEditAppointment = () => {
        if (!existingAppointment) return;
        setIsEditing(true);
        setSelectedService(existingAppointment.servico);
        setSelectedProfessional(existingAppointment.profissional);
        setStep('DATETIME');
    }


    const resetFlow = () => {
        setStep('IDENTIFICACAO');
        setPhone('');
        setPhoneError(null);
        setCurrentUser(null);
        setSelectedService(null);
        setSelectedProfessional(null);
        setSelectedDate(undefined);
        setSelectedTime(null);
        setIsEditing(false);
        setExistingAppointment(null);
    }

    const goBack = () => {
        switch(step) {
        case 'NEW_CLIENT_FORM': setStep('IDENTIFICACAO'); setCurrentUser(null); break;
        case 'LIMIT_REACHED': setStep('IDENTIFICACAO'); setCurrentUser(null); break;
        case 'MODIFY_EXISTING': resetFlow(); break;
        case 'TIPO_ATENDIMENTO': 
            setStep('NEW_CLIENT_FORM'); 
            setTipoAtendimento(null);
            setPlanoSaudeSelecionado(null);
            break;
        case 'SERVICE': 
            // Voltar para seleção de tipo de atendimento se É CLÍNICA e o cliente tem plano
            setStep(isClinica && currentUser?.planoSaude ? 'TIPO_ATENDIMENTO' : 'NEW_CLIENT_FORM'); 
            break;
        case 'PROFESSIONAL': setStep('SERVICE'); setSelectedProfessional(null); break;
        case 'DATETIME':
            if (isEditing) {
                setStep('MODIFY_EXISTING');
            } else {
                setStep('PROFESSIONAL');
            }
            setSelectedDate(undefined);
            setSelectedTime(null);
            break;
        case 'CONFIRMATION': setStep('DATETIME'); setSelectedTime(null); break;
        case 'COMPLETED': resetFlow(); break;
        default: break;
        }
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneInput(e.target.value);
        setPhone(formatted);
        // Validar sempre que o usuário digitar
        if (formatted.replace(/\D/g, '').length === 11) {
            const normalized = normalizePhoneNumber(formatted);
            setPhoneError(null); // Limpar erro se o número for válido
        } else {
            if (formatted.length > 0) {
                setPhoneError('Número incompleto. O celular deve ter 11 dígitos.');
            } else {
                setPhoneError(null);
            }
        }
    }

    const formatNameToTitleCase = (name: string): string => {
        return name
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };
  
    const NewClientForm = () => {
        const isMobile = useIsMobile();
        const [isCalendarOpen, setIsCalendarOpen] = useState(false);
        const [clientCalendarMonth, setClientCalendarMonth] = useState(
            currentUser?.birthDate ? new Date(currentUser.birthDate) : new Date()
        );
        
        // temPlanosSaude agora é definido globalmente com isClinica
        
        const form = useForm<NewClientFormValues>({
            resolver: zodResolver(newClientFormSchema),
            defaultValues: {
                name: currentUser?.name || "",
                birthDate: currentUser?.birthDate ? new Date(currentUser.birthDate) : undefined,
                temPlano: currentUser?.planoSaude ? true : false,
                planoSaude: currentUser?.planoSaude || undefined,
            },
        });

        const temPlano = form.watch('temPlano');

        return (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleNewClientSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Seu Nome Completo</FormLabel>
                        <FormControl>
                            <Input
                            placeholder="ex: Maria da Silva"
                            maxLength={120}
                            {...field}
                            onChange={(e) => {
                                const formatted = formatNameToTitleCase(e.target.value);
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
                            <StandardDatePicker
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Escolha uma data"
                                isMobile={isMobile}
                                fromYear={1920}
                                toYear={new Date().getFullYear()}
                                maxDate={new Date()}
                                minDate={new Date("1920-01-01")}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    
                    {/* Plano de Saúde - só aparece se a clínica aceita planos */}
                    {temPlanosSaude && (
                        <>
                            <FormField
                                control={form.control}
                                name="temPlano"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Possui plano de saúde?</FormLabel>
                                            <FormDescription className="text-sm">
                                                Informe se você possui convênio médico/odontológico
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={(checked) => {
                                                    field.onChange(checked);
                                                    if (!checked) {
                                                        form.setValue('planoSaude', undefined);
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            
                            {temPlano && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="planoSaude"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Qual seu plano?</FormLabel>
                                                <Select
                                                    value={field.value?.id}
                                                    onValueChange={(planoId) => {
                                                        const plano = businessSettings.planosSaudeAceitos?.find(p => p.id === planoId);
                                                        field.onChange(plano);
                                                    }}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione seu plano" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {businessSettings.planosSaudeAceitos?.map((plano) => (
                                                            <SelectItem key={plano.id} value={plano.id} className="truncate">
                                                                {plano.nome}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    
                                    <FormField
                                        control={form.control}
                                        name="matriculaPlano"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Matrícula/Carteirinha (Opcional)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Ex: 123456789012"
                                                        maxLength={64}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription className="text-xs">
                                                    Número da sua carteirinha ou matrícula
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}
                        </>
                    )}
                    
                    <Button variant="gradient" type="submit" className="w-full">{currentUser ? 'Confirmar e Continuar' : 'Finalizar Cadastro'}</Button>
                </form>
            </Form>
        )
    }

    const TipoAtendimentoSelector = () => {
        const planoCliente = currentUser?.planoSaude;
        
        const handleSelectTipoAtendimento = (tipo: 'particular' | 'plano') => {
            setTipoAtendimento(tipo);
            if (tipo === 'particular') {
                setPlanoSaudeSelecionado(null);
            } else if (tipo === 'plano' && planoCliente) {
                // Usar o plano cadastrado do cliente
                setPlanoSaudeSelecionado(planoCliente);
            }
            setStep('SERVICE');
        };

        return (
            <div className="space-y-6">
                <div className="text-center space-y-2 mb-6">
                    <h3 className="text-lg font-semibold">Tipo de Atendimento</h3>
                    <p className="text-sm text-muted-foreground">
                        Como deseja ser atendido nesta consulta?
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => handleSelectTipoAtendimento('particular')}
                        className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-all"
                    >
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                            <span className="text-3xl">💳</span>
                        </div>
                        <div className="text-center">
                            <p className="font-semibold">Particular</p>
                            <p className="text-xs text-muted-foreground mt-1">Pagamento direto</p>
                        </div>
                    </button>
                    <button
                        onClick={() => handleSelectTipoAtendimento('plano')}
                        className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-all"
                    >
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                            <span className="text-3xl">🏥</span>
                        </div>
                        <div className="text-center">
                            <p className="font-semibold">Plano de Saúde</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {planoCliente ? planoCliente.nome : 'Convênio médico'}
                            </p>
                        </div>
                    </button>
                </div>
            </div>
        );
    };

    const ServiceList = () => {
        // Filtrar serviços ativos
        let filteredServices = services.filter(s => s.status === 'Ativo');
        
        // Se o cliente escolheu usar plano, filtrar apenas serviços que aceitam o plano dele
        if (tipoAtendimento === 'plano' && planoSaudeSelecionado) {
            filteredServices = filteredServices.filter(service => {
                // Só mostrar serviços que TÊM o plano específico vinculado
                if (!service.planosAceitos || service.planosAceitos.length === 0) {
                    return false; // Não aceita planos
                }
                // Verificar se o plano do cliente está na lista de planos aceitos
                return service.planosAceitos.some(plano => plano.id === planoSaudeSelecionado.id);
            });
        }
        
        return (
            <div className="flex flex-col gap-3">
                {filteredServices.length > 0 ? (
                    filteredServices.map(service => (
                        <button 
                            key={service.id}
                            onClick={() => handleSelectService(service)}
                            className="flex w-full items-center justify-between rounded-md border p-4 text-left transition-all hover:bg-muted"
                        >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <Avatar className="h-12 w-12 rounded-md flex-shrink-0">
                                    <AvatarImage src={service.imageUrl || undefined} alt={service.name} className="object-cover" />
                                    <AvatarFallback>{String(service.name || 'S').charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <p className="font-medium truncate cursor-help">{service.name}</p>
                                        </TooltipTrigger>
                                        {service.name.length > 30 && (
                                          <TooltipContent>
                                            <p>{service.name}</p>
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    </TooltipProvider>
                                    <p className="text-sm text-muted-foreground">
                                        {service.duration} min - {formatServicePrice(service.price, service.priceType)}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </button>
                    ))
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="font-medium mb-2">Nenhum serviço disponível</p>
                        <p className="text-sm">
                            {tipoAtendimento === 'plano' 
                                ? `Não há serviços vinculados ao plano ${planoSaudeSelecionado?.nome || 'selecionado'}. Entre em contato com a clínica para mais informações.`
                                : 'Não há serviços disponíveis no momento.'
                            }
                        </p>
                    </div>
                )}
            </div>
        );
    }
    
    const ProfessionalList = () => {
        const availableProfessionals = useMemo(() => {
            if (!selectedService) return [];
            return professionals.filter(p => p.status === 'Ativo' && selectedService.professionals.some(sp => sp.id === p.id));
        }, [selectedService, professionals]);

        return (
            <div className="flex flex-col gap-3">
                {availableProfessionals.map(prof => (
                    <button 
                        key={prof.id}
                        onClick={() => handleSelectProfessional(prof)}
                        className="flex w-full items-center justify-between rounded-md border p-4 text-left transition-all hover:bg-muted"
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="flex-shrink-0">
                                <AvatarImage src={prof.avatarUrl || undefined} alt={prof.name} />
                                <AvatarFallback>{String(prof.name || 'P').charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="font-medium truncate cursor-help">{prof.name}</p>
                                    </TooltipTrigger>
                                    {prof.name.length > 25 && (
                                      <TooltipContent>
                                        <p>{prof.name}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </button>
                ))}
                {availableProfessionals.length === 0 && <p className="text-center text-muted-foreground">Nenhum profissional disponível para este serviço.</p>}
            </div>
        );
    }
    
    const DateTimePicker = () => {
        const isMobile = useIsMobile();
        const [isCalendarOpen, setIsCalendarOpen] = useState(false);
        const [availableTimes, setAvailableTimes] = useState<string[]>([]);
        const [isTimesLoading, setIsTimesLoading] = useState(false);
        
        useEffect(() => {
            let isMounted = true;
            
            const fetchTimes = async () => {
                if (selectedDate && selectedProfessional && selectedService && businessSettings && isMounted) {
                    setIsTimesLoading(true);
                    try {
                        // Filter out the appointment being edited from the conflict check
                        const appointmentsForCheck = isEditing 
                            ? appointments.filter(a => a.id !== existingAppointment!.id)
                            : appointments;

                        const times = await getAvailableTimes({
                            businessId,
                            date: selectedDate,
                            serviceDuration: selectedService.duration,
                            professional: selectedProfessional,
                            appointments: appointmentsForCheck,
                            blockedDates: blockedDates,
                        });
                        
                        if (isMounted) {
                            setAvailableTimes(times);
                        }
                    } catch (error) {
                        console.error("Failed to get available times:", error);
                        if (isMounted) {
                            toast({ variant: "destructive", title: "Erro ao buscar horários" });
                            setAvailableTimes([]);
                        }
                    } finally {
                        if (isMounted) {
                            setIsTimesLoading(false);
                        }
                    }
                } else if (isMounted) {
                    setAvailableTimes([]);
                }
            }
            
            fetchTimes();
            
            return () => {
                isMounted = false;
            };
        }, [selectedDate, selectedProfessional, selectedService, businessSettings, blockedDates, businessId, isEditing, existingAppointment]);


        const disabledDays = useMemo(() => {
            if (!selectedProfessional || !businessSettings || !selectedService) {
                return (date: Date) => true; 
            }
            
            const scheduleSource = (selectedProfessional.workHours && Object.keys(selectedProfessional.workHours).length > 0)
                ? selectedProfessional.workHours
                : businessSettings.horariosFuncionamento;

            if (!scheduleSource) {
                return (date: Date) => true;
            }
            
            return (date: Date) => {
                // 1. Não permitir datas no passado
                if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;

                // 2. Verificar se o dia da semana está habilitado
                const dayKey = format(date, 'eeee', { locale: ptBR }).toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace('-feira', '') as keyof HorarioTrabalho;
                
                const daySchedule = scheduleSource[dayKey];
                if (!daySchedule?.enabled) return true;
                
                // 3. Verificar se já passou do horário de atendimento (para o dia atual)
                const now = new Date();
                if (isSameDay(date, now)) {
                    // Pegar o último horário de atendimento do dia
                    const lastSlot = daySchedule.slots[daySchedule.slots.length - 1];
                    if (lastSlot) {
                        const [endHour, endMinute] = lastSlot.end.split(':').map(Number);
                        const endTime = new Date(now);
                        endTime.setHours(endHour || 0, endMinute || 0, 0, 0);
                        
                        // Se já passou do último horário, desabilitar
                        if (now >= endTime) {
                            return true;
                        }
                    }
                }
                
                // 4. Verificar bloqueios de agenda do negócio
                const businessBlocked = blockedDates.some(block => {
                    const blockStart = new Date(block.startDate);
                    const blockEnd = new Date(block.endDate);
                    return date >= new Date(blockStart.setHours(0,0,0,0)) && 
                           date <= new Date(blockEnd.setHours(23,59,59,999));
                });
                if (businessBlocked) return true;
                
                // 5. Verificar bloqueios de agenda do profissional
                if (selectedProfessional.datasBloqueadas) {
                    const professionalBlocked = selectedProfessional.datasBloqueadas.some(block => {
                        const blockStart = new Date(block.startDate);
                        const blockEnd = new Date(block.endDate);
                        return date >= new Date(blockStart.setHours(0,0,0,0)) && 
                               date <= new Date(blockEnd.setHours(23,59,59,999));
                    });
                    if (professionalBlocked) return true;
                }
                
                return false;
            };

        }, [selectedProfessional, businessSettings, selectedService, blockedDates]);

        return (
            <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                <div className="flex-1 md:max-w-[350px]">
                    <StandardDatePicker
                        value={selectedDate || undefined}
                        onChange={(date) => {
                            if (date) {
                                setSelectedDate(date);
                                setSelectedTime(null);
                                if (getMonth(date) !== getMonth(calendarMonth)) {
                                    setCalendarMonth(date);
                                }
                            }
                        }}
                        placeholder="Escolha uma data"
                        isMobile={isMobile}
                        disabledDates={disabledDays}
                        fromYear={new Date().getFullYear()}
                        toYear={new Date().getFullYear() + 1}
                        className="w-full"
                    />
                </div>
                <div className="flex-1 max-h-80 overflow-y-auto">
                    <p className="text-center font-medium mb-2">{selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecione uma data"}</p>
                    {isTimesLoading ? (
                        <div className="flex justify-center items-center h-20">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {selectedDate && availableTimes.length > 0 && availableTimes.map(time => (
                                <Button 
                                    key={time}
                                    variant={selectedTime === time ? "default" : "outline"}
                                    onClick={() => handleSelectTime(time)}
                                >
                                    {time}
                                </Button>
                            ))}
                            {selectedDate && availableTimes.length === 0 && <p className="text-center text-muted-foreground col-span-3">Nenhum horário disponível para este dia.</p>}
                        </div>
                    )}
                </div>
            </div>
        )
    }
  
    const Confirmation = () => {
        if (!currentUser || !selectedService || !selectedProfessional || !selectedDate || !selectedTime) return null;
        return (
            <div className="space-y-6">
                <div className="space-y-4 rounded-md border p-4">
                    <div className="font-medium">Resumo do Agendamento</div>
                    <div className="flex justify-between items-center text-sm gap-2">
                        <span className="text-muted-foreground flex-shrink-0">Cliente:</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate text-right cursor-help">{currentUser.name}</span>
                            </TooltipTrigger>
                            {currentUser.name.length > 25 && (
                              <TooltipContent>
                                <p>{currentUser.name}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="flex justify-between items-center text-sm gap-2">
                        <span className="text-muted-foreground flex-shrink-0">Serviço:</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate text-right cursor-help">{selectedService.name}</span>
                            </TooltipTrigger>
                            {selectedService.name.length > 25 && (
                              <TooltipContent>
                                <p>{selectedService.name}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="flex justify-between items-center text-sm gap-2">
                        <span className="text-muted-foreground flex-shrink-0">Profissional:</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate text-right cursor-help">{selectedProfessional.name}</span>
                            </TooltipTrigger>
                            {selectedProfessional.name.length > 25 && (
                              <TooltipContent>
                                <p>{selectedProfessional.name}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Data:</span>
                        <span>{format(selectedDate, "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Hora:</span>
                        <span>{selectedTime}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-semibold">
                        <span className="text-muted-foreground">Total:</span>
                        <span>{formatServicePrice(selectedService.price, selectedService.priceType)}</span>
                    </div>
                </div>
                <Button 
                    variant="gradient" 
                    className="w-full" 
                    onClick={handleConfirmAppointment}
                    disabled={isConfirming}
                >
                    {isConfirming ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Confirmando...
                        </>
                    ) : (
                        'Confirmar Agendamento'
                    )}
                </Button>
            </div>
        )
    }
    
    const Completed = () => {
        return (
            <div className="text-center space-y-4 flex flex-col items-center p-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h2 className="text-2xl font-semibold">Agendamento {isEditing ? 'Alterado' : 'Confirmado'}!</h2>
                <p className="text-muted-foreground max-w-sm">
                    {isEditing ? 'Sua alteração foi realizada com sucesso.' : 'Seu agendamento foi realizado com sucesso.'} Você receberá uma confirmação em breve. Nos vemos em breve!
                </p>
            </div>
        )
    }

    const ModifyExisting = () => {
        if (!existingAppointment) return null;

        // Garantir que a data está no formato correto
        let appointmentDate: Date;
        
        if (existingAppointment.date instanceof Date) {
            appointmentDate = existingAppointment.date;
        } else if (typeof existingAppointment.date === 'string') {
            appointmentDate = new Date(existingAppointment.date);
        } else if (existingAppointment.date && typeof existingAppointment.date === 'object' && 'seconds' in existingAppointment.date) {
            // Firestore Timestamp
            appointmentDate = new Date((existingAppointment.date as any).seconds * 1000);
        } else {
            appointmentDate = new Date();
        }
        
        // Verificar se a data é válida
        const formattedDate = !isNaN(appointmentDate.getTime()) 
            ? format(appointmentDate, 'dd/MM/yyyy')
            : 'Data inválida';

        return (
            <div className="space-y-4">
                <div className="flex flex-col items-center text-center">
                    <CalendarDays className="h-12 w-12 text-primary mb-2" />
                    <h3 className="text-lg font-semibold">Você já tem um agendamento</h3>
                    <p className="text-muted-foreground text-sm">
                        Encontramos o seguinte agendamento ativo em seu nome.
                    </p>
                </div>

                <div className="rounded-md border p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium text-muted-foreground">Serviço:</span>
                        <span className="font-semibold">{existingAppointment.servico.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="font-medium text-muted-foreground">Profissional:</span>
                        <span>{existingAppointment.profissional.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="font-medium text-muted-foreground">Data:</span>
                        <span>{formattedDate} às {existingAppointment.startTime}</span>
                    </div>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                    Se precisar, você pode cancelar seu agendamento.
                </p>

                <div className="flex flex-col gap-3">
                    <Button
                        variant="destructive"
                        onClick={() => handleCancelAppointment(existingAppointment.id)}
                        disabled={isCanceling}
                    >
                        {isCanceling ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Cancelando...
                            </>
                        ) : (
                            <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar Agendamento
                            </>
                        )}
                    </Button>
                </div>
            </div>
        );
    };
    
    const renderStep = () => {
        switch (step) {
        case 'IDENTIFICACAO':
            return (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="phone">Seu número de celular</Label>
                <Input
                    id="phone"
                    type="tel"
                    placeholder="(XX) XXXXX-XXXX"
                    value={phone}
                    onChange={handlePhoneChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handlePhoneSubmit(e as any);
                        }
                    }}
                    required
                    maxLength={15}
                />
                {phoneError && <p className="text-sm font-medium text-destructive">{phoneError}</p>}
                </div>
                <Button variant="gradient" type="submit" className="w-full">
                Continuar
                </Button>
            </form>
            );
        case 'NEW_CLIENT_FORM':
            return <NewClientForm />;
        case 'MODIFY_EXISTING':
            return <ModifyExisting />;
        case 'TIPO_ATENDIMENTO':
            return <TipoAtendimentoSelector />;
        case 'SERVICE':
            return <ServiceList />;
        case 'PROFESSIONAL':
            return <ProfessionalList />;
        case 'DATETIME':
            return <DateTimePicker />;
        case 'CONFIRMATION':
            return <Confirmation />;
        case 'COMPLETED':
            return <Completed />;
        default:
            return <div>Etapa desconhecida</div>;
        }
    };
  
    useEffect(() => {
        if (step === 'DATETIME' && selectedDate && selectedTime) {
            setStep('CONFIRMATION');
        }
    }, [selectedDate, selectedTime, step])

    const getStepTitle = () => {
        switch (step) {
        case 'IDENTIFICACAO': return `Bem-vindo(a) ao ${businessSettings?.nome || 'agendamento'}`;
        case 'NEW_CLIENT_FORM': return currentUser ? 'Confirme seus dados' : 'Quase lá! Faltam alguns dados.';
        case 'MODIFY_EXISTING': return 'Gerenciar Agendamento';
        case 'TIPO_ATENDIMENTO': return 'Tipo de Atendimento';
        case 'SERVICE': return 'Serviços disponíveis para você';
        case 'PROFESSIONAL': return 'Quem irá te atender?';
        case 'DATETIME': return 'Escolha Data e Hora';
        case 'CONFIRMATION': return 'Confirme seu Agendamento';
        case 'COMPLETED': return 'Tudo Certo!';
        default: return 'Agendamento';
        }
    }

    const getStepDescription = () => {
        switch (step) {
        case 'IDENTIFICACAO': return 'Para começar, insira seu número de celular para identificarmos seu cadastro.';
        case 'NEW_CLIENT_FORM': return currentUser ? 'Por favor, confirme ou atualize seus dados para continuar.' : 'Vimos que você é novo por aqui. Por favor, complete seu cadastro para continuar.';
        case 'MODIFY_EXISTING': return 'Você já possui um horário marcado. Escolha uma das opções abaixo.';
        case 'TIPO_ATENDIMENTO': return 'Selecione como você será atendido(a).';
        case 'SERVICE': return 'Escolha um dos serviços abaixo para continuar.';
        case 'PROFESSIONAL': return `Escolha o profissional para realizar ${selectedService?.name || ''}.`;
        case 'DATETIME': return `Escolha o melhor dia e horário para você.`;
        case 'CONFIRMATION': return 'Por favor, verifique os detalhes do seu agendamento abaixo.';
        case 'COMPLETED': return `Obrigado por agendar conosco, ${currentUser?.name?.split(' ')[0] || ''}!`;
        default: return '';
        }
    }

    if (!businessSettings) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="animated-blob animated-blob-squash absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 h-96 w-96 transform-gpu rounded-full bg-gradient-to-tr from-primary to-accent opacity-30 blur-3xl animate-blob-move" />
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
                    <Logo />
                </div>
                <Card className="w-full max-w-2xl shadow-xl mt-20 z-10">
                    <CardHeader>
                        <Skeleton className="h-8 w-3/4 mx-auto" />
                        <Skeleton className="h-4 w-full mx-auto mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden relative">
            <div className="animated-blob animated-blob-squash absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 h-96 w-96 transform-gpu rounded-full bg-gradient-to-tr from-primary to-accent opacity-30 blur-3xl animate-blob-move" />
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
                <Logo/>
            </div>
            <Card className="w-full max-w-2xl shadow-xl mt-20 z-10 animate-fade-in-up">
                <>
                <CardHeader className="text-center relative pb-4">
                    {step !== 'IDENTIFICACAO' && step !== 'COMPLETED' && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 left-4"
                        onClick={goBack}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    )}
                    <CardTitle className="text-2xl font-headline pt-2 px-12 break-words">{getStepTitle()}</CardTitle>
                    {step === 'SERVICE' && currentUser?.name && (
                      <p className="text-base text-muted-foreground mt-2 px-4 truncate">
                        Olá, {currentUser.name.split(' ')[0]}!
                      </p>
                    )}
                    <CardDescription className="break-words px-4">{getStepDescription()}</CardDescription>
                </CardHeader>
                <CardContent className="animate-fade-in-up">
                    {renderStep()}
                </CardContent>
                </>
            </Card>
            <footer className="mt-8 text-center text-sm text-muted-foreground z-10">
                <p>Desenvolvido por vitoria.studio</p>
            </footer>
        </div>
    );
}