"use client"

import { useState, useEffect, useMemo } from 'react'
import { getProfessionalsOnSnapshot, saveOrUpdateDocument, deleteDocument, getBusinessConfig } from '@/lib/firestore'
import { useFirebase } from '@/firebase'
import { useBusinessUser } from '@/contexts/BusinessUserContext'
import type { Profissional, ConfiguracoesNegocio } from '@/lib/types'
import { generateUUID } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PlusCircle, Loader2 } from 'lucide-react'
import { getColumns } from './columns'
import { DataTable } from '@/components/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProfessionalForm } from './professional-form'
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
import { ProfessionalCard } from './professional-card'
import { normalizePhoneNumber } from '@/lib/utils'
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


export default function ProfessionalsPage() {
  const { businessUserId } = useBusinessUser();
  const { toast } = useToast()
  const { user, firestore } = useFirebase()
  const [professionals, setProfessionals] = useState<Profissional[]>([])
  const [businessSettings, setBusinessSettings] = useState<ConfiguracoesNegocio | null>(null);
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false)
  const [selectedProfessional, setSelectedProfessional] = useState<Profissional | null>(null)
  const [professionalToDelete, setProfessionalToDelete] = useState<Profissional | null>(null)
  const [filter, setFilter] = useState('')
  
  const finalUserId = businessUserId || user?.uid;

  useEffect(() => {
    if (!finalUserId || !firestore) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);

    const professionalsUnsubscribe = getProfessionalsOnSnapshot(finalUserId, (data) => {
      setProfessionals(data);
    });

    const configPromise = getBusinessConfig(finalUserId).then(settings => {
      setBusinessSettings(serializeTimestamps(settings));
    }).catch(err => {
      console.error('Erro ao carregar configurações:', err);
      // Setar settings padrão para não ficar em loading infinito
      setBusinessSettings({} as ConfiguracoesNegocio);
    });

    Promise.all([configPromise]).finally(() => {
      setIsLoading(false);
    });

    return () => {
      professionalsUnsubscribe();
    };
  }, [finalUserId, firestore]);

  // Atualizar selectedProfessional quando professionals mudar (para refletir mudanças do Firestore)
  useEffect(() => {
    if (selectedProfessional && professionals.length > 0) {
      const updatedProfessional = professionals.find(p => p.id === selectedProfessional.id);
      if (updatedProfessional) {
        setSelectedProfessional(serializeTimestamps(updatedProfessional));
      }
    }
  }, [professionals, selectedProfessional?.id]);

  const handleCreateNew = () => {
    setSelectedProfessional(null)
    setIsFormModalOpen(true)
  }

  const handleEdit = (professional: Profissional) => {
    setSelectedProfessional(professional)
    setIsFormModalOpen(true)
  }

  const handleDeleteRequest = (professional: Profissional) => {
    setProfessionalToDelete(professional)
    setIsAlertDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (professionalToDelete && finalUserId) {
      await deleteDocument('profissionais', professionalToDelete.id, finalUserId)
      toast({
        title: "Profissional Excluído",
        description: `O profissional "${professionalToDelete.name}" foi excluído com sucesso.`,
      })
      setProfessionalToDelete(null)
    }
    setIsAlertDialogOpen(false)
  }

  const handleFormSubmit = async (data: any) => {
    console.log('[ProfessionalsPage] handleFormSubmit chamado com data:', data);
    console.log('[ProfessionalsPage] finalUserId:', finalUserId);
    console.log('[ProfessionalsPage] businessSettings:', businessSettings);
    
    if (!finalUserId) {
      console.error('[ProfessionalsPage] Erro: finalUserId não está definido');
      toast({
        variant: "destructive",
        title: "Erro de Autenticação",
        description: "Usuário não identificado. Por favor, faça login novamente.",
      });
      return;
    }
    
    if (!businessSettings) {
      console.error('[ProfessionalsPage] Erro: businessSettings não está definido');
      toast({
        variant: "destructive",
        title: "Configurações não Carregadas",
        description: "As configurações do negócio não foram carregadas. Atualize a página e tente novamente.",
      });
      return;
    }
    
    setIsSubmitting(true)
    try {
      const normalizedPhoneStr = normalizePhoneNumber(data.phone); // 11 dígitos
      
      // ⚠️ IMPORTANTE: Adicionar DDI 55 para salvar no Firestore (13 dígitos)
      // Frontend: 81997628611 (11 dígitos)
      // Firestore: 5581997628611 (13 dígitos com DDI)
      const phoneWithDDI = normalizedPhoneStr.startsWith('55') 
        ? normalizedPhoneStr 
        : `55${normalizedPhoneStr}`;
      
      const phoneAsNumber = parseInt(phoneWithDDI, 10);

      if (isNaN(phoneAsNumber) || phoneWithDDI.length !== 13) {
        toast({
          variant: "destructive",
          title: "Número de Telefone Inválido",
          description: "O número de telefone fornecido não é válido. Deve ter 11 dígitos (DDD + 9 + número).",
        });
        setIsSubmitting(false);
        return;
      }

      const existingProfessional = professionals.find(p => 
        p.phone && parseInt(String(p.phone), 10) === phoneAsNumber && p.id !== selectedProfessional?.id
      );

      if (existingProfessional) {
        toast({
          variant: "destructive",
          title: "Telefone Duplicado",
          description: "Este número de telefone já está sendo usado por outro profissional.",
        });
        setIsSubmitting(false);
        return;
      }

      const id = selectedProfessional ? selectedProfessional.id : `prof-${Date.now()}-${generateUUID().slice(0, 8)}`;

      let avatarUrl = data.avatarUrl || null;

      // 📸 AUTO-BUSCAR FOTO DO WHATSAPP se não tiver foto E WhatsApp estiver conectado
      // Usa endpoint: POST /chat/details (retorna image e imagePreview)
      if (!avatarUrl && !selectedProfessional && businessSettings.whatsappConectado && businessSettings.tokenInstancia) {
        try {
          console.log('📸 Buscando foto do WhatsApp automaticamente...');
          
          const response = await fetch('/api/professional/fetch-avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokenInstancia: businessSettings.tokenInstancia,
              phoneNumber: phoneAsNumber,
              businessId: finalUserId,
              professionalId: id
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.avatarUrl) {
              avatarUrl = result.avatarUrl;
              console.log('✅ Foto do WhatsApp obtida:', avatarUrl);
            }
          }
        } catch (photoError) {
          console.warn('⚠️ Não foi possível buscar foto do WhatsApp:', photoError);
          // Continua o cadastro mesmo se falhar a foto
        }
      }

      const professionalData = {
        name: data.name,
        phone: phoneAsNumber,
        status: data.status,
        avatarUrl: avatarUrl,
        workHours: data.workHours,
        notificarAgendamentos: data.notificarAgendamentos ?? true,
        instanciaWhatsapp: businessSettings.id,
        id: id,
      };

      await saveOrUpdateDocument('profissionais', id, professionalData, finalUserId)
      
      const hasWhatsAppPhoto = avatarUrl && !data.avatarUrl;
      toast({
        title: selectedProfessional ? "Profissional Atualizado" : "Profissional Salvo",
        description: `O profissional "${data.name}" foi salvo com sucesso${hasWhatsAppPhoto ? ' com foto do WhatsApp! 📸' : ''}.`,
      })

      setIsFormModalOpen(false)
      setSelectedProfessional(null)
    } catch (error) {
      console.error("Error saving professional:", error)
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: "Ocorreu um erro ao salvar o profissional. Tente novamente.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const dynamicColumns = getColumns({ onEdit: handleEdit, onDelete: handleDeleteRequest })
  
  const filteredProfessionals = useMemo(() => 
    professionals.filter(prof => {
      const profName = String(prof.name || '').toLowerCase();
      const profPhone = String(prof.phone || '').toLowerCase();
      const searchTerm = filter.toLowerCase();
      return profName.includes(searchTerm) || profPhone.includes(searchTerm);
    }), [professionals, filter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profissionais</h1>
          <p className="text-muted-foreground">Gerencie seus profissionais.</p>
        </div>
        <Button onClick={handleCreateNew} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Profissional
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Todos os Profissionais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="block md:hidden">
              <Input
                placeholder="Filtrar por nome do profissional..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="mb-4"
              />
              <div className="space-y-4">
              {filteredProfessionals.length > 0 ? (
                filteredProfessionals.map(prof => (
                  <ProfessionalCard 
                    key={prof.id} 
                    professional={prof} 
                    onEdit={handleEdit}
                    onDelete={handleDeleteRequest}
                  />
                ))
              ) : (
                 <p className="text-center text-muted-foreground py-8">Nenhum profissional encontrado.</p>
              )}
              </div>
          </div>
          <div className='hidden md:block overflow-x-auto'>
            <DataTable 
              columns={dynamicColumns} 
              data={professionals}
              filterColumn={{
                  id: "name",
                  placeholder: "Filtrar por nome..."
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormModalOpen} onOpenChange={(open) => {
          if (!open) {
            setSelectedProfessional(null);
          }
          setIsFormModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedProfessional ? 'Editar Profissional' : 'Novo Profissional'}</DialogTitle>
            <DialogDescription>
              {selectedProfessional ? 'Altere os detalhes e a agenda do profissional.' : 'Preencha os detalhes e defina a agenda do novo profissional.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1 -mx-1 md:px-6 md:-mx-6">
            <ProfessionalForm 
                key={selectedProfessional?.id || 'new-professional-form'}
                professional={selectedProfessional}
                onSubmit={handleFormSubmit} 
                isSubmitting={isSubmitting} 
                businessHours={businessSettings?.horariosFuncionamento}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="break-words text-sm sm:text-base">
                  Essa ação não pode ser desfeita. Isso excluirá permanentemente o profissional:
                </p>
                <div className="min-w-0 w-full">
                  <p className="font-bold break-all text-sm sm:text-base" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {professionalToDelete?.name}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
    

    
