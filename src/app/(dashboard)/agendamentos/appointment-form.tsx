
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import type { Agendamento, Cliente, Servico, Profissional } from '@/lib/types';
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
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingData, setPendingData] = useState<AppointmentFormValues | null>(null);

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
  useEffect(() => {
    if (Object.keys(formState.errors).length > 0) {
      useScrollToError(formState.errors);
    }
  }, [formState.errors]);
  
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
          // Gera horários 24h disponíveis de 30 em 30 minutos
          const times: string[] = [];
          for (let hour = 0; hour < 24; hour++) {
            times.push(`${String(hour).padStart(2, '0')}:00`);
            times.push(`${String(hour).padStart(2, '0')}:30`);
          }
          
          // If editing, make sure the current appointment's time is in the list
          if (appointment && appointment.startTime && !times.includes(appointment.startTime)) {
              times.push(appointment.startTime);
              times.sort();
          }

          setAvailableTimes(times);
          
          // Reset startTime se não estiver na nova lista de horários disponíveis
          // (exceto se for o horário do agendamento em edição)
          const currentTime = selectedTime;
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
  }, [selectedDate, selectedService, selectedProfessionalId, appointment, selectedTime, setValue]);

  const handleFormSubmit = (data: AppointmentFormValues) => {
    if (conflictWarning) {
      // Se há conflito, mostra o dialog
      setPendingData(data);
      setShowConflictDialog(true);
    } else {
      // Sem conflito, envia direto
      onSubmit(data);
    }
  };
  
  const handleConfirmWithConflict = () => {
    if (pendingData) {
      onSubmit(pendingData);
      setShowConflictDialog(false);
      setPendingData(null);
    }
  };

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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setClientPopoverOpen(true)}
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {selectedClient ? selectedClient.name : "Selecione o cliente"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                  
                  <Dialog open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                      <VisuallyHidden>
                        <DialogTitle>Selecione um cliente</DialogTitle>
                        <DialogDescription>Escolha o cliente para este agendamento</DialogDescription>
                      </VisuallyHidden>
                      <div className="space-y-4">
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
                                className="w-full justify-start"
                                onClick={() => {
                                  field.onChange(client.id);
                                  setClientPopoverOpen(false);
                                  setClientSearchTerm('');
                                }}
                              >
                                {field.value === client.id && (
                                  <Check className="mr-2 h-4 w-4" />
                                )}
                                {client.name}
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
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {selectedService ? selectedService.name : "Selecione o serviço"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                  
                  <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                      <VisuallyHidden>
                        <DialogTitle>Selecione um serviço</DialogTitle>
                        <DialogDescription>Escolha o serviço para este agendamento</DialogDescription>
                      </VisuallyHidden>
                      <div className="space-y-4">
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
                                className="w-full justify-start"
                                onClick={() => {
                                  field.onChange(service.id);
                                  setValue('profissionalId', '');
                                  setServiceDialogOpen(false);
                                  setServiceSearchTerm('');
                                }}
                              >
                                {field.value === service.id && (
                                  <Check className="mr-2 h-4 w-4" />
                                )}
                                {service.name}
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
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {selectedProfessional ? selectedProfessional.name : 
                       !selectedServiceId ? "Escolha um serviço" : "Selecione o profissional"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                  
                  <Dialog open={professionalDialogOpen} onOpenChange={setProfessionalDialogOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                      <VisuallyHidden>
                        <DialogTitle>Selecione um profissional</DialogTitle>
                        <DialogDescription>Escolha o profissional para este agendamento</DialogDescription>
                      </VisuallyHidden>
                      <div className="space-y-4">
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
                                className="w-full justify-start"
                                onClick={() => {
                                  field.onChange(professional.id);
                                  setProfessionalDialogOpen(false);
                                  setProfessionalSearchTerm('');
                                }}
                              >
                                {field.value === professional.id && (
                                  <Check className="mr-2 h-4 w-4" />
                                )}
                                {professional.name}
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
                    onChange={field.onChange}
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
                    <SelectContent className="max-h-[300px]">
                      {isLoadingTimes ? (
                        <div className="p-4 text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando horários...
                        </div>
                      ) : availableTimes.length > 0 ? (
                        availableTimes.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                          {!selectedServiceId || !selectedProfessionalId || !selectedDate
                            ? "Complete os campos anteriores"
                            : "Nenhum horário disponível para esta data"
                          }
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedDate && selectedService && selectedProfessionalId && availableTimes.length > 0 && !isLoadingTimes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {availableTimes.length} horários disponíveis
                    </p>
                  )}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Conflito de Horário Detectado!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {conflictWarning}
              <br /><br />
              <strong>Deseja agendar mesmo assim?</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingData(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmWithConflict}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Sim, Agendar Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
