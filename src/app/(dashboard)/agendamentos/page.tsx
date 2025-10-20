
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useFirebase } from '@/firebase'
import type { Agendamento, Cliente, Servico, Profissional, DataBloqueada, ConfiguracoesNegocio } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { PlusCircle, Link as LinkIcon, Copy, Trash2, CalendarClock, Loader2, Pencil } from 'lucide-react'
import { Calendar, Clock, User, Briefcase, Filter, X } from 'lucide-react'
import { useBusinessUser } from '@/contexts/BusinessUserContext'
import { getColumns } from './columns'
import { DataTable } from '@/components/data-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AppointmentForm } from './appointment-form'
import { createReminders, updateReminders, deleteReminders } from '@/lib/scheduled-reminders'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Input } from '@/components/ui/input'
import { format, isSameDay, isDate, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppointmentCard } from './appointment-card'
import { AppointmentBlockForm } from '../configuracoes/appointment-block-form'
import { sendCreationHooks, sendCompletionHooks, sendCancellationHooks, sendDeletionHooks, sendReminderHooksOnly, sendClientConfirmation } from './actions'
import { AppointmentConfirmationModal } from '@/components/appointment-confirmation-modal'
import { getAppointmentsOnSnapshot, getClientsOnSnapshot, getProfessionalsOnSnapshot, getServicesOnSnapshot, saveOrUpdateDocument, deleteDocument, getBlockedDatesOnSnapshot, getBusinessConfig } from '@/lib/firestore'
import { convertTimestamps, normalizePhoneNumber } from '@/lib/utils'
import { AppointmentsFilter, type AppointmentFilters } from './appointments-filter'
import { Timestamp } from 'firebase/firestore'

