/**
 * 📅 Agendamentos Page - REFATORADO COMPLETAMENTE
 * Elimina TODAS as gambiarras de data e usa nova arquitetura
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useFirebase } from '@/firebase'
import type { Agendamento, Cliente, Servico, Profissional, DataBloqueada, ConfiguracoesNegocio } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { PlusCircle, Trash2, CalendarClock, Loader2, Pencil, Link as LinkIcon, Copy } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { Input } from '@/components/ui/input'
import { AppointmentCard } from './appointment-card'
import { AppointmentBlockForm } from '../configuracoes/appointment-block-form'
import { AppointmentConfirmationModal } from '@/components/appointment-confirmation-modal'
import { AppointmentsFilter, type AppointmentFilters } from './appointments-filter'
import { FirestoreConnectionMonitor } from '@/components/FirestoreConnectionMonitor'

// ✅ NOVOS IMPORTS - Value Objects e Services
import { DateTime } from '@/core/value-objects/date-time'
import { Phone } from '@/core/value-objects/phone'
import { Money } from '@/core/value-objects/money'
import { getAppointmentsOnSnapshot, getClientsOnSnapshot, getProfessionalsOnSnapshot, getServicesOnSnapshot, saveOrUpdateDocument, deleteDocument, getBlockedDatesOnSnapshot, getBusinessConfig } from '@/lib/firestore'
import { generateUUID, convertTimestamps } from '@/lib/utils'
import { Timestamp } from 'firebase/firestore'
import { isSameDay, startOfDay, isDate, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ✅ Import real functions from actions
import { 
  sendCreationHooks,
  sendReminderHooksOnly,
  sendCancellationHooks,
  sendDeletionHooks,
  sendClientConfirmation,
  sendCompletionHooks
} from './actions';

// ✅ Sistema de lembretes via UazAPI
import { 
  createReminders, 
  updateReminders, 
  deleteReminders 
} from '@/lib/uazapi-reminders';

// ✅ Função refatorada para usar DateTime
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

// 🔄 Serialização profunda para Server Functions (converte Timestamps para strings ISO)
function deepSerializeForServerFunction(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (obj?.toDate) return obj.toDate().toISOString(); // Firestore Timestamp
  if (obj?.seconds !== undefined && obj?.nanoseconds !== undefined) {
    // Timestamp object literal
    return new Date(obj.seconds * 1000).toISOString();
  }
  if (Array.isArray(obj)) return obj.map(deepSerializeForServerFunction);
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = deepSerializeForServerFunction(obj[key]);
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

    // Wrapper para capturar erros nos listeners
    const safeListener = (listenerFn: any, name: string) => {
      try {
        return listenerFn;
      } catch (error) {
        console.error(`❌ Erro no listener ${name}:`, error);
        toast({
          variant: 'destructive',
          title: 'Erro de Conexão',
          description: `Falha ao carregar ${name}. Recarregue a página.`,
        });
        return () => {};
      }
    };

    const unsubAppointments = safeListener(
      getAppointmentsOnSnapshot(finalUserId, (data) => {
        setAppointments(serializeTimestamps(data));
      }),
      'Agendamentos'
    );
    
    const unsubClients = safeListener(
      getClientsOnSnapshot(finalUserId, (data) => {
        setClients(serializeTimestamps(data));
      }),
      'Clientes'
    );
    
    const unsubServices = safeListener(
      getServicesOnSnapshot(finalUserId, (services) => {
        setServices(services);
      }),
      'Serviços'
    );
    
    const unsubProfessionals = safeListener(
      getProfessionalsOnSnapshot(finalUserId, (profs) => {
        setProfessionals(profs);
      }),
      'Profissionais'
    );
    
    const unsubBlockedDates = safeListener(
      getBlockedDatesOnSnapshot(finalUserId, (data) => {
        setBlockedDates(serializeTimestamps(data));
      }),
      'Datas Bloqueadas'
    );

    getBusinessConfig(finalUserId)
      .then(settings => {
        setBusinessSettings(serializeTimestamps(settings));
        setIsLoading(false);
      })
      .catch(error => {
        console.error('❌ Erro ao carregar configurações:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao Carregar Configurações',
          description: 'Recarregue a página. Se persistir, faça logout e login novamente.',
        });
        setIsLoading(false);
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
        // Usar generateUUID() para garantir unicidade absoluta (evita duplicatas em cliques rápidos)
        const newId = `appt-${Date.now()}-${generateUUID().slice(0, 8)}`;
        
        
        const cliente = clients.find(c => c.id === data.clienteId);
        const servico = services.find(s => s.id === data.servicoId);
        const profissional = professionals.find(p => p.id === data.profissionalId);


        if (!cliente || !servico || !profissional) {
            const erroDetalhes = [];
            if (!cliente) erroDetalhes.push(`Cliente ID "${data.clienteId}" não encontrado na lista de ${clients.length} clientes`);
            if (!servico) erroDetalhes.push(`Serviço ID "${data.servicoId}" não encontrado na lista de ${services.length} serviços`);
            if (!profissional) erroDetalhes.push(`Profissional ID "${data.profissionalId}" não encontrado na lista de ${professionals.length} profissionais`);
            
            const errorMsg = `Dados inválidos:\n${erroDetalhes.join('\n')}`;
            console.error('❌ VALIDAÇÃO FALHOU:', errorMsg);
            throw new Error(errorMsg);
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

        // ✅ Serializar COMPLETAMENTE para evitar erro de Timestamp em Server Functions
        const serializableAppointment = deepSerializeForServerFunction({
            ...appointmentData,
            date: appointmentData.date,
        });
        
        const serializableSettings = deepSerializeForServerFunction(businessSettings);

        
        // Salvar o novo agendamento
        await saveOrUpdateDocument('agendamentos', newId, serializableAppointment, finalUserId);
        
        // Atualização otimista: adiciona/atualiza no estado local imediatamente
        if (isEditing) {
            setAppointments(prev => prev.map(appt => 
                appt.id === selectedAppointment.id ? appointmentData : appt
            ));
        } else {
            // Verifica se já existe antes de adicionar (evita duplicatas)
            setAppointments(prev => {
                const exists = prev.some(appt => appt.id === appointmentData.id);
                if (exists) {
                    return prev; // Já existe, não adiciona
                }
                return [appointmentData, ...prev]; // Adiciona no início
            });
        }
        
        // Notificar gestor sobre novo agendamento criado pelo painel
        if (!isEditing && data.status === 'Agendado') {
          try {
            const finalData = JSON.parse(JSON.stringify(convertTimestamps(serializableAppointment)));
            await sendCreationHooks(serializableSettings, finalData as any, undefined, true);
          } catch (error) {
            // Erro silencioso - logar apenas no servidor
          }
        }
        
        // Criar ou atualizar reminders via UazAPI
        if (data.status === 'Agendado') {
          try {
            let reminderCampaigns: any[] = [];
            
            if (!isEditing) {
              // Criar novos lembretes e obter os folder_ids
              reminderCampaigns = await createReminders(finalUserId, newId, serializableAppointment, serializableSettings);
            } else {
              // Atualizar lembretes (cancela antigos e cria novos)
              const oldCampaigns = selectedAppointment?.reminderCampaigns || [];
              reminderCampaigns = await updateReminders(finalUserId, newId, serializableAppointment, serializableSettings, oldCampaigns);
            }
            
            // Salvar os folder_ids no agendamento para controle futuro
            if (reminderCampaigns.length > 0) {
              await saveOrUpdateDocument('agendamentos', newId, {
                ...serializableAppointment,
                reminderCampaigns: reminderCampaigns.map(c => ({
                  type: c.type,
                  folderId: c.folderId,
                  scheduledFor: c.scheduledFor
                }))
              }, finalUserId);
            }
          } catch (error) {
            console.error('Erro ao criar/atualizar lembretes:', error);
            // Não bloqueia o fluxo
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
            
            // Cancelar campanhas de lembrete na UazAPI
            try {
              if (businessSettings.tokenInstancia && selectedAppointment?.reminderCampaigns) {
                await deleteReminders(businessSettings.tokenInstancia, selectedAppointment.reminderCampaigns);
              }
            } catch (error) {
              console.error('Erro ao cancelar lembretes:', error);
              // Não bloqueia o fluxo
            }
            
            try {
                await sendCancellationHooks(serializableSettings, finalData as any, true);
            } catch (error) {
                // Erro silencioso - logar apenas no servidor
            }
        }
        
        toast({ title: isEditing ? "Agendamento Atualizado" : "Agendamento Criado" });
        setIsFormModalOpen(false);

    } catch (error: any) {
        console.error('Erro ao salvar agendamento:', error);
        toast({ 
            variant: "destructive", 
            title: "Erro ao Salvar",
            description: error?.message || "Tente novamente"
        });
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
      toast({ title: "✅ Feedback Enviado", description: "Cliente receberá a mensagem em breve." });
    } catch (error: any) {
      console.error('Erro ao enviar feedback:', error);
      toast({ 
        variant: "destructive",
        title: "Erro ao Enviar Feedback", 
        description: error?.message || "Verifique as configurações de WhatsApp." 
      });
    } finally {
      setIsFeedbackConfirmOpen(false);
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
      
      // Atualização otimista do estado local
      setAppointments(prev => prev.map(appt => 
        appt.id === appointment.id ? updatedAppointment : appt
      ));
      
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
    console.error('Erro ao enviar confirmação:', error);
    toast({
      variant: 'destructive',
      title: '❌ Erro ao Enviar',
      description: error?.message || 'Não foi possível enviar a confirmação.',
    });
  } finally {
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
        
        // Cancelar campanhas de lembrete na UazAPI
        try {
            if (businessSettings.tokenInstancia && appointmentToDelete.reminderCampaigns) {
                await deleteReminders(businessSettings.tokenInstancia, appointmentToDelete.reminderCampaigns);
            }
        } catch (error) {
            console.error('Erro ao cancelar lembretes:', error);
            // Não bloqueia o fluxo
        }
        
        await sendDeletionHooks(serializableSettings, serializableAppointment as any);

        await deleteDocument('agendamentos', appointmentToDelete.id, finalUserId);
        
        // Atualização otimista do estado local
        setAppointments(prev => prev.filter(appt => appt.id !== appointmentToDelete.id));
        
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
        const id = selectedBlock ? selectedBlock.id : `block-${Date.now()}-${generateUUID().slice(0, 8)}`;
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
const dynamicColumns = useMemo(() => 
  getColumns({ onEdit: handleEdit, onDelete: handleDeleteRequest, onFinalize: handleFinalize }),
  [handleEdit, handleDeleteRequest, handleFinalize]
);
  
const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
        const { clientName, professionalId, serviceId, status, date } = filters;
        
        const dateObj = appointment.date?.toDate ? appointment.date.toDate() : new Date(appointment.date);

        const appointmentClientName = String(appointment.cliente.name || '').toLowerCase();
        const appointmentClientPhone = String(appointment.cliente.phone || '');
        const searchTerm = clientName.toLowerCase();
        if (clientName && !appointmentClientName.includes(searchTerm) && !appointmentClientPhone.includes(clientName)) return false;
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
    <>
        <FirestoreConnectionMonitor />
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
            <DialogContent className="max-w-[95vw] sm:max-w-xl max-h-[90vh] flex flex-col">
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
                        businessSettings={businessSettings}
                        onSubmit={handleFormSubmit}
                        isSubmitting={isSubmitting}
                    />
                </div>
            </DialogContent>
        </Dialog>

        {/* Alert Dialog for Delete Confirmation */}
        <AlertDialog open={isAlertDialogOpen} onOpenChange={(open) => {
            setIsAlertDialogOpen(open);
            // Limpar estado quando modal fecha (ESC ou clique fora)
            if (!open) setAppointmentToDelete(null);
        }}>
            <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p className="break-words text-sm sm:text-base">
                                Essa ação não pode ser desfeita. Isso excluirá permanentemente o agendamento do cliente:
                            </p>
                            <div className="min-w-0 w-full">
                                <p className="font-bold break-all text-sm sm:text-base" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    {appointmentToDelete?.cliente?.name || 'Cliente'}
                                </p>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDeleteConfirm} 
                        className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto" 
                        disabled={isSubmitting}
                    >
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
            <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-base sm:text-lg">Enviar feedback ao cliente?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm sm:text-base">
                        O agendamento foi marcado como Finalizado. Deseja enviar a solicitação de feedback para o cliente agora?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel onClick={handleSkipFeedbackSend} className="w-full sm:w-auto">Não enviar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmFeedbackSend} disabled={isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar agora
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Dialog for Managing Blocked Dates */}
        <Dialog open={isBlockDateDialogOpen} onOpenChange={setIsBlockDateDialogOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
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
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium break-all" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{d.reason || 'Sem motivo informado'}</span>
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
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col">
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
    </>
  );
}