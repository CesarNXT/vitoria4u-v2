'use client'

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import type { Plano } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { getAdminPlansColumns } from './admin-plans-columns';
import { AdminPlanForm } from './admin-plan-form';

export default function AdminPlanosPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plano[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plano | null>(null);

  useEffect(() => {
    if (!firestore) return;

    const plansRef = collection(firestore, 'planos');
    const unsubscribe = onSnapshot(plansRef, (snapshot) => {
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }) as Plano).sort((a, b) => a.price - b.price);
      setPlans(plansData);
      setIsLoading(false);
    }, (error) => {
      toast({ variant: "destructive", title: "Erro ao buscar planos" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleEditPlan = (plan: Plano) => {
    setEditingPlan(plan);
  };

  const handleCancelEdit = () => {
    setEditingPlan(null);
  };

  const handleSavePlan = async (updatedPlanData: Partial<Plano>) => {
    if (!editingPlan) return;

    const planRef = doc(firestore, 'planos', editingPlan.id);
    try {
      await updateDoc(planRef, updatedPlanData);
      toast({
        title: 'Plano Atualizado!',
        description: `O plano ${updatedPlanData.name || editingPlan.name} foi salvo com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao Salvar',
        description: 'Não foi possível atualizar o plano. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setEditingPlan(null);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gerenciamento de Planos</h1>
        <p className="text-sm md:text-base text-muted-foreground">Edite os preços e funcionalidades dos planos de assinatura.</p>
      </div>

      {editingPlan ? (
        <AdminPlanForm 
          plan={editingPlan} 
          onSave={handleSavePlan} 
          onCancel={handleCancelEdit} 
        />
      ) : (
        <>
          {/* Versão Desktop - Tabela */}
          <div className="hidden md:block">
            <DataTable
              columns={getAdminPlansColumns({ onEdit: handleEditPlan })}
              data={plans}
              filterColumn={{
                id: "name",
                placeholder: "Filtrar por nome...",
              }}
            />
          </div>

          {/* Versão Mobile - Cards */}
          <div className="md:hidden space-y-4">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-card border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => handleEditPlan(plan)}
                    className="ml-2 p-2 hover:bg-muted rounded-md transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      <path d="m15 5 4 4"/>
                    </svg>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-2xl font-bold text-primary">
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    por mês
                  </span>
                </div>

                {plan.features && plan.features.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {plan.features.length} funcionalidades incluídas
                    </p>
                  </div>
                )}

                {plan.status && (
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      plan.status === 'Ativo' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
