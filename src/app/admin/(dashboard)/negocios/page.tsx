'use client'

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import type { ConfiguracoesNegocio, Plano } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { getBusinessesColumns } from './businesses-columns';
import { BusinessEditDialog } from './business-edit-dialog';
import { useRouter } from 'next/navigation';
import { formatPhoneNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminNegociosPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<ConfiguracoesNegocio[]>([]);
  const [plans, setPlans] = useState<Plano[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBusiness, setEditingBusiness] = useState<ConfiguracoesNegocio | null>(null);

  useEffect(() => {
    if (!firestore) return;

    // Buscar negócios
    const businessesRef = collection(firestore, 'negocios');
    const unsubBusinesses = onSnapshot(businessesRef, (snapshot) => {
      const businessesData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Converte access_expires_at com validação
        let expiresAt = null;
        if (data.access_expires_at) {
          const date = data.access_expires_at.toDate 
            ? data.access_expires_at.toDate() 
            : new Date(data.access_expires_at);
          expiresAt = !isNaN(date.getTime()) ? date : null;
        }
        
        // Converte createdAt com validação
        let createdDate = new Date();
        if (data.createdAt) {
          const date = data.createdAt.toDate 
            ? data.createdAt.toDate() 
            : new Date(data.createdAt);
          createdDate = !isNaN(date.getTime()) ? date : new Date();
        }
        
        return {
          id: doc.id,
          ...data,
          access_expires_at: expiresAt,
          createdAt: createdDate,
        } as ConfiguracoesNegocio;
      }).sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // Mais recentes primeiro
      });
      setBusinesses(businessesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao buscar negócios:", error);
      toast({ variant: "destructive", title: "Erro ao buscar negócios" });
      setIsLoading(false);
    });

    // Buscar planos
    const plansRef = collection(firestore, 'planos');
    const unsubPlans = onSnapshot(plansRef, (snapshot) => {
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Plano)).sort((a, b) => a.price - b.price);
      setPlans(plansData);
    }, (error) => {
      console.error("Erro ao buscar planos:", error);
      toast({ variant: "destructive", title: "Erro ao buscar planos" });
    });

    return () => {
      unsubBusinesses();
      unsubPlans();
    };
  }, [firestore, toast]);

  const handleEdit = (business: ConfiguracoesNegocio) => {
    setEditingBusiness(business);
  };

  const handleAccessPanel = (business: ConfiguracoesNegocio) => {
    localStorage.setItem('impersonatedBusinessId', business.id);
    router.push('/dashboard');
  };

  const handleSave = async (businessId: string, updates: { planId?: string; access_expires_at?: Date }) => {
    if (!firestore) return;

    try {
      const businessRef = doc(firestore, 'negocios', businessId);
      const updateData: any = {};

      if (updates.planId) {
        updateData.planId = updates.planId;
      }

      if (updates.access_expires_at) {
        updateData.access_expires_at = Timestamp.fromDate(updates.access_expires_at);
      }

      await updateDoc(businessRef, updateData);

      toast({
        title: 'Negócio Atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      });
      setEditingBusiness(null);
    } catch (error) {
      console.error('Erro ao atualizar negócio:', error);
      toast({
        title: 'Erro ao Salvar',
        description: 'Não foi possível atualizar o negócio. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gerenciamento de Negócios</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Gerencie assinaturas, planos e acesse painéis dos negócios cadastrados.
        </p>
      </div>

      {/* Versão Desktop - Tabela */}
      <div className="hidden md:block">
        <DataTable
          columns={getBusinessesColumns({ onEdit: handleEdit, onAccessPanel: handleAccessPanel })}
          data={businesses}
          filterColumn={{
            id: "nome",
            placeholder: "Buscar por nome ou email...",
          }}
        />
      </div>

      {/* Versão Mobile - Cards */}
      <div className="md:hidden space-y-4">
        {businesses.map((business) => {
          const isExpired = !business.access_expires_at || new Date(business.access_expires_at) < new Date();
          
          let expiresAt = null;
          if (business.access_expires_at) {
            const date = business.access_expires_at.toDate 
              ? business.access_expires_at.toDate() 
              : new Date(business.access_expires_at);
            // Só atribui se a data for válida
            expiresAt = !isNaN(date.getTime()) ? date : null;
          }

          return (
            <div key={business.id} className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-base">{business.nome || 'Sem nome'}</h3>
                  <p className="text-sm text-muted-foreground">{business.email}</p>
                  {business.telefone && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPhoneNumber(business.telefone?.toString())}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Plano</p>
                  <p className="text-sm font-medium capitalize">
                    {business.planId?.replace('plano_', '').replace(/_/g, ' ') || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isExpired 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {isExpired ? 'Expirado' : 'Ativo'}
                  </span>
                </div>
              </div>

              {expiresAt && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Expira em</p>
                  <p className={`text-sm font-medium ${isExpired ? 'text-destructive' : ''}`}>
                    {format(expiresAt, "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={() => handleAccessPanel(business)}
                  className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Acessar Painel
                </button>
                <button
                  onClick={() => handleEdit(business)}
                  className="px-3 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
                >
                  Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingBusiness && (
        <BusinessEditDialog
          business={editingBusiness}
          plans={plans}
          onSave={handleSave}
          onCancel={() => setEditingBusiness(null)}
        />
      )}
    </div>
  );
}
