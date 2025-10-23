/**
 * 👥 Clientes Page - REFATORADO COMPLETAMENTE
 * Usa os novos value objects para formatação padronizada
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { getClientsOnSnapshot, saveOrUpdateDocument, deleteDocument, getBusinessConfig } from '@/lib/firestore'
import { useFirebase } from '@/firebase'
import { useBusinessUser } from '@/contexts/BusinessUserContext'
import type { Cliente, ConfiguracoesNegocio } from '@/lib/types'
import { generateUUID } from '@/lib/utils'

// ✅ NOVOS IMPORTS - Value Objects
import { DateTime } from '@/core/value-objects/date-time'
import { Phone } from '@/core/value-objects/phone'
import { Button } from '@/components/ui/button'
import { PlusCircle, Loader2, Upload } from 'lucide-react'
import { getColumns } from './columns'
import { ImportClientsDialog } from './import-clients-dialog'
import { DataTable } from '@/components/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClientForm } from './client-form'
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
import { normalizePhoneNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { handleError } from '@/lib/error-handler'
import { ClientStatsCards } from './client-stats-cards'
import { Input } from '@/components/ui/input'
import { ClientCard } from './client-card'
import { Timestamp } from 'firebase/firestore'
import { useDebounce } from '@/hooks/use-debounce'
import { convertTimestamps } from '@/lib/utils'

export default function ClientsPage() {
  const { businessUserId } = useBusinessUser()
  const { toast } = useToast()
  const { user, firestore } = useFirebase()
  const [clients, setClients] = useState<Cliente[]>([])
  const [businessSettings, setBusinessSettings] = useState<ConfiguracoesNegocio | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null)
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null)
  const [filter, setFilter] = useState('')
  const debouncedFilter = useDebounce(filter, 300) // ⚡ Otimização: Debounce de 300ms
  const [mobileCurrentPage, setMobileCurrentPage] = useState(1)
  const MOBILE_ITEMS_PER_PAGE = 20 // Limite de itens por página no mobile
  
  const finalUserId = businessUserId || user?.uid;

  useEffect(() => {
    if (!finalUserId || !firestore) return
    
    const unsubscribe = getClientsOnSnapshot(finalUserId, (data) => {
      // ✅ CRITICAL: Serializar TODOS os timestamps antes de setar no state
      const serializedClients = data.map(client => convertTimestamps(client));
      setClients(serializedClients)
      setIsLoading(false)
    })
    
     getBusinessConfig(finalUserId).then(settings => {
      setBusinessSettings(convertTimestamps(settings));
    });

    return () => unsubscribe()
  }, [finalUserId, firestore])

  const handleCreateNew = useCallback(() => {
    setSelectedClient(null)
    setIsFormModalOpen(true)
  }, [])

  const handleEdit = useCallback((client: Cliente) => {
    setSelectedClient(client);
    setIsFormModalOpen(true)
  }, [])

  const handleDeleteRequest = useCallback((clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setClientToDelete(client)
      setIsAlertDialogOpen(true)
    }
  }, [clients])

  const handleDeleteConfirm = async () => {
    if (!clientToDelete || !finalUserId) {
      setIsAlertDialogOpen(false);
      return;
    }

    try {
      await deleteDocument('clientes', clientToDelete.id, finalUserId);
      
      toast({
        title: "Cliente Excluído",
        description: `O cliente "${clientToDelete.name}" foi excluído com sucesso.`,
      });
      
      setClientToDelete(null);
      setIsAlertDialogOpen(false);
    } catch (error) {
      handleError(error, { context: 'Delete client', clientId: clientToDelete.id });
      toast({
        variant: "destructive",
        title: "Erro ao Excluir",
        description: "Não foi possível excluir o cliente. Tente novamente.",
      });
      setIsAlertDialogOpen(false);
    }
  }

  const handleFormSubmit = async (data: any) => {
    if (!finalUserId || !businessSettings) return;
    setIsSubmitting(true);

    try {
      const numericPhone = parseInt(normalizePhoneNumber(data.phone), 10);

      if (isNaN(numericPhone)) {
        toast({
          variant: "destructive",
          title: "Número de Telefone Inválido",
          description: "O número de telefone fornecido não é válido.",
        });
        setIsSubmitting(false);
        return;
      }

      const isDuplicate = clients.some(client =>
        client.phone && parseInt(String(client.phone), 10) === numericPhone && client.id !== selectedClient?.id
      );

      if (isDuplicate) {
        toast({
          variant: "destructive",
          title: "Telefone Duplicado",
          description: "Este número de WhatsApp já pertence a outro cliente.",
        });
        setIsSubmitting(false);
        return;
      }

      const id = selectedClient ? selectedClient.id : `client-${Date.now()}-${generateUUID().slice(0, 8)}`;

      // 🔥 OTIMIZAÇÃO: Extrair mês e dia para query eficiente de aniversários
      let birthMonth: number | null = null;
      let birthDay: number | null = null;
      if (data.birthDate) {
        birthMonth = data.birthDate.getMonth() + 1; // 1-12
        birthDay = data.birthDate.getDate(); // 1-31
      }

      const clientData: any = {
        name: data.name,
        phone: numericPhone,
        birthDate: data.birthDate ? data.birthDate.toISOString() : null, // String ISO
        birthMonth, // Para query otimizada de aniversários
        birthDay, // Para query otimizada de aniversários
        status: data.status,
        avatarUrl: data.avatarUrl || null,
        observacoes: data.observacoes || null,
        instanciaWhatsapp: businessSettings.id,
        id: id,
      };

      // Adicionar plano de saúde se fornecido
      if (data.temPlano && data.planoSaude) {
        clientData.planoSaude = data.planoSaude;
      } else {
        clientData.planoSaude = null; // Remover plano se desativado
      }

      await saveOrUpdateDocument('clientes', id, clientData, finalUserId)

      toast({
        title: selectedClient ? "Cliente Atualizado" : "Cliente Salvo",
        description: `O cliente "${data.name}" foi salvo com sucesso.`,
      })
      setIsFormModalOpen(false)
    } catch (error) {
      handleError(error, { context: 'Save client' })
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: "Ocorreu um erro ao salvar o cliente. Tente novamente.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImportClients = async (importedClients: Array<{ name: string; phone: number }>) => {
    if (!finalUserId || !businessSettings || !firestore) return

    try {
      // 🚀 OTIMIZAÇÃO: Usar batch para importar múltiplos clientes de uma vez
      const { writeBatch, doc, collection } = await import('firebase/firestore')
      
      // Firestore limita batch a 500 operações, então dividimos em chunks
      const BATCH_SIZE = 500
      const chunks = []
      
      for (let i = 0; i < importedClients.length; i += BATCH_SIZE) {
        chunks.push(importedClients.slice(i, i + BATCH_SIZE))
      }

      let successCount = 0
      let errorCount = 0

      // Processar cada chunk
      for (const chunk of chunks) {
        const batch = writeBatch(firestore)
        
        for (const clientData of chunk) {
          try {
            // 🔧 FIX: Usar generateUUID() para garantir IDs únicos mesmo em loops rápidos
            const id = `client-${Date.now()}-${generateUUID().slice(0, 8)}`
            // 🔧 FIX: Usar o path correto 'negocios' (não 'usuarios')
            const clientRef = doc(collection(firestore, `negocios/${finalUserId}/clientes`), id)
            
            batch.set(clientRef, {
              name: clientData.name,
              phone: clientData.phone,
              birthDate: null,
              birthMonth: null,
              birthDay: null,
              status: 'Ativo',
              avatarUrl: null,
              observacoes: null,
              instanciaWhatsapp: businessSettings.id,
              planoSaude: null,
              id: id,
            })
            
            successCount++
          } catch (error) {
            errorCount++
            handleError(error, { context: 'Prepare import client' })
          }
        }
        
        // Executar o batch de uma vez
        await batch.commit()
      }

      toast({
        title: 'Importação Concluída! 🎉',
        description: `${successCount} cliente(s) importado(s) com sucesso${errorCount > 0 ? `. ${errorCount} erro(s).` : '.'}`,
      })
    } catch (error) {
      handleError(error, { context: 'Import clients batch' })
      toast({
        variant: 'destructive',
        title: 'Erro na Importação',
        description: 'Ocorreu um erro ao importar os clientes. Tente novamente.',
      })
    }
  }

  const dynamicColumns = useMemo(
    () => getColumns({ onEdit: handleEdit, onDelete: handleDeleteRequest }),
    [handleEdit, handleDeleteRequest]
  );
  
  const filteredClients = useMemo(() => 
    clients.filter(client => {
      const clientName = String(client.name || '').toLowerCase();
      const clientPhone = String(client.phone || '');
      const searchTerm = debouncedFilter.toLowerCase();
      return clientName.includes(searchTerm) || clientPhone.includes(searchTerm);
    }), 
    [clients, debouncedFilter] // ⚡ Usa debounced filter
  );

  // Paginação para mobile
  const totalMobilePages = Math.ceil(filteredClients.length / MOBILE_ITEMS_PER_PAGE)
  const paginatedMobileClients = useMemo(() => {
    const startIndex = (mobileCurrentPage - 1) * MOBILE_ITEMS_PER_PAGE
    const endIndex = startIndex + MOBILE_ITEMS_PER_PAGE
    return filteredClients.slice(startIndex, endIndex)
  }, [filteredClients, mobileCurrentPage])

  // Reset página ao filtrar
  useEffect(() => {
    setMobileCurrentPage(1)
  }, [debouncedFilter])

  // Scroll to top quando mudar de página
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [mobileCurrentPage])

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
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua base de clientes.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => setIsImportDialogOpen(true)} 
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Upload className="mr-2 h-4 w-4" />
            Importar Clientes
          </Button>
          <Button onClick={handleCreateNew} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <ClientStatsCards clients={clients} />
      
      <Card>
        <CardHeader>
          <CardTitle>Todos os Clientes</CardTitle>
        </CardHeader>
        <CardContent>
            <Input
              placeholder="Filtrar por nome ou telefone..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="mb-4"
            />
            <div className="block md:hidden">
              <div className="space-y-4">
                {paginatedMobileClients.length > 0 ? (
                    paginatedMobileClients.map(client => (
                        <ClientCard
                            key={client.id}
                            client={client}
                            onEdit={handleEdit}
                            onDelete={handleDeleteRequest}
                        />
                    ))
                ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado.</p>
                )}
              </div>
              
              {/* Paginação Mobile */}
              {totalMobilePages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {mobileCurrentPage} de {totalMobilePages}
                    <span className="block sm:inline sm:ml-2">
                      ({filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMobileCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={mobileCurrentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMobileCurrentPage(prev => Math.min(totalMobilePages, prev + 1))}
                      disabled={mobileCurrentPage === totalMobilePages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className='hidden md:block'>
                <DataTable 
                columns={dynamicColumns} 
                data={filteredClients}
                />
            </div>
        </CardContent>
      </Card>

      <Dialog open={isFormModalOpen} onOpenChange={(open) => {
        if (!open) {
          setSelectedClient(null);
        }
        setIsFormModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            <DialogDescription>
              {selectedClient ? 'Altere os dados do cliente.' : 'Preencha os dados do novo cliente.'}
            </DialogDescription>
          </DialogHeader>
           <div className="flex-1 overflow-y-auto px-1 -mx-1 md:px-6 md:-mx-6">
                <ClientForm 
                    key={selectedClient?.id || 'new-client-form'}
                    client={selectedClient}
                    onSubmit={handleFormSubmit} 
                    isSubmitting={isSubmitting}
                    businessSettings={businessSettings || undefined}
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
                  Essa ação não pode ser desfeita. Isso excluirá permanentemente o cliente:
                </p>
                <div className="min-w-0 w-full">
                  <p className="font-bold break-all text-sm sm:text-base" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {clientToDelete?.name}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <Button 
              onClick={handleDeleteConfirm} 
              className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportClientsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImport={handleImportClients}
        existingPhones={clients.map(c => c.phone)}
      />
    </div>
  )
}
