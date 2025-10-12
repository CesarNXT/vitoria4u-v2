

"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    saveOrUpdateDocument,
} from '@/lib/firestore';
import type { Cliente, Servico, Profissional, Agendamento, ConfiguracoesNegocio, DataBloqueada, HorarioTrabalho } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/logo';
import { ArrowLeft, ChevronRight, CheckCircle2, AlertTriangle, XCircle, CalendarDays, Loader2, Link2Off, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { cn, formatPhoneNumber, normalizePhoneNumber, capitalizeWords, convertTimestamps } from '@/lib/utils';
import { getAvailableTimes } from '@/lib/availability';
import { format, getDay, parse, getMonth, isSameDay, isDate } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { sendCreationHooks, sendCancellationHooks } from '@/app/(dashboard)/agendamentos/actions';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Skeleton } from '@/components/ui/skeleton';
import { initializeFirebase } from '@/firebase';
import { getFirestore, doc, collection, onSnapshot } from 'firebase/firestore';


type Step = 'IDENTIFICACAO' | 'NEW_CLIENT_FORM' | 'LIMIT_REACHED' | 'MODIFY_EXISTING' | 'SERVICE' | 'PROFESSIONAL' | 'DATETIME' | 'CONFIRMATION' | 'COMPLETED';

const newClientFormSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  birthDate: z.date({
    required_error: "A data de nascimento é obrigatória.",
  }),
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

