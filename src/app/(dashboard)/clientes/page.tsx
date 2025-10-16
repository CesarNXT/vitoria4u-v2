'use client'

import { useState, useEffect, useMemo } from 'react'
import { getClientsOnSnapshot, saveOrUpdateDocument, deleteDocument, getBusinessConfig } from '@/lib/firestore'
import { useFirebase } from '@/firebase'
import { useBusinessUser } from '@/contexts/BusinessUserContext'
import type { Cliente, ConfiguracoesNegocio } from '@/lib/types'
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
import { ClientStatsCards } from './client-stats-cards'
import { Input } from '@/components/ui/input'
import { ClientCard } from './client-card'

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
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null)
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null)
  const [filter, setFilter] = useState('')
  
  const finalUserId = businessUserId || user?.uid;

  useEffect(() => {
    if (!finalUserId || !firestore) return
    
    const unsubscribe = getClientsOnSnapshot(finalUserId, (data) => {
      const clientsWithDates = data.map(client => ({
        ...client,
        birthDate: client.birthDate?.toDate ? client.birthDate.toDate() : (client.birthDate ? new Date(client.birthDate) : undefined),
      }));
      setClients(clientsWithDates)
      setIsLoading(false)
    })
    
     getBusinessConfig(finalUserId).then(settings => {
      setBusinessSettings(settings);
    });

    return () => unsubscribe()
  }, [finalUserId, firestore])

  const handleCreateNew = () => {
    setSelectedClient(null)
    setIsFormModalOpen(true)
  }

  const handleEdit = (client: Cliente) => {
    setSelectedClient(client);
    setIsFormModalOpen(true)
  }

  const handleDeleteRequest = (client: Cliente) => {
    setClientToDelete(client)
    setIsAlertDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (clientToDelete && finalUserId) {
      await deleteDocument('clientes', clientToDelete.id, finalUserId)
      toast({
        title: "Cliente Excluído",
        description: `O cliente "${clientToDelete.name}" foi excluído com sucesso.`,
      })
      setClientToDelete(null)
    }
    setIsAlertDialogOpen(false)
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

      const id = selectedClient ? selectedClient.id : `client-${Date.now()}`;

      const clientData: any = {
        name: data.name,
        phone: numericPhone,
        birthDate: data.birthDate ? data.birthDate.toISOString() : null, // String ISO
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
      console.error("Error saving client:", error)
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: "Ocorreu um erro ao salvar o cliente. Tente novamente.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const dynamicColumns = getColumns({ onEdit: handleEdit, onDelete: handleDeleteRequest })
  
    const filteredClients = useMemo(() => 
        clients.filter(client => {
            const clientName = String(client.name || '').toLowerCase();
            const clientPhone = String(client.phone || '');
            const searchTerm = filter.toLowerCase();
            return clientName.includes(searchTerm) || clientPhone.includes(searchTerm);
        }), [clients, filter]
    );

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
        <Button onClick={handleCreateNew} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <ClientStatsCards clients={clients} />
      
      <Card>
        <CardHeader>
          <CardTitle>Todos os Clientes</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="block md:hidden">
              <Input
                placeholder="Filtrar por nome ou telefone..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="mb-4"
              />
              <div className="space-y-4">
                {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
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
            </div>
            <div className='hidden md:block'>
                <DataTable 
                columns={dynamicColumns} 
                data={clients}
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
          setSelectedClient(null);
        }
        setIsFormModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o cliente
              <span className="font-bold"> {clientToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
