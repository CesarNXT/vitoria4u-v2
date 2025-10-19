'use client'

import { useState, useEffect, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { startImpersonation } from '@/app/(public)/login/session-actions';

export default function AdminNegociosPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<ConfiguracoesNegocio[]>([]);
  const [plans, setPlans] = useState<Plano[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBusiness, setEditingBusiness] = useState<ConfiguracoesNegocio | null>(null);
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  const handleAccessPanel = async (business: ConfiguracoesNegocio) => {
    // ✅ SEGURANÇA: Usar cookie HTTP-only em vez de localStorage
    await startImpersonation(business.id);
    window.location.href = '/dashboard';
  };

  const handleDelete = async (business: ConfiguracoesNegocio) => {
    const confirmMessage = `⚠️ ATENÇÃO! Esta ação é IRREVERSÍVEL!

Você está prestes a EXCLUIR COMPLETAMENTE:
• Negócio: ${business.nome}
• Email: ${business.email}
• Todos os agendamentos, clientes, serviços
• Conta de autenticação

Digite "DELETAR" para confirmar:`;
    
    const confirmation = prompt(confirmMessage);
    
    if (confirmation !== 'DELETAR') {
      toast({
        title: 'Exclusão Cancelada',
        description: 'O negócio não foi excluído.',
      });
      return;
    }

    if (!user) return;

    try {
      const response = await fetch('/api/admin/delete-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          adminUid: user.uid
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar negócio');
      }

      toast({
        title: '✅ Negócio Excluído',
        description: `${business.nome} foi completamente removido do sistema.`,
      });

      // A lista será recarregada automaticamente via onSnapshot
    } catch (error) {
      toast({
        title: '❌ Erro ao Excluir',
        description: 'Não foi possível excluir o negócio.',
        variant: 'destructive',
      });
    }
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
      toast({
        title: 'Erro ao Salvar',
        description: 'Não foi possível atualizar o negócio. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Filtrar negócios
  const filteredBusinesses = useMemo(() => {
    return businesses.filter(business => {
      // Filtro de plano
      if (filterPlan !== 'all' && business.planId !== filterPlan) {
        return false;
      }

      // Filtro de status
      const isActive = business.access_expires_at && new Date(business.access_expires_at) > new Date();
      if (filterStatus === 'active' && !isActive) return false;
      if (filterStatus === 'expired' && isActive) return false;

      // Busca por nome, email ou telefone
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = business.nome?.toLowerCase().includes(query);
        const matchesEmail = business.email?.toLowerCase().includes(query);
        const matchesPhone = business.telefone?.toString().includes(query.replace(/\D/g, ''));
        
        if (!matchesName && !matchesEmail && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }, [businesses, filterPlan, filterStatus, searchQuery]);

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

      {/* Filtros */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="search">Buscar</Label>
          <Input
            id="search"
            placeholder="Nome, email ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-plan">Filtrar por Plano</Label>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger id="filter-plan">
              <SelectValue placeholder="Todos os planos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-status">Filtrar por Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger id="filter-status">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Total Filtrado</Label>
          <div className="h-10 px-3 flex items-center border rounded-md bg-muted">
            <span className="text-sm font-medium">{filteredBusinesses.length} negócio(s)</span>
          </div>
        </div>
      </div>

      {/* Versão Desktop - Tabela */}
      <div className="hidden md:block">
        <DataTable
          columns={getBusinessesColumns({ onEdit: handleEdit, onAccessPanel: handleAccessPanel, onDelete: handleDelete })}
          data={filteredBusinesses}
          filterColumn={{
            id: "nome",
            placeholder: "Buscar por nome ou email...",
          }}
        />
      </div>

      {/* Versão Mobile - Cards */}
      <div className="md:hidden space-y-4">
        {filteredBusinesses.map((business) => {
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
