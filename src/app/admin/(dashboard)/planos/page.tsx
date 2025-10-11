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
      console.error("Error fetching plans:", error);
      toast({ variant: "destructive", title: "Erro ao buscar planos" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
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
      console.error('Error updating plan:', error);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Planos</h1>
          <p className="text-muted-foreground">Edite os preços e funcionalidades dos planos de assinatura.</p>
        </div>
      </div>

      {editingPlan ? (
        <AdminPlanForm 
          plan={editingPlan} 
          onSave={handleSavePlan} 
          onCancel={handleCancelEdit} 
        />
      ) : (
        <DataTable
          columns={getAdminPlansColumns({ onEdit: handleEditPlan })}
          data={plans}
          filterColumn={{
            id: "name",
            placeholder: "Filtrar por nome...",
          }}
        />
      )}
    </div>
  );
}
