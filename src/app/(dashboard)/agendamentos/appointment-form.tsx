
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatPhone } from '@/lib/phone-formatter';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StandardDatePicker } from '@/components/ui/standard-date-picker';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, isDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { Agendamento, Cliente, Servico, Profissional, ConfiguracoesNegocio, DataBloqueada } from '@/lib/types';
import { getAvailableTimes } from '@/lib/availability';
import { useScrollToError } from '@/lib/form-utils';

const appointmentFormSchema = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente.'),
  servicoId: z.string().min(1, 'Selecione um serviço.'),
  profissionalId: z.string().min(1, 'Selecione um profissional.'),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  startTime: z.string().min(1, 'Selecione um horário.'),
  status: z.enum(['Agendado', 'Finalizado', 'Cancelado']),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  appointment: Agendamento | null;
  clients: Cliente[];
  services: Servico[];
  professionals: Profissional[];
  allAppointments: Agendamento[];
  businessId: string;
  businessSettings: ConfiguracoesNegocio | null;
  businessBlockedDates?: DataBloqueada[]; // Bloqueios de agenda do negócio
  onSubmit: (data: AppointmentFormValues) => void;
  isSubmitting: boolean;
}

// Helper to safely create a Date object from various sources
const safeNewDate = (dateSource: any): Date | undefined => {
  if (!dateSource) return undefined;
  // Firestore Timestamp
  if (dateSource.seconds) {
    return new Date(dateSource.seconds * 1000);
  }
  // Already a Date object
  if (isDate(dateSource)) {
    return dateSource;
  }
  // String or number
  const date = new Date(dateSource);
  if (!isNaN(date.getTime())) {
    return date;
  }
  return undefined;
};