// Helper to safely convert various date formats to an ISO string
const safeToISOString = (dateValue: any): string | null => {
    if (!dateValue) return null;

    // Firestore Timestamp object
    if (typeof dateValue === 'object' && dateValue.seconds) {
        return new Date(dateValue.seconds * 1000).toISOString();
    }
    // Already a Date object
    if (isDate(dateValue)) {
        return dateValue.toISOString();
    }
    // A string that can be parsed into a Date
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString();
    }
    return null;
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
    const firestore = getFirestore(initializeFirebase().firebaseApp);
    
    // Dates are received as strings, convert them back to Date objects
    const [businessSettings, setBusinessSettings] = useState<ConfiguracoesNegocio | null>(() => initialSettings ? { ...initialSettings, access_expires_at: new Date(initialSettings.access_expires_at), createdAt: new Date(initialSettings.createdAt) } : null);
    const [services, setServices] = useState<Servico[]>(initialServices);
    const [professionals, setProfessionals] = useState<Profissional[]>(initialProfessionals);
    const [appointments, setAppointments] = useState<Agendamento[]>(() => initialAppointments.map(a => ({...a, date: (a.date as any).toDate ? (a.date as any).toDate() : new Date(a.date) })));
    const [blockedDates, setBlockedDates] = useState<DataBloqueada[]>(() => initialBlockedDates.map(b => ({...b, startDate: new Date(b.startDate), endDate: new Date(b.endDate)})));
    const [clients, setClients] = useState<Cliente[]>(() => initialClients.map(c => ({...c, birthDate: c.birthDate ? ((c.birthDate as any).toDate ? (c.birthDate as any).toDate() : new Date(c.birthDate)) : undefined})));


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

    
    useEffect(() => {
        if (!firestore || !businessId) return;

        const appointmentsUnsub = onSnapshot(collection(firestore, `negocios/${businessId}/agendamentos`), (snap) => {
            const appointmentData = snap.docs.map(d => {
                const data = d.data();
                const date = data.date;
                // Handle both Timestamps and ISO strings
                const dateObj = date?.toDate ? date.toDate() : new Date(date);
                return {...data, id: d.id, date: dateObj} as Agendamento;
            });
            setAppointments(appointmentData);
        });

        // Add other listeners if you need real-time updates for them too

        return () => {
            appointmentsUnsub();
        }

    }, [firestore, businessId]);

    const MAX_SCHEDULED_APPOINTMENTS = 1;

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
        const foundClient = clients.find(c => c.phone === phoneAsNumber);
        
        setCurrentUser(foundClient || null);

        const clientAppointments = appointments.filter(a => a.cliente.phone === phoneAsNumber && a.status === 'Agendado');
        if (clientAppointments.length > 0) {
            setExistingAppointment(clientAppointments[0]);
            setStep('MODIFY_EXISTING');
        } else {
             setStep('NEW_CLIENT_FORM');
        }
    };

    const handleNewClientSubmit = async (data: NewClientFormValues) => {
        if (!firestore || !businessId || !businessSettings) return;
        
        const capitalizedName = capitalizeWords(data.name);
        const normalizedPhoneStr = normalizePhoneNumber(phone);
        const phoneAsNumber = parseInt(normalizedPhoneStr, 10);

        if (isNaN(phoneAsNumber)) {
            toast({ variant: "destructive", title: "Erro", description: "O número de telefone fornecido é inválido." });
            return;
        }

        const clientId = currentUser?.id || `client-${Date.now()}`;

        const clientData: Cliente = { 
            id: clientId,
            name: capitalizedName,
            birthDate: data.birthDate,
            phone: phoneAsNumber,
            status: currentUser?.status || "Ativo",
            avatarUrl: currentUser?.avatarUrl || undefined,
            instanciaWhatsapp: businessSettings.id,
        };
        
        await saveOrUpdateDocument('clientes', clientId, clientData, businessId);
        
        if (currentUser) {
            setClients(prev => prev.map(c => c.id === clientId ? clientData : c));
        } else {
            setClients(prev => [clientData, ...prev]);
        }
        
        setCurrentUser(clientData);
        setStep('SERVICE');
        
        toast({
            title: currentUser ? "Dados Confirmados!" : "Cadastro Concluído!",
            description: `Bem-vindo(a), ${clientData.name}!`,
        })
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
        
        if (!currentUser || !selectedService || !selectedProfessional || !selectedDate || !selectedTime || !firestore || !businessId || !businessSettings) {
            toast({ variant: "destructive", title: "Erro", description: "Todos os dados são necessários." });
            return;
        }
        
        setIsConfirming(true);
        
        try {
            const newAppointmentId = isEditing ? existingAppointment!.id : `appt-${Date.now()}`;
            const newAppointmentData: Agendamento = {
            id: newAppointmentId,
            cliente: currentUser,
            servico: selectedService,
            profissional: selectedProfessional,
            date: selectedDate,
            startTime: selectedTime,
            status: 'Agendado',
            instanciaWhatsapp: businessSettings.id,
            tokenInstancia: businessSettings.tokenInstancia ?? null
        };
        
        const serializableAppointment = {
            ...newAppointmentData,
            date: newAppointmentData.date.toISOString(),
        };

            await saveOrUpdateDocument('agendamentos', newAppointmentId, serializableAppointment, businessId);
            
            if (!isEditing) {
                await sendCreationHooks(businessSettings, serializableAppointment as any);
            }

            setAppointments(prev => {
                const otherAppointments = prev.filter(a => a.id !== newAppointmentId);
                return [newAppointmentData, ...otherAppointments];
            });
            
            setIsEditing(false);
            setStep('COMPLETED');
        } catch (error) {
            console.error('Erro ao confirmar agendamento:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Agendar',
                description: 'Não foi possível confirmar o agendamento. Tente novamente.',
            });
        } finally {
            setIsConfirming(false);
        }
    }
    
