
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFirebase } from '@/firebase'
import type { ConfiguracoesNegocio, Plano } from '@/lib/types'
import { Loader2 } from 'lucide-react'
import { getAdminBusinessesColumns } from '../admin-businesses-columns' 
import { DataTable } from '@/components/data-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BusinessForm } from '../business-form';
import { DeleteConfirmationDialog } from '../delete-confirmation-dialog';
import { useToast } from "@/hooks/use-toast"
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore'

// Página para o Super Admin gerenciar os donos de negócio
export default function AdminBusinessesPage() {
  const { toast } = useToast()
  const { firestore } = useFirebase()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<ConfiguracoesNegocio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<ConfiguracoesNegocio | null>(null);
  const [businessToDelete, setBusinessToDelete] = useState<ConfiguracoesNegocio | null>(null);

  useEffect(() => {
    if (!firestore) return
    
    const businessesRef = collection(firestore, 'negocios')
    const unsubscribe = onSnapshot(businessesRef, (snapshot) => {
      const businessesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        access_expires_at: doc.data().access_expires_at?.toDate ? doc.data().access_expires_at.toDate() : new Date(doc.data().access_expires_at),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
      } as ConfiguracoesNegocio));
      setBusinesses(businessesData)
      setIsLoading(false)
    }, (error) => {
      console.error("Error fetching businesses:", error);
      toast({ variant: "destructive", title: "Erro ao buscar negócios" });
      setIsLoading(false);
    });

    return () => unsubscribe()
  }, [firestore, toast])

  const handleEdit = (business: ConfiguracoesNegocio) => {
    setSelectedBusiness(business);
    setIsFormModalOpen(true);
  };
  
  const handleAccessPanel = (business: ConfiguracoesNegocio) => {
    router.push(`/dashboard?impersonate=${business.id}`);
  };

  const handleDelete = (business: ConfiguracoesNegocio) => {
    setBusinessToDelete(business);
  };

  const handleFormSubmit = async (data: Partial<ConfiguracoesNegocio>) => {
    if (!selectedBusiness || !firestore) return
    setIsSubmitting(true)
    try {
      // Se o planId foi alterado, buscar as features do plano
      let updatedData = { ...data };
      
      if (data.planId) {
        try {
          // Buscar o plano pelo ID no Firestore
          const plansSnapshot = await getDocs(collection(firestore, 'planos'));
          const selectedPlan = plansSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as any))
            .find(plan => plan.id === data.planId);
          
          if (selectedPlan && selectedPlan.features) {
            // Atualizar os campos de habilitação baseado nas features do plano
            updatedData = {
              ...updatedData,
              habilitarLembrete24h: selectedPlan.features.includes('lembrete_24h'),
              habilitarLembrete2h: selectedPlan.features.includes('lembrete_2h'),
              habilitarFeedback: selectedPlan.features.includes('feedback_pos_atendimento'),
            };
            
            console.log(`Plano "${data.planId}" selecionado com features:`, selectedPlan.features);
          }
        } catch (error) {
          console.error('Error fetching plan features:', error);
        }
      }
      
      const businessRef = doc(firestore, 'negocios', selectedBusiness.id);
      await setDoc(businessRef, updatedData, { merge: true });

      toast({
        title: "Negócio Atualizado",
        description: `O negócio "${selectedBusiness.nome}" foi atualizado com sucesso.`,
      })
      setIsFormModalOpen(false)
    } catch (error) {
      console.error("Error saving business:", error)
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: "Ocorreu um erro ao salvar as alterações. Tente novamente.",
      })
    } finally {
      setIsSubmitting(false)
    }
  };

  const handleConfirmDelete = async () => {
    if (!businessToDelete || !firestore) return;

    try {
      const businessRef = doc(firestore, 'negocios', businessToDelete.id);
      await deleteDoc(businessRef);
      toast({
        title: 'Negócio Excluído',
        description: `O negócio "${businessToDelete.nome}" foi excluído permanentemente.`,
      });
    } catch (error) {
      console.error('Error deleting business:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Excluir',
        description: 'Não foi possível excluir o negócio. Tente novamente.',
      });
    } finally {
      setBusinessToDelete(null);
    }
  };

  const dynamicColumns = getAdminBusinessesColumns({ onEdit: handleEdit, onAccessPanel: handleAccessPanel, onDelete: handleDelete })
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Negócios</h1>
          <p className="text-muted-foreground">Gerencie todos os negócios cadastrados na plataforma.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Todos os Negócios</CardTitle>
            <CardDescription>Clique nas ações para editar uma assinatura ou acessar o painel do cliente.</CardDescription>
        </CardHeader>
        <CardContent>
            <DataTable 
                columns={dynamicColumns} 
                data={businesses}
                filterColumn={{
                    id: "nome",
                    placeholder: "Filtrar por nome..."
                }}
            />
        </CardContent>
      </Card>


      <Dialog open={isFormModalOpen} onOpenChange={(open) => {
        if (!open) {
          setSelectedBusiness(null);
        }
        setIsFormModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Assinatura</DialogTitle>
            <DialogDescription>
              Altere o plano e a data de expiração do negócio.
            </DialogDescription>
          </DialogHeader>
           <div className="flex-1 overflow-y-auto px-1 -mx-1 md:px-6 md:-mx-6">
                <BusinessForm 
                    key={selectedBusiness ? `edit-${selectedBusiness.id}` : 'new-business-form'}
                    business={selectedBusiness}
                    onSubmit={handleFormSubmit} 
                    isSubmitting={isSubmitting} 
                />
           </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        isOpen={!!businessToDelete}
        onClose={() => setBusinessToDelete(null)}
        onConfirm={handleConfirmDelete}
        itemName={businessToDelete?.nome || ''}
      />
    </div>
  )
}