export function AppointmentForm({
  appointment,
  clients,
  services,
  professionals,
  allAppointments,
  businessId,
  businessSettings,
  businessBlockedDates = [],
  onSubmit,
  isSubmitting,
}: AppointmentFormProps) {
  const isMobile = useIsMobile();
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [professionalDialogOpen, setProfessionalDialogOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [professionalSearchTerm, setProfessionalSearchTerm] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [workDayWarning, setWorkDayWarning] = useState<string | null>(null);
  const [blockWarning, setBlockWarning] = useState<string | null>(null);
  const [businessClosedWarning, setBusinessClosedWarning] = useState<string | null>(null);
  const [businessBlockWarning, setBusinessBlockWarning] = useState<string | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingData, setPendingData] = useState<AppointmentFormValues | null>(null);
  const isSubmittingRef = useRef(false);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      clienteId: appointment?.cliente.id || '',
      servicoId: appointment?.servico.id || '',
      profissionalId: appointment?.profissional.id || '',
      date: safeNewDate(appointment?.date) || new Date(),
      startTime: appointment?.startTime || '',
      status: appointment?.status || 'Agendado',
    },
  });

  const { watch, control, setValue, formState } = form;
  const selectedServiceId = watch('servicoId');
  const selectedProfessionalId = watch('profissionalId');
  const selectedDate = watch('date');
  const selectedTime = watch('startTime');

  const selectedService = services.find((s) => s.id === selectedServiceId);
  
  // Scroll automático para primeiro erro
  useScrollToError(formState.errors);
  
  // Verifica conflitos de horário
  useEffect(() => {
    if (selectedDate && selectedTime && selectedProfessionalId && selectedService) {
      const appointmentsToCheck = appointment 
        ? allAppointments.filter(a => a.id !== appointment.id)
        : allAppointments;
      
      const conflicts = appointmentsToCheck.filter(appt => {
        if (appt.profissional.id !== selectedProfessionalId) return false;
        if (appt.status !== 'Agendado') return false;
        
        const apptDate = new Date(appt.date);
        if (apptDate.toDateString() !== selectedDate.toDateString()) return false;
        
        const [apptHour, apptMin] = appt.startTime.split(':').map(Number);
        if (apptHour === undefined || apptMin === undefined) return false;
        const apptStartMinutes = apptHour * 60 + apptMin;
        const apptEndMinutes = apptStartMinutes + appt.servico.duration;
        
        const [selHour, selMin] = selectedTime.split(':').map(Number);
        if (selHour === undefined || selMin === undefined) return false;
        const selStartMinutes = selHour * 60 + selMin;
        const selEndMinutes = selStartMinutes + selectedService.duration;
        
        return (selStartMinutes < apptEndMinutes && selEndMinutes > apptStartMinutes);
      });
      
      if (conflicts.length > 0) {
        const firstConflict = conflicts[0];
        if (!firstConflict) return;
        const conflictClient = firstConflict.cliente.name;
        const conflictTime = firstConflict.startTime;
        setConflictWarning(`⚠️ Conflito detectado! Já existe um agendamento com ${conflictClient} às ${conflictTime}. Você pode continuar, mas haverá sobreposição.`);
      } else {
        setConflictWarning(null);
      }
    } else {
      setConflictWarning(null);
    }
  }, [selectedDate, selectedTime, selectedProfessionalId, selectedService, allAppointments, appointment]);
  
  // Verifica se profissional trabalha no dia e se há bloqueios
  useEffect(() => {
    if (selectedDate && selectedProfessionalId) {
      const professional = professionals.find(p => p.id === selectedProfessionalId);
      if (!professional) {
        setWorkDayWarning(null);
        setBlockWarning(null);
        return;
      }

      // Verificar se o profissional trabalha no dia
      const dayOfWeek = selectedDate.getDay(); // 0 = Domingo, 1 = Segunda, etc
      const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;
      const dayName = dayNames[dayOfWeek];
      
      if (professional.workHours && dayName) {
        const workDay = professional.workHours[dayName];
        if (!workDay?.enabled || workDay.slots.length === 0) {
          setWorkDayWarning(`📅 Atenção: ${professional.name} geralmente não trabalha às ${format(selectedDate, 'EEEE', { locale: ptBR })}s.`);
        } else {
          setWorkDayWarning(null);
        }
      } else {
        setWorkDayWarning(null);
      }

      // Verificar bloqueios na agenda do profissional
      
      if (professional.datasBloqueadas && professional.datasBloqueadas.length > 0) {
        const selectedDateOnly = new Date(selectedDate);
        selectedDateOnly.setHours(0, 0, 0, 0);

        const blocked = professional.datasBloqueadas.find(block => {
          // Conversão segura de Timestamp do Firestore
          const startDate = block.startDate instanceof Date 
            ? new Date(block.startDate) 
            : new Date((block.startDate as any).seconds * 1000);
          const endDate = block.endDate instanceof Date 
            ? new Date(block.endDate) 
            : new Date((block.endDate as any).seconds * 1000);
          
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          
          const isBlocked = selectedDateOnly >= startDate && selectedDateOnly <= endDate;
          
          return isBlocked;
        });

        if (blocked) {
          const reason = blocked.reason ? `: ${blocked.reason}` : '';
          const warningMsg = `🚫 Atenção: ${professional.name} tem bloqueio de agenda neste dia${reason}.`;
          setBlockWarning(warningMsg);
        } else {
          setBlockWarning(null);
        }
      } else {
        setBlockWarning(null);
      }
    } else {
      setWorkDayWarning(null);
      setBlockWarning(null);
    }
  }, [selectedDate, selectedProfessionalId, professionals]);
  
  // Verifica se o negócio está fechado no dia e se há bloqueios de agenda do negócio
  useEffect(() => {
    if (selectedDate && businessSettings) {
      // Verificar se a loja está fechada neste dia da semana
      const dayOfWeek = selectedDate.getDay();
      const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;
      const dayName = dayNames[dayOfWeek];
      
      if (businessSettings.horariosFuncionamento && dayName) {
        const businessDay = businessSettings.horariosFuncionamento[dayName];
        if (!businessDay?.enabled || businessDay.slots.length === 0) {
          setBusinessClosedWarning(`🏪 Atenção: A loja está fechada às ${format(selectedDate, 'EEEE', { locale: ptBR })}s.`);
        } else {
          setBusinessClosedWarning(null);
        }
      } else {
        setBusinessClosedWarning(null);
      }
      
      // Verificar bloqueios de agenda do negócio
      
      if (businessBlockedDates && businessBlockedDates.length > 0) {
        const selectedDateOnly = new Date(selectedDate);
        selectedDateOnly.setHours(0, 0, 0, 0);
        
        const blocked = businessBlockedDates.find(block => {
          // Conversão segura de Timestamp do Firestore
          const startDate = block.startDate instanceof Date 
            ? new Date(block.startDate) 
            : new Date((block.startDate as any).seconds * 1000);
          const endDate = block.endDate instanceof Date 
            ? new Date(block.endDate) 
            : new Date((block.endDate as any).seconds * 1000);
          
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          
          const isBlocked = selectedDateOnly >= startDate && selectedDateOnly <= endDate;
          
          return isBlocked;
        });
        
        if (blocked) {
          const reason = blocked.reason ? `: ${blocked.reason}` : '';
          const warningMsg = `🔒 Atenção: A loja tem bloqueio de agenda neste dia${reason}.`;
          setBusinessBlockWarning(warningMsg);
        } else {
          setBusinessBlockWarning(null);
        }
      } else {
        setBusinessBlockWarning(null);
      }
    } else {
      setBusinessClosedWarning(null);
      setBusinessBlockWarning(null);
    }
  }, [selectedDate, businessSettings, businessBlockedDates]);
  
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm) return clients;
    const lower = clientSearchTerm.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(lower) || 
      String(c.phone).includes(clientSearchTerm)
    );
  }, [clientSearchTerm, clients]);
  
  const filteredServices = useMemo(() => {
    if (!serviceSearchTerm) return services;
    const lower = serviceSearchTerm.toLowerCase();
    return services.filter(s => 
      s.name.toLowerCase().includes(lower)
    );
  }, [serviceSearchTerm, services]);

  // Filter professionals based on the selected service
  const availableProfessionals = useMemo(() => {
    if (!selectedServiceId) {
      return professionals.filter(p => p.status === 'Ativo');
    }
    const service = services.find(s => s.id === selectedServiceId);
    if (!service) return [];
    
    // Get professional IDs associated with the service
    const professionalIds = service.professionals.map(p => p.id);
    // Filter the main professionals list
    return professionals.filter(p => professionalIds.includes(p.id) && p.status === 'Ativo');

  }, [selectedServiceId, services, professionals]);
  
  const filteredProfessionals = useMemo(() => {
    if (!professionalSearchTerm) return availableProfessionals;
    const lower = professionalSearchTerm.toLowerCase();
    return availableProfessionals.filter(p => 
      p.name.toLowerCase().includes(lower)
    );
  }, [professionalSearchTerm, availableProfessionals]);


  useEffect(() => {
    // Reset professional if not available for the selected service
    if (selectedServiceId && selectedProfessionalId) {
      if (!availableProfessionals.some(p => p.id === selectedProfessionalId)) {
        setValue('profissionalId', '');
      }
    }
  }, [selectedServiceId, selectedProfessionalId, availableProfessionals, setValue]);

  useEffect(() => {
    const fetchAvailableTimes = () => {
      if (selectedDate && selectedService && selectedProfessionalId) {
        setIsLoadingTimes(true);
        
        try {
          // 🎯 PAINEL ADMINISTRATIVO: HORÁRIOS LIVRES PARA CONTROLE
          // Gestor pode agendar qualquer horário, mesmo passados ou fora do expediente
          // Usado para registrar atendimentos já realizados ou situações especiais
          const times: string[] = [];
          
          for (let hour = 0; hour < 24; hour++) {
            for (let minute of [0, 30]) {
              const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
              times.push(timeStr);
            }
          }
          
          // If editing, make sure the current appointment's time is in the list
          if (appointment && appointment.startTime && !times.includes(appointment.startTime)) {
              times.push(appointment.startTime);
              times.sort();
          }

          setAvailableTimes(times);
          
          // Pré-selecionar horário de abertura do negócio se for novo agendamento
          if (!appointment && !selectedTime && businessSettings?.horariosFuncionamento) {
            const dayOfWeek = selectedDate.getDay(); // 0 = Domingo, 1 = Segunda, etc
            const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;
            
            if (dayOfWeek >= 0 && dayOfWeek < 7) {
              const dayName = dayNames[dayOfWeek] || 'domingo';
              const horariosDay = businessSettings.horariosFuncionamento[dayName];
              if (horariosDay && horariosDay.enabled && horariosDay.slots.length > 0 && horariosDay.slots[0]) {
                const firstSlotTime = horariosDay.slots[0].start;
                
                // Verificar se o horário de abertura está na lista de horários disponíveis
                if (times.includes(firstSlotTime)) {
                  setValue('startTime', firstSlotTime);
                } else if (times.length > 0) {
                  // Se o horário de abertura não está disponível, usar o primeiro horário disponível
                  setValue('startTime', times[0] || '');
                }
              }
            }
          }
          
          // Reset startTime se não estiver na nova lista de horários disponíveis
          // (exceto se for o horário do agendamento em edição)
          const currentTime = form.getValues('startTime');
          if (currentTime && !times.includes(currentTime)) {
            const isEditingOriginalTime = appointment && appointment.startTime === currentTime;
            if (!isEditingOriginalTime) {
              setValue('startTime', '');
            }
          }
        } catch (error) {
          setAvailableTimes([]);
        } finally {
          setIsLoadingTimes(false);
        }
      } else {
        setAvailableTimes([]);
        setIsLoadingTimes(false);
      }
    };
    
    fetchAvailableTimes();
  }, [selectedDate, selectedService, selectedProfessionalId, appointment, businessSettings, setValue, form]);

  const handleFormSubmit = (data: AppointmentFormValues) => {
    // Proteção contra duplo clique
    if (isSubmittingRef.current || isSubmitting) {
      return;
    }
    
    isSubmittingRef.current = true;
    
    // Se há qualquer aviso (conflito, dia não trabalhado, bloqueio, loja fechada ou bloqueio do negócio), mostra o dialog
    if (conflictWarning || workDayWarning || blockWarning || businessClosedWarning || businessBlockWarning) {
      setPendingData(data);
      setShowConflictDialog(true);
      isSubmittingRef.current = false; // Libera se for apenas abrir dialog
    } else {
      // Sem avisos, envia direto
      onSubmit(data);
      // isSubmittingRef será resetado quando o form fechar/reabrir
    }
  };
  
  const handleConfirmWithConflict = () => {
    if (pendingData && !isSubmittingRef.current) {
      isSubmittingRef.current = true;
      onSubmit(pendingData);
      setPendingData(null);
      setShowConflictDialog(false);
    }
  };

  // Reset do flag quando form é resetado (novo agendamento)
  useEffect(() => {
    if (!appointment) {
      isSubmittingRef.current = false;
    }
  }, [appointment]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="clienteId"
            render={({ field }) => {
              const selectedClient = clients.find(c => c.id === field.value);
              
              return (
                <FormItem className="flex flex-col">
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setClientPopoverOpen(true)}
                            className={cn(
                              "w-full justify-between min-w-0 h-auto py-2",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {selectedClient ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 min-w-0 flex-1 text-left">
                                <span className="truncate font-medium text-sm">{selectedClient.name}</span>
                                <span className="text-xs sm:text-sm text-muted-foreground sm:text-right truncate">{formatPhone(selectedClient.phone)}</span>
                              </div>
                            ) : (
                              <span className="text-left">Selecione o cliente</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-50" />
                          </Button>
                        </TooltipTrigger>
                        {selectedClient && selectedClient.name.length > 30 && (
                          <TooltipContent>
                            <p>{selectedClient.name} - {formatPhone(selectedClient.phone)}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </FormControl>
                  
                  <Dialog open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                    <DialogContent className="max-w-[90vw] sm:max-w-[425px] overflow-hidden">
                      <VisuallyHidden>
                        <DialogTitle>Selecione um cliente</DialogTitle>
                        <DialogDescription>Escolha o cliente para este agendamento</DialogDescription>
                      </VisuallyHidden>
                      <div className="space-y-4 min-w-0">
                        <Input
                          placeholder="Buscar por nome ou telefone..."
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                        />
                        <div className="max-h-[300px] overflow-y-auto space-y-1">
                          {filteredClients.length > 0 ? (
                            filteredClients.map((client) => (
                              <Button
                                key={client.id}
                                variant={field.value === client.id ? "secondary" : "ghost"}
                                className="w-full justify-start min-w-0 h-auto py-2"
                                onClick={() => {
                                  field.onChange(client.id);
                                  setClientPopoverOpen(false);
                                  setClientSearchTerm('');
                                }}
                              >
                                {field.value === client.id && (
                                  <Check className="mr-2 h-4 w-4 flex-shrink-0" />
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 min-w-0 flex-1">
                                  <span className="truncate font-medium text-left">{client.name}</span>
                                  <span className="text-xs sm:text-sm text-muted-foreground sm:text-right truncate">{formatPhone(client.phone)}</span>
                                </div>
                              </Button>
                            ))
                          ) : (
                            <p className="text-center text-sm text-muted-foreground py-6">
                              Nenhum cliente encontrado
                            </p>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={control}
            name="servicoId"
            render={({ field }) => {
              const selectedService = services.find(s => s.id === field.value);
              
              return (
                <FormItem className="flex flex-col">
                  <FormLabel>Serviço</FormLabel>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setServiceDialogOpen(true)}
                      className={cn(
                        "w-full justify-between min-w-0",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <span className="truncate block min-w-0 flex-1 text-left">{selectedService ? selectedService.name : "Selecione o serviço"}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                  
                  <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                    <DialogContent className="max-w-[90vw] sm:max-w-[425px] overflow-hidden">
                      <VisuallyHidden>
                        <DialogTitle>Selecione um serviço</DialogTitle>
                        <DialogDescription>Escolha o serviço para este agendamento</DialogDescription>
                      </VisuallyHidden>
                      <div className="space-y-4 min-w-0">
                        <Input
                          placeholder="Buscar serviço..."
                          value={serviceSearchTerm}
                          onChange={(e) => setServiceSearchTerm(e.target.value)}
                        />
                        <div className="max-h-[300px] overflow-y-auto space-y-1">
                          {filteredServices.length > 0 ? (
                            filteredServices.map((service) => (
                              <Button
                                key={service.id}
                                variant={field.value === service.id ? "secondary" : "ghost"}
                                className="w-full justify-start min-w-0"
                                onClick={() => {
                                  field.onChange(service.id);
                                  setValue('profissionalId', '');
                                  setServiceDialogOpen(false);
                                  setServiceSearchTerm('');
                                }}
                              >
                                {field.value === service.id && (
                                  <Check className="mr-2 h-4 w-4 flex-shrink-0" />
                                )}
                                <span className="truncate block min-w-0">{service.name}</span>
                              </Button>
                            ))
                          ) : (
                            <p className="text-center text-sm text-muted-foreground py-6">
                              Nenhum serviço encontrado
                            </p>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={control}
            name="profissionalId"
            render={({ field }) => {
              const selectedProfessional = availableProfessionals.find(p => p.id === field.value);
              
              return (
                <FormItem className="flex flex-col">
                  <FormLabel>Profissional</FormLabel>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setProfessionalDialogOpen(true)}
                      disabled={!selectedServiceId || availableProfessionals.length === 0}
                      className={cn(
                        "w-full justify-between min-w-0",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <span className="truncate block min-w-0 flex-1 text-left">{selectedProfessional ? selectedProfessional.name : 
                       !selectedServiceId ? "Escolha um serviço" : "Selecione o profissional"}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                  
                  <Dialog open={professionalDialogOpen} onOpenChange={setProfessionalDialogOpen}>
                    <DialogContent className="max-w-[90vw] sm:max-w-[425px] overflow-hidden">
                      <VisuallyHidden>
                        <DialogTitle>Selecione um profissional</DialogTitle>
                        <DialogDescription>Escolha o profissional para este agendamento</DialogDescription>
                      </VisuallyHidden>
                      <div className="space-y-4 min-w-0">
                        <Input
                          placeholder="Buscar profissional..."
                          value={professionalSearchTerm}
                          onChange={(e) => setProfessionalSearchTerm(e.target.value)}
                        />
                        <div className="max-h-[300px] overflow-y-auto space-y-1">
                          {filteredProfessionals.length > 0 ? (
                            filteredProfessionals.map((professional) => (
                              <Button
                                key={professional.id}
                                variant={field.value === professional.id ? "secondary" : "ghost"}
                                className="w-full justify-start min-w-0"
                                onClick={() => {
                                  field.onChange(professional.id);
                                  setProfessionalDialogOpen(false);
                                  setProfessionalSearchTerm('');
                                }}
                              >
                                {field.value === professional.id && (
                                  <Check className="mr-2 h-4 w-4 flex-shrink-0" />
                                )}
                                <span className="truncate block min-w-0">{professional.name}</span>
                              </Button>
                            ))
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
              );
            }}
          />

          <FormField
            control={control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data</FormLabel>
                <FormControl>
                  <StandardDatePicker
                    value={field.value}
                    onChange={(date) => {
                      // Só atualizar se date não for undefined, ou se for uma limpeza intencional
                      if (date) {
                        field.onChange(date);
                      } else if (date === undefined && !field.value) {
                        // Permitir undefined apenas se já estiver vazio
                        field.onChange(date);
                      }
                      // Se date é undefined mas field.value existe, ignorar (não limpar)
                    }}
                    placeholder="Escolha uma data"
                    isMobile={isMobile}
                    forceDialog={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

         
            <FormField
              control={control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                    disabled={isLoadingTimes || !selectedProfessionalId || !selectedServiceId || !selectedDate}
                  >
                    <FormControl>
                      <SelectTrigger>
                        {isLoadingTimes ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Carregando horários...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder={
                            !selectedServiceId ? "Escolha um serviço" :
                            !selectedProfessionalId ? "Escolha um profissional" :
                            !selectedDate ? "Escolha uma data" :
                            "Selecione um horário"
                          } />
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent side="top" className="max-h-[300px]">
                      {isLoadingTimes ? (
                        <div className="p-4 text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando horários...
                        </div>
                      ) : availableTimes.length === 0 ? (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                          Nenhum horário disponível
                        </div>
                      ) : (
                        availableTimes.map(time => {
                          const isSelected = time === selectedTime;
                          return (
                            <SelectItem key={time} value={time} className={isSelected ? 'bg-primary/10' : ''}>
                              {time}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          

          <FormField
            control={control}
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
                    <SelectItem value="Agendado">Agendado</SelectItem>
                    <SelectItem value="Finalizado">Finalizado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
      
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              {conflictWarning ? 'Conflito Detectado!' : 'Atenção ao Agendar'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {/* Avisos sobre o NEGÓCIO */}
                {businessClosedWarning && (
                  <div className="text-sm sm:text-base break-words bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {businessClosedWarning}
                  </div>
                )}
                {businessBlockWarning && (
                  <div className="text-sm sm:text-base break-words bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {businessBlockWarning}
                  </div>
                )}
                
                {/* Avisos sobre o PROFISSIONAL */}
                {workDayWarning && (
                  <div className="text-sm sm:text-base break-words bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {workDayWarning}
                  </div>
                )}
                {blockWarning && (
                  <div className="text-sm sm:text-base break-words bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {blockWarning}
                  </div>
                )}
                
                {/* Avisos de CONFLITO */}
                {conflictWarning && (
                  <div className="text-sm sm:text-base break-words bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {conflictWarning}
                  </div>
                )}
                
                <strong className="block pt-2 text-sm sm:text-base">Deseja agendar mesmo assim?</strong>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setPendingData(null)} className="w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmWithConflict}
              className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
            >
              Sim, Agendar Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