// Utility function to serialize Firestore Timestamps to plain objects
function serializeTimestamps<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Timestamp) {
    return obj.toDate() as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeTimestamps(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeTimestamps((obj as any)[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

export default function AgendamentosPage() {
  const { businessUserId } = useBusinessUser();
  const { toast } = useToast();
  const { user, firestore } = useFirebase();
  const [appointments, setAppointments] = useState<Agendamento[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [services, setServices] = useState<Servico[]>([]);
  const [professionals, setProfessionals] = useState<Profissional[]>([]);
  const [blockedDates, setBlockedDates] = useState<DataBloqueada[]>([]);
  const [businessSettings, setBusinessSettings] = useState<ConfiguracoesNegocio | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Agendamento | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Agendamento | null>(null);
  // Confirmação de envio de feedback ao finalizar
  const [isFeedbackConfirmOpen, setIsFeedbackConfirmOpen] = useState(false);
  const [pendingFeedbackPayload, setPendingFeedbackPayload] = useState<{
    settings: any;
    appointment: any;
  } | null>(null);
  const [isClientConfirmOpen, setIsClientConfirmOpen] = useState(false);
  const [pendingClientConfirm, setPendingClientConfirm] = useState<{
    settings: any;
    appointment: any;
  } | null>(null);
  
  const [filters, setFilters] = useState<AppointmentFilters>({
    clientName: '',
    professionalId: '',
    serviceId: '',
    status: '',
    date: null
  });

  const finalUserId = businessUserId || user?.uid;

  useEffect(() => {
    if (!finalUserId || !firestore) return;
    
    setIsLoading(true);

    const unsubAppointments = getAppointmentsOnSnapshot(finalUserId, (data) => {
      setAppointments(serializeTimestamps(data));
    });
    const unsubClients = getClientsOnSnapshot(finalUserId, (data) => {
      setClients(serializeTimestamps(data));
    });
    const unsubServices = getServicesOnSnapshot(finalUserId, setServices);
    const unsubProfessionals = getProfessionalsOnSnapshot(finalUserId, setProfessionals);
    const unsubBlockedDates = getBlockedDatesOnSnapshot(finalUserId, (data) => {
      setBlockedDates(serializeTimestamps(data));
    });

    getBusinessConfig(finalUserId).then(settings => {
      setBusinessSettings(serializeTimestamps(settings));
      setIsLoading(false); // Mover para cá: só desliga loading após carregar settings
    });

    return () => {
        unsubAppointments();
        unsubClients();
        unsubServices();
        unsubProfessionals();
        unsubBlockedDates();
    };

  }, [finalUserId, firestore]);
  
  const publicBookingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/agendar/${finalUserId}`;
  
  const handleCopyLink = () => {
    // Fallback for older browsers or non-secure contexts
    const textArea = document.createElement("textarea");
    textArea.value = publicBookingUrl;
    textArea.style.position = "fixed"; // Avoid scrolling to bottom
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            toast({ title: "Link Copiado!" });
        } else {
            toast({ variant: "destructive", title: "Falha ao copiar" });
        }
    } catch (err) {
        toast({ variant: "destructive", title: "Falha ao copiar" });
    }
    document.body.removeChild(textArea);
  };


  const handleCreateNew = () => {
    setSelectedAppointment(null);
    setIsFormModalOpen(true);
  }

  const handleEdit = (appointment: Agendamento) => {
    setSelectedAppointment(appointment);
    setIsFormModalOpen(true);
  };
  
  const handleFormSubmit = async (data: any) => {
    if (!finalUserId || !businessSettings) return;
    setIsSubmitting(true);
    
    try {
        const isEditing = !!selectedAppointment;
        
        // Se for edição, deletar o agendamento antigo e criar novo ID
        if (isEditing) {
            await deleteDocument('agendamentos', selectedAppointment.id, finalUserId);
        }
        
        // Sempre gerar novo ID (edição ou criação)
        const newId = `appt-${Date.now()}`;
        
        const cliente = clients.find(c => c.id === data.clienteId);
        const servico = services.find(s => s.id === data.servicoId);
        const profissional = professionals.find(p => p.id === data.profissionalId);

        if (!cliente || !servico || !profissional) {
            throw new Error("Dados inválidos para o agendamento.");
        }

        const appointmentData: Agendamento = {
            id: newId,
            cliente,
            servico,
            profissional,
            date: data.date,
            startTime: data.startTime,
            status: data.status,
        };

        const clientBirthDate = new Date(cliente.birthDate);
        const serializableAppointment = {
            ...appointmentData,
            date: appointmentData.date.toISOString(),
            cliente: {
                ...cliente,
                birthDate: cliente.birthDate && !isNaN(clientBirthDate.getTime()) ? clientBirthDate.toISOString() : null,
            },
        };
        
        const serializableSettings = JSON.parse(JSON.stringify(convertTimestamps(businessSettings)));

        // Salvar o novo agendamento
        await saveOrUpdateDocument('agendamentos', newId, serializableAppointment, finalUserId);
        
        // Criar ou atualizar reminders
        if (data.status === 'Agendado') {
          try {
            // Serializar dados para passar para server function
            const serializedAppointment = {
              ...appointmentData,
              date: appointmentData.date.toISOString(),
              cliente: {
                ...appointmentData.cliente,
                birthDate: appointmentData.cliente.birthDate ? new Date(appointmentData.cliente.birthDate).toISOString() : null
              }
            };
            
            if (!isEditing) {
              await createReminders(finalUserId, newId, serializedAppointment as any, serializableSettings);
            } else {
              await updateReminders(finalUserId, newId, serializedAppointment as any, serializableSettings);
            }
          } catch (error) {
            // Silencioso
          }
        }
        
        const wasCompleted = selectedAppointment?.status !== 'Finalizado' && data.status === 'Finalizado';
        const isNewAndFinalized = !isEditing && data.status === 'Finalizado';

        // Solicitar confirmação antes de enviar feedback se finalizado
        if (
          (wasCompleted || isNewAndFinalized) &&
          businessSettings?.whatsappConectado &&
          businessSettings?.habilitarFeedback &&
          businessSettings?.feedbackLink
        ) {
          const finalData = JSON.parse(JSON.stringify(convertTimestamps(serializableAppointment)));
          setPendingFeedbackPayload({ settings: serializableSettings, appointment: finalData });
          setIsFeedbackConfirmOpen(true);
        }
        
        // Send creation hooks only if it's a NEW appointment (not editing)
        if (!isEditing && data.status === 'Agendado') {
            try {
                await sendCreationHooks(serializableSettings, serializableAppointment as any, 'Gestor (Painel)', true); // isFromPanel: true
            } catch (error) {
                // Erro silencioso - logar apenas no servidor
            }
            
            // Mostrar modal de confirmação para enviar ao cliente
            // Só mostra se WhatsApp conectado E feature ativada
            if (businessSettings?.whatsappConectado && businessSettings?.notificarClienteAgendamento) {
                setPendingClientConfirm({ settings: serializableSettings, appointment: serializableAppointment });
                setIsClientConfirmOpen(true);
            }
        }
        
        // Send reminder hooks if EDITING and status is 'Agendado'
        if (isEditing && data.status === 'Agendado') {
            try {
                await sendReminderHooksOnly(serializableSettings, serializableAppointment as any);
            } catch (error) {
                // Erro silencioso - logar apenas no servidor
            }
        }
        
        // Send cancellation hooks if the status changes to 'Cancelado'
        if (selectedAppointment?.status !== 'Cancelado' && data.status === 'Cancelado') {
            const finalData = JSON.parse(JSON.stringify(convertTimestamps(serializableAppointment)));
            
            // Deletar reminders quando cancelar
            try {
              await deleteReminders(newId);
            } catch (error) {
              // Silencioso
            }
            
            try {
                await sendCancellationHooks(serializableSettings, finalData as any, 'Gestor (Painel)');
            } catch (error) {
                // Erro silencioso - logar apenas no servidor
            }
        }
        
        toast({ title: isEditing ? "Agendamento Atualizado" : "Agendamento Criado" });
        setIsFormModalOpen(false);

    } catch (error) {
        toast({ variant: "destructive", title: "Erro ao Salvar" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleFeedbackModalChange = (open: boolean) => {
    setIsFeedbackConfirmOpen(open);
    // Limpar estado pendente quando o modal fecha
    if (!open) {
      setPendingFeedbackPayload(null);
    }
  };

  const handleConfirmFeedbackSend = async () => {
    if (!pendingFeedbackPayload) return;
    setIsSubmitting(true);
    try {
      await sendCompletionHooks(pendingFeedbackPayload.settings, pendingFeedbackPayload.appointment);
      toast({ title: "Feedback enviado" });
    } catch (error) {
      // Silencioso: erros são logados no servidor
    } finally {
      setIsFeedbackConfirmOpen(false); // Vai limpar via handleFeedbackModalChange
      setIsSubmitting(false);
    }
  };

  const handleSkipFeedbackSend = () => {
    setIsFeedbackConfirmOpen(false); // Vai limpar via handleFeedbackModalChange
  };

  const handleFinalize = async (appointment: Agendamento) => {
    if (!finalUserId || !businessSettings) return;
    
    setIsSubmitting(true);
    try {
      // Atualizar status para Finalizado
      const updatedAppointment = {
        ...appointment,
        status: 'Finalizado' as const
      };

      const cliente = updatedAppointment.cliente;
      const clientBirthDate = new Date(cliente.birthDate);
      
      const serializableAppointment = {
        ...updatedAppointment,
        date: updatedAppointment.date instanceof Date 
          ? updatedAppointment.date.toISOString() 
          : updatedAppointment.date.toDate 
            ? updatedAppointment.date.toDate().toISOString()
            : new Date(updatedAppointment.date).toISOString(),
        cliente: {
          ...cliente,
          birthDate: cliente.birthDate && !isNaN(clientBirthDate.getTime()) 
            ? clientBirthDate.toISOString() 
            : null,
        },
      };
      
      const serializableSettings = JSON.parse(JSON.stringify(convertTimestamps(businessSettings)));

      // Salvar agendamento finalizado
      await saveOrUpdateDocument('agendamentos', appointment.id, serializableAppointment, finalUserId);
      
      toast({ title: "Agendamento Finalizado" });

      // Verificar se deve enviar feedback
      if (
        businessSettings?.whatsappConectado &&
        businessSettings?.habilitarFeedback &&
        businessSettings?.feedbackLink
      ) {
        const finalData = JSON.parse(JSON.stringify(convertTimestamps(serializableAppointment)));
        setPendingFeedbackPayload({ settings: serializableSettings, appointment: finalData });
        setIsFeedbackConfirmOpen(true);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao Finalizar" });
    } finally {
        setIsSubmitting(false);
    }
};

const handleClientConfirmModalChange = (open: boolean) => {
    setIsClientConfirmOpen(open);
    // Limpar estado pendente quando o modal fecha
    if (!open) {
        setPendingClientConfirm(null);
    }
};

const handleSendClientConfirmation = async () => {
    if (!pendingClientConfirm) return;
    
    try {
        await sendClientConfirmation(
            pendingClientConfirm.settings,
            pendingClientConfirm.appointment
        );
        
        toast({
            title: '✅ Confirmação Enviada',
            description: 'Cliente recebeu a confirmação do agendamento por WhatsApp.',
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: '❌ Erro ao Enviar',
            description: error.message || 'Não foi possível enviar a confirmação.',
        });
    } finally {
        // Fechar modal (que vai limpar o estado via handleClientConfirmModalChange)
        setIsClientConfirmOpen(false);
    }
};

const handleDeleteRequest = (appointment: Agendamento) => {
    setAppointmentToDelete(appointment);
    setIsAlertDialogOpen(true);
};

const safeToISOString = (date: any) => {
    if (!date) return null;
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(dateObj.getTime())) return null;
    return dateObj.toISOString();
};

const handleDeleteConfirm = async () => {
    if (!appointmentToDelete || !finalUserId || !businessSettings) return;
    
    setIsSubmitting(true);
    try {
        const serializableAppointment = {
            ...appointmentToDelete,
            date: safeToISOString(appointmentToDelete.date),
            createdAt: appointmentToDelete.createdAt ? safeToISOString(appointmentToDelete.createdAt) : undefined,
            canceledAt: appointmentToDelete.canceledAt ? safeToISOString(appointmentToDelete.canceledAt) : undefined,
            cliente: {
                ...appointmentToDelete.cliente,
                birthDate: safeToISOString(appointmentToDelete.cliente.birthDate),
            }
        };

        const serializableSettings = JSON.parse(JSON.stringify(convertTimestamps(businessSettings)));
        
        // Deletar reminders antes de deletar o agendamento
        try {
            await deleteReminders(appointmentToDelete.id);
        } catch (error) {
            // Silencioso
        }
        
        await sendDeletionHooks(serializableSettings, serializableAppointment as any);

        await deleteDocument('agendamentos', appointmentToDelete.id, finalUserId);
        
        toast({
            title: "Agendamento Excluído",
            description: `O agendamento foi excluído com sucesso.`,
        });
        
        setAppointmentToDelete(null);
        setIsAlertDialogOpen(false);

    } catch (error) {
        toast({ variant: "destructive", title: "Erro ao Excluir", description: "Não foi possível excluir o agendamento." });
    } finally {
        setIsSubmitting(false);
    }
};

// State and handlers for Blocked Dates
const [isBlockDateDialogOpen, setIsBlockDateDialogOpen] = useState(false);
const [isNewBlockEntryDialogOpen, setIsNewBlockEntryDialogOpen] = useState(false);
const [selectedBlock, setSelectedBlock] = useState<DataBloqueada | null>(null);
const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);
const MAX_BLOCKED_DATES = 3;
  
const handleBlockFormSubmit = async (data: Omit<DataBloqueada, 'id'>) => {
    if (!finalUserId) return;
    setIsSubmittingBlock(true);
    try {
        const id = selectedBlock ? selectedBlock.id : `block-${Date.now()}`;
        const blockToSave = {
            reason: data.reason,
            startDate: new Date(data.startDate).toISOString(),
            endDate: new Date(data.endDate).toISOString(),
        };
        await saveOrUpdateDocument('datasBloqueadas', id, blockToSave, finalUserId);
        toast({ title: selectedBlock ? "Bloqueio Atualizado" : "Data Bloqueada" });
        setIsNewBlockEntryDialogOpen(false);
        setSelectedBlock(null);
    } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar o bloqueio." });
    } finally {
        setIsSubmittingBlock(false);
    }
};

const handleDeleteBlockedDate = async (id: string) => {
    if (!finalUserId) return;
    
    // Encontrar o bloqueio para verificar se é passado
    const block = blockedDates.find(b => b.id === id);
    if (block) {
        const now = new Date();
        const blockEnd = new Date(block.endDate);
        
        // Verificar se o bloqueio já terminou (passado)
        if (blockEnd < now) {
            toast({ 
                variant: "destructive",
                title: "Não é possível excluir", 
                description: "Bloqueios passados não podem ser removidos. Eles servem como histórico." 
            });
            return;
        }
    }
    
    await deleteDocument('datasBloqueadas', id, finalUserId);
    toast({ title: "Bloqueio Removido" });
};

const handleEditBlock = (block: DataBloqueada) => {
    setSelectedBlock(block);
    setIsNewBlockEntryDialogOpen(true);
};

const handleAddNewBlock = () => {
    setSelectedBlock(null);
    setIsNewBlockEntryDialogOpen(true);
};

// --- RENDER ---
const dynamicColumns = getColumns({ onEdit: handleEdit, onDelete: handleDeleteRequest, onFinalize: handleFinalize });
  
const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
        const { clientName, professionalId, serviceId, status, date } = filters;
        
        const dateObj = appointment.date?.toDate ? appointment.date.toDate() : new Date(appointment.date);

        const appointmentClientName = String(appointment.cliente.name || '').toLowerCase();
        if (clientName && !appointmentClientName.includes(clientName.toLowerCase())) return false;
        if (professionalId && appointment.profissional.id !== professionalId) return false;
        if (serviceId && appointment.servico.id !== serviceId) return false;
        if (status && appointment.status !== status) return false;
        if (date && !isSameDay(startOfDay(dateObj), startOfDay(date))) return false;

        return true;
    }).sort((a, b) => {
        const dateA = isDate(a.date) ? a.date : new Date(a.date);
        const dateB = isDate(b.date) ? b.date : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });
}, [appointments, filters]);
  
if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
}

return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
                <p className="text-muted-foreground">Gerencie os horários dos seus clientes.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="destructive-gradient" onClick={() => setIsBlockDateDialogOpen(true)} className="w-full sm:w-auto">
                    <CalendarClock className="mr-2 h-4 w-4" />
                    Gerenciar Bloqueios
                </Button>
                <Button onClick={handleCreateNew} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Agendamento
                </Button>
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Link de Agendamento Público
                </CardTitle>
                <CardDescription>
                    Compartilhe este link com seus clientes para que eles possam agendar um horário online.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex w-full max-w-md items-center space-x-2">
                    <Input value={publicBookingUrl} readOnly />
                    <Button onClick={handleCopyLink} variant="outline" size="icon">
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copiar link</span>
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Todos os Agendamentos</CardTitle>
                <CardDescription>Filtre e gerencie todos os seus agendamentos em um só lugar.</CardDescription>
            </CardHeader>
            <CardContent>
                <AppointmentsFilter
                    filters={filters}
                    onFiltersChange={setFilters}
                    services={services}
                    professionals={professionals}
                />
                <div className="block md:hidden mt-4">
                    <div className="space-y-4">
                        {filteredAppointments.length > 0 ? (
                            filteredAppointments.map(appointment => (
                                <AppointmentCard 
                                    key={appointment.id} 
                                    appointment={appointment} 
                                    onEdit={handleEdit}
                                    onDelete={handleDeleteRequest}
                                    onFinalize={handleFinalize}
                                />
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">Nenhum agendamento encontrado para os filtros selecionados.</p>
                        )}
                    </div>
                </div>
                <div className='hidden md:block'>
                    <DataTable 
                        columns={dynamicColumns} 
                        data={filteredAppointments}
                    />
                </div>
            </CardContent>
        </Card>
        
        {/* Dialog for Create/Edit */}
        <Dialog open={isFormModalOpen} onOpenChange={(open) => {
            if (!open) setSelectedAppointment(null);
            setIsFormModalOpen(open);
        }}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{selectedAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
                    <DialogDescription>
                        Preencha os detalhes abaixo para criar ou editar um agendamento.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-1 -mx-1 md:px-6 md:-mx-6">
                    <AppointmentForm 
                        key={selectedAppointment ? selectedAppointment.id : 'new-appointment'}
                        appointment={selectedAppointment} 
                        clients={clients} 
                        services={services} 
                        professionals={professionals} 
                        allAppointments={appointments}
                        businessId={finalUserId!}
                        onSubmit={handleFormSubmit}
                        isSubmitting={isSubmitting}
                    />
                </div>
            </DialogContent>
        </Dialog>

        {/* Alert Dialog for Delete Confirmation */}
        <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Essa ação não pode ser desfeita. Isso excluirá permanentemente o agendamento do cliente
                        <span className="font-bold"> {appointmentToDelete?.cliente.name}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Confirmação para Cliente */}
        <AppointmentConfirmationModal
            open={isClientConfirmOpen}
            onOpenChange={handleClientConfirmModalChange}
            onConfirm={handleSendClientConfirmation}
            clientName={pendingClientConfirm?.appointment?.cliente?.name || ''}
        />

        {/* Alert Dialog for Feedback Confirmation */}
        <AlertDialog open={isFeedbackConfirmOpen} onOpenChange={handleFeedbackModalChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Enviar feedback ao cliente?</AlertDialogTitle>
                    <AlertDialogDescription>
                        O agendamento foi marcado como Finalizado. Deseja enviar a solicitação de feedback para o cliente agora?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleSkipFeedbackSend}>Não enviar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmFeedbackSend} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar agora
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Dialog for Managing Blocked Dates */}
        <Dialog open={isBlockDateDialogOpen} onOpenChange={setIsBlockDateDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Gerenciar Bloqueios de Agenda</DialogTitle>
                    <DialogDescription>
                        Adicione, edite ou remova bloqueios na agenda. Limite de {MAX_BLOCKED_DATES} bloqueios futuros.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                        {blockedDates.length > 0 ? (
                            blockedDates
                                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                                .map(d => {
                                    const isPast = new Date(d.endDate) < new Date();
                                    return (
                                        <div key={d.id} className={`flex items-center justify-between text-sm p-3 rounded-md border ${isPast ? 'opacity-60 bg-muted/30' : ''}`}>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{d.reason || 'Sem motivo informado'}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${isPast ? 'bg-gray-100 text-gray-600 dark:bg-gray-800' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`}>
                                                        {isPast ? 'Histórico' : 'Futuro'}
                                                    </span>
                                                </div>
                                                <p className="text-muted-foreground text-xs mt-1">
                                                    {isSameDay(new Date(d.startDate), new Date(d.endDate))
                                                        ? `${format(new Date(d.startDate), "dd/MM/yyyy 'das' HH:mm", { locale: ptBR })} às ${format(new Date(d.endDate), "HH:mm", { locale: ptBR })}`
                                                        : `${format(new Date(d.startDate), "dd/MM/yy HH:mm", { locale: ptBR })} até ${format(new Date(d.endDate), "dd/MM/yy HH:mm", { locale: ptBR })}`
                                                    }
                                                </p>
                                            </div>
                                            <div className='flex items-center'>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditBlock(d)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                {!isPast && (
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => handleDeleteBlockedDate(d.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhum bloqueio cadastrado.</p>
                        )}
                    </div>
                     <Button variant="outline" className="w-full" onClick={handleAddNewBlock} disabled={blockedDates.filter(d => new Date(d.endDate) >= new Date()).length >= MAX_BLOCKED_DATES}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Novo Bloqueio
                    </Button>
                </div>
                 <Button onClick={() => setIsBlockDateDialogOpen(false)}>Fechar</Button>
            </DialogContent>
        </Dialog>

        {/* Dialog for Creating/Editing a Block */}
         <Dialog open={isNewBlockEntryDialogOpen} onOpenChange={(open) => {
            if (!open) setSelectedBlock(null);
            setIsNewBlockEntryDialogOpen(open);
          }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                <DialogTitle>{selectedBlock ? 'Editar Bloqueio' : 'Criar Novo Bloqueio'}</DialogTitle>
                <DialogDescription>
                    Selecione o período que o estabelecimento estará fechado.
                </DialogDescription>
                </DialogHeader>
                 <div className="flex-1 overflow-y-auto px-1 -mx-1 md:px-6 md:-mx-6">
            <AppointmentBlockForm 
                key={selectedBlock?.id || 'new-block-form'}
                block={selectedBlock}
                onSubmit={handleBlockFormSubmit}
                isSubmitting={isSubmittingBlock}
                isPastBlock={selectedBlock ? new Date(selectedBlock.endDate) < new Date() : false}
            />
          </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