const handleCancelAppointment = async (appointmentId: string) => {
    if (!firestore || !businessId || !businessSettings || isCanceling) return;
    
    setIsCanceling(true);

    try {
        const appointmentToUpdate = appointments.find(a => a.id === appointmentId);
        if (!appointmentToUpdate) {
            setIsCanceling(false);
            return;
        }

        await saveOrUpdateDocument('agendamentos', appointmentId, { status: 'Cancelado' }, businessId);

    // Manually create a plain object to pass to the server action
    const serializableAppointment = {
        ...appointmentToUpdate,
        date: safeToISOString(appointmentToUpdate.date),
        cliente: {
            ...appointmentToUpdate.cliente,
            birthDate: safeToISOString(appointmentToUpdate.cliente.birthDate)
        }
    };
    
    const serializableSettings = JSON.parse(JSON.stringify(convertTimestamps(businessSettings)));

        await sendCancellationHooks(serializableSettings, serializableAppointment as any);
        
        setAppointments(prev => prev.map((appt) => appt.id === appointmentId ? { ...appt, status: 'Cancelado'} : appt));
        
        toast({
            title: 'Agendamento Cancelado',
            description: 'Seu horário foi cancelado com sucesso.',
        });

        resetFlow();
    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        toast({
            variant: 'destructive',
            title: 'Erro ao Cancelar',
            description: 'Não foi possível cancelar o agendamento. Tente novamente.',
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
        case 'SERVICE': setStep('NEW_CLIENT_FORM'); break;
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
        default: break;
        }
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhone(formatted);
        if (phoneError) {
             validatePhone(formatted);
        }
    };
  
    const NewClientForm = () => {
        const isMobile = useIsMobile();
        const [isCalendarOpen, setIsCalendarOpen] = useState(false);
        const [clientCalendarMonth, setClientCalendarMonth] = useState(
            currentUser?.birthDate ? new Date(currentUser.birthDate) : new Date()
        );
        
        const form = useForm<NewClientFormValues>({
            resolver: zodResolver(newClientFormSchema),
            defaultValues: {
                name: currentUser?.name || "",
                birthDate: currentUser?.birthDate ? new Date(currentUser.birthDate) : undefined,
            },
        });

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
                            {...field}
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
                        {isMobile ? (
                            <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant={"outline"}
                                        className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        {field.value ? (
                                            format(field.value, "dd/MM/yyyy")
                                        ) : (
                                            <span>Escolha uma data</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="w-auto max-w-[calc(100vw-2rem)] sm:max-w-md p-2">
                                    <DialogHeader>
                                        <DialogTitle className="sr-only">Selecione sua data de nascimento</DialogTitle>
                                        <DialogDescription className="sr-only">Use o calendário para escolher o dia, mês e ano.</DialogDescription>
                                    </DialogHeader>
                                    <Calendar
                                        mode="single"
                                        locale={ptBR}
                                        captionLayout="dropdown-buttons"
                                        fromYear={1920}
                                        toYear={new Date().getFullYear()}
                                        month={clientCalendarMonth}
                                        onMonthChange={setClientCalendarMonth}
                                        selected={field.value}
                                        onSelect={(date) => {
                                            if (date) field.onChange(date);
                                            setIsCalendarOpen(false);
                                        }}
                                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                        initialFocus
                                    />
                                </DialogContent>
                            </Dialog>
                        ) : (
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    type="button"
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "dd/MM/yyyy")
                                    ) : (
                                        <span>Escolha uma data</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        locale={ptBR}
                                        captionLayout="dropdown-buttons"
                                        fromYear={1920}
                                        toYear={new Date().getFullYear()}
                                        month={clientCalendarMonth}
                                        onMonthChange={setClientCalendarMonth}
                                        selected={field.value}
                                        onSelect={(date) => {
                                            if (date) field.onChange(date);
                                            setIsCalendarOpen(false);
                                        }}
                                        disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                        }
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button variant="gradient" type="submit" className="w-full">{currentUser ? 'Confirmar e Continuar' : 'Finalizar Cadastro'}</Button>
                </form>
            </Form>
        )
    }

    const ServiceList = () => {
        const activeServices = services.filter(s => s.status === 'Ativo');
        
        return (
            <div className="flex flex-col gap-3">
                {activeServices.map(service => (
                    <button 
                        key={service.id}
                        onClick={() => handleSelectService(service)}
                        className="flex w-full items-center justify-between rounded-md border p-4 text-left transition-all hover:bg-muted"
                    >
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 rounded-md">
                                <AvatarImage src={service.imageUrl || undefined} alt={service.name} className="object-cover" />
                                <AvatarFallback>{String(service.name || 'S').charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{service.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {service.duration} min - {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.price)}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                ))}
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
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={prof.avatarUrl || undefined} alt={prof.name} />
                                <AvatarFallback>{String(prof.name || 'P').charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{prof.name}</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
            const fetchTimes = async () => {
                if (selectedDate && selectedProfessional && selectedService && businessSettings) {
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
                        setAvailableTimes(times);
                    } catch (error) {
                        console.error("Failed to get available times:", error);
                        toast({ variant: "destructive", title: "Erro ao buscar horários" });
                        setAvailableTimes([]);
                    } finally {
                        setIsTimesLoading(false);
                    }
                } else {
                    setAvailableTimes([]);
                }
            }
            fetchTimes();
        }, [selectedDate, selectedProfessional, selectedService, businessSettings, appointments, blockedDates, businessId, isEditing, existingAppointment]);


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
                if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;

                const dayKey = format(date, 'eeee', { locale: ptBR }).toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace('-feira', '') as keyof HorarioTrabalho;
                
                const daySchedule = scheduleSource[dayKey];
                if (!daySchedule?.enabled) return true;
                
                return false;
            };

        }, [selectedProfessional, businessSettings]);

        const CalendarComponent = (
            <Calendar
                mode="single"
                locale={ptBR}
                selected={selectedDate}
                onSelect={(date) => {
                    if (date) {
                        setSelectedDate(date);
                        setSelectedTime(null);
                        if (getMonth(date) !== getMonth(calendarMonth)) {
                            setCalendarMonth(date);
                        }
                    }
                    if (isMobile) setIsCalendarOpen(false);
                }}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                disabled={disabledDays}
                className="rounded-md border mx-auto"
                captionLayout="dropdown-buttons"
                fromYear={new Date().getFullYear()}
                toYear={new Date().getFullYear() + 1}
            />
        );

        const CalendarTriggerButton = (
            <Button
                type="button"
                variant={"outline"}
                className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                )}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Escolha uma data</span>}
            </Button>
        )

        return (
            <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                <div className="flex-1 md:max-w-[350px]">
                    {isMobile ? (
                        <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <DialogTrigger asChild>
                                {CalendarTriggerButton}
                            </DialogTrigger>
                            <DialogContent className="w-auto max-w-[calc(100vw-2rem)] sm:max-w-md p-2">
                                <DialogHeader>
                                    <DialogTitle className="sr-only">Selecione uma data</DialogTitle>
                                    <DialogDescription className="sr-only">Selecione uma data no calendário abaixo.</DialogDescription>
                                </DialogHeader>
                                {CalendarComponent}
                            </DialogContent>
                        </Dialog>
                    ) : (
                        <Popover>
                            <PopoverTrigger asChild>
                                {CalendarTriggerButton}
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            {CalendarComponent}
                            </PopoverContent>
                        </Popover>
                    )}
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
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span>{currentUser.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Serviço:</span>
                        <span>{selectedService.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Profissional:</span>
                        <span>{selectedProfessional.name}</span>
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
                        <span>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(selectedService.price)}</span>
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
            <span>{format(new Date(existingAppointment.date), 'dd/MM/yyyy')} às {existingAppointment.startTime}</span>
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
                    onBlur={(e) => validatePhone(e.target.value)}
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
        case 'SERVICE': return `Serviços disponíveis para você, ${currentUser?.name?.split(' ')[0] || ''}.`;
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
                    <CardTitle className="text-2xl font-headline pt-2">{getStepTitle()}</CardTitle>
                    <CardDescription>{getStepDescription()}</CardDescription>
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
