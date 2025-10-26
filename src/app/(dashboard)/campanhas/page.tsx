"use client"

import { useState, useEffect, useRef } from 'react';
import { usePlan } from '@/contexts/PlanContext';
import { useBusinessUser } from '@/contexts/BusinessUserContext';
import { FeatureLocked } from '@/components/feature-locked';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { CampaignForm } from './campaign-form';
import { uazapiColumns } from './uazapi-columns';
import { 
  getClientesAction, 
  getCampanhasAction, 
  createCampanhaAction,
  pauseCampanhaAction,
  continueCampanhaAction,
  deleteCampanhaAction,
  deleteMultipleCampanhasAction,
  getCampanhaDetailsAction
} from './uazapi-sender-actions';
import { syncCampaignStatus } from './sync-campaign-status';
import { Cliente, Campanha, CampanhaContato } from '@/lib/types';
import { Loader2, Plus, AlertCircle, BarChart3, Send, Play, Pause, Trash2, Eye, Calendar, Clock, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

// Helper: Converter qualquer formato de data em Date válido
function toDate(value: any): Date {
  if (!value) return new Date();
  
  // Se já é Date
  if (value instanceof Date) return value;
  
  // Se é string ISO
  if (typeof value === 'string') return new Date(value);
  
  // Se é Timestamp serializado do Firestore
  if (value._seconds !== undefined) {
    return new Date(value._seconds * 1000);
  }
  
  // Se é objeto com toDate (Timestamp)
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  
  // Fallback
  return new Date(value);
}

// Helper para normalizar status de campanha
function getStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    'scheduled': 'Agendada',
    'agendada': 'Agendada',
    'Agendada': 'Agendada',
    'sending': 'Enviando',
    'enviando': 'Enviando',
    'Em Andamento': 'Enviando',
    'paused': 'Pausada',
    'pausada': 'Pausada',
    'done': 'Concluída',
    'concluida': 'Concluída',
    'Concluída': 'Concluída',
    'deleting': 'Deletando',
    'failed': 'Erro',
    'Erro': 'Erro',
  };
  return statusMap[status] || status;
}

// Helper para verificar se pode pausar
function canPause(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'scheduled' || s === 'agendada' || s === 'sending' || s === 'enviando' || s === 'em andamento';
}

// Helper para verificar se pode continuar
function canContinue(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'paused' || s === 'pausada';
}

// Helper para verificar se pode deletar
function canDelete(status: string): boolean {
  const s = status.toLowerCase();
  return s !== 'done' && s !== 'concluida' && s !== 'concluída' && s !== 'deleting';
}

export default function CampanhasPage() {
  const { canUseFeature, isLoading: planLoading } = usePlan();
  const { businessUserId } = useBusinessUser();
  const isMobile = useIsMobile();

  // Estados - Campanhas Firestore
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCampanha, setSelectedCampanha] = useState<Campanha | null>(null);
  
  // ✅ Seleção múltipla
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

  // Quota disponível
  const [quotaInfo, setQuotaInfo] = useState<{ total: number; used: number; available: number } | null>(null);
  
  // ✅ Ref para armazenar interval de polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar feature
  const featureCheck = canUseFeature('disparo_de_mensagens');

  // Carregar dados iniciais
  useEffect(() => {
    if (!planLoading && featureCheck.allowed) {
      loadData();
      loadQuota();
    }
  }, [planLoading, featureCheck.allowed]);

  // 🔄 Auto-refresh: Atualizar campanhas em tempo real (a cada 30s)
  useEffect(() => {
    // Verificar se há campanhas "sending"
    const hasSendingCampaigns = campanhas.some(c => c.status === 'sending');
    
    if (!hasSendingCampaigns || !featureCheck.allowed) {
      return; // Não atualizar se não há campanhas enviando
    }

    const interval = setInterval(async () => {
      try {
        const result = await getCampanhasAction();
        if (result.success && result.campanhas) {
          setCampanhas(result.campanhas);
          console.log('📊 Campanhas atualizadas automaticamente');
        }
      } catch (error) {
        console.error('Erro ao atualizar campanhas:', error);
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [campanhas, featureCheck.allowed]);

  // 🔄 Auto-refresh: Atualizar modal de detalhes em tempo real (a cada 10s)
  useEffect(() => {
    if (!showDetailsDialog || !selectedCampanha || selectedCampanha.status !== 'sending') {
      return; // Não atualizar se modal fechado ou campanha não está enviando
    }

    const interval = setInterval(async () => {
      try {
        const result = await getCampanhasAction();
        if (result.success && result.campanhas) {
          const campanhaAtualizada = result.campanhas.find((c: any) => c.id === selectedCampanha.id);
          if (campanhaAtualizada) {
            setSelectedCampanha(campanhaAtualizada);
            console.log('🔄 Detalhes da campanha atualizados');
          }
        }
      } catch (error) {
        console.error('Erro ao atualizar detalhes:', error);
      }
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [showDetailsDialog, selectedCampanha]);

  // ✅ Cleanup: Limpar polling ao desmontar componente
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [clientesRes, campanhasRes] = await Promise.all([
        getClientesAction({ limit: 10000 }), // ✅ Limite de 10000 clientes para performance
        getCampanhasAction(),
      ]);

      if (clientesRes.success) {
        // Ordenar por nome no frontend
        const sortedClientes = [...clientesRes.clientes].sort((a, b) => 
          (a.name || '').localeCompare(b.name || '', 'pt-BR')
        );
        
        setClientes(sortedClientes);
        
        // ⚠️ Avisar se atingiu o limite
        if (sortedClientes.length >= 10000) {
          toast({
            title: "⚠️ Muitos clientes",
            description: "Mostrando os primeiros 10000 clientes. Use filtros para selecionar clientes específicos.",
            duration: 8000,
          });
        }
      }

      if (campanhasRes.success) {
        setCampanhas(campanhasRes.campanhas);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: "Tente recarregar a página",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadQuota = async () => {
    try {
      const { getQuotaAction } = await import('./uazapi-sender-actions');
      const result = await getQuotaAction();
      if (result.success) {
        setQuotaInfo(result.quota);
      }
    } catch (error) {
      console.error('Erro ao carregar quota:', error);
    }
  };


  // Criar campanha
  const handleCreateCampanha = async (data: any) => {
    setIsSubmitting(true);
    try {
      const result = await createCampanhaAction(data);

      if (result.success) {
        toast({
          title: "Campanha criada!",
          description: ('message' in result ? result.message : undefined) || 'Campanha criada com sucesso',
        });
        setShowNewCampaignDialog(false);
        
        // ✅ Se for background, iniciar polling para atualizar lista
        if ('background' in result && result.background) {
          // Carregar imediatamente
          await loadData();
          
          // Limpar polling anterior se existir
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          
          // ✅ Iniciar polling a cada 5 segundos por até 2 minutos
          let pollCount = 0;
          const maxPolls = 24; // 24 x 5s = 2 minutos
          
          pollingIntervalRef.current = setInterval(async () => {
            pollCount++;
            
            try {
              await loadData();
              console.log(`🔄 Atualizando lista de campanhas (${pollCount}/${maxPolls})...`);
            } catch (error) {
              console.error('Erro ao atualizar campanhas:', error);
            }
            
            // Parar após 2 minutos ou se atingir o máximo
            if (pollCount >= maxPolls) {
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              console.log('✅ Polling de campanhas finalizado');
            }
          }, 5000); // 5 segundos
        } else {
          // Campanha única, carregar normalmente
          await loadData();
        }
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao criar campanha",
          description: ('error' in result ? result.error : undefined) || 'Erro desconhecido',
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar campanha",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ver detalhes da campanha (busca dados atualizados)
  const handleViewDetails = async (campanha: Campanha) => {
    try {
      // Buscar dados atualizados do Firestore
      const result = await getCampanhasAction();
      
      if (result.success && result.campanhas) {
        const campanhaAtualizada = result.campanhas.find((c: any) => c.id === campanha.id);
        setSelectedCampanha(campanhaAtualizada || campanha);
      } else {
        setSelectedCampanha(campanha);
      }
      
      setShowDetailsDialog(true);
    } catch (error) {
      console.error('Erro ao buscar detalhes atualizados:', error);
      // Em caso de erro, usar dados originais
      setSelectedCampanha(campanha);
      setShowDetailsDialog(true);
    }
  };

  // Pausar campanha
  const handlePauseCampanha = async (campanha: any) => {
    if (!confirm(`Deseja pausar a campanha "${campanha.nome}"?`)) {
      return;
    }

    try {
      const result = await pauseCampanhaAction(campanha.id);

      if (result.success) {
        toast({
          title: "Campanha pausada",
          description: result.message,
        });
        await loadData();
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao pausar",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao pausar",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  // Continuar campanha
  const handleContinueCampanha = async (campanha: any) => {
    if (!confirm(`Deseja continuar a campanha "${campanha.nome}"?`)) {
      return;
    }

    try {
      const result = await continueCampanhaAction(campanha.id);

      if (result.success) {
        toast({
          title: "Campanha retomada",
          description: result.message,
        });
        await loadData();
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao retomar",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao retomar",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  // Deletar campanha
  const handleDeleteCampanha = async (campanha: any) => {
    const message = campanha.status === 'sending' 
      ? `A campanha "${campanha.nome}" está ENVIANDO. Deletar irá CANCELAR todos os envios pendentes. Deseja continuar?`
      : `Deseja realmente deletar a campanha "${campanha.nome}"? Esta ação não pode ser desfeita.`;

    if (!confirm(message)) {
      return;
    }

    try {
      const result = await deleteCampanhaAction(campanha.id);

      if (result.success) {
        toast({
          title: "Campanha deletada",
          description: result.message,
        });
        
        // Remover da lista de selecionados se estava selecionada
        setSelectedCampaignIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(campanha.id);
          return newSet;
        });
        
        await loadData();
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao deletar",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao deletar",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  // ✅ Toggle seleção de campanha
  const handleToggleSelection = (campaignId: string) => {
    setSelectedCampaignIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  // ✅ Selecionar/Desselecionar todas
  const handleToggleSelectAll = () => {
    if (selectedCampaignIds.size === campanhas.length) {
      setSelectedCampaignIds(new Set());
    } else {
      setSelectedCampaignIds(new Set(campanhas.map(c => c.id)));
    }
  };

  // ✅ Deletar múltiplas campanhas
  const handleDeleteMultiple = async () => {
    if (selectedCampaignIds.size === 0) {
      toast({
        title: "Nenhuma campanha selecionada",
        description: "Selecione ao menos uma campanha para deletar.",
        variant: "destructive",
      });
      return;
    }

    const message = `Deseja realmente deletar ${selectedCampaignIds.size} campanha(s)? Esta ação não pode ser desfeita.`;
    
    if (!confirm(message)) {
      return;
    }

    setIsDeletingMultiple(true);

    try {
      const result = await deleteMultipleCampanhasAction(Array.from(selectedCampaignIds));

      if (result.success) {
        toast({
          title: "Campanhas deletadas",
          description: result.message,
        });
        setSelectedCampaignIds(new Set());
        await loadData();
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao deletar",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao deletar",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsDeletingMultiple(false);
    }
  };

  // Loading do plano
  if (planLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Bloqueado por plano
  if (!featureCheck.allowed) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
        <FeatureLocked 
          reason={featureCheck.reason || 'Funcionalidade não disponível no seu plano'}
          variant="card"
        />
      </div>
    );
  }

  // Loading dos dados
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">Gerencie suas campanhas de envio em massa via WhatsApp.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            onClick={loadData} 
            variant="outline"
            disabled={isLoadingData}
            size="icon"
            title="Atualizar lista"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowNewCampaignDialog(true)} className="flex-1 sm:flex-initial">
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* Avisos e Quota */}
      <div className="space-y-4">
        {quotaInfo && (
          <Alert variant={quotaInfo.available < 50 ? "destructive" : "default"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Quota de hoje:</strong> {quotaInfo.available} de {quotaInfo.total} envios disponíveis
              {quotaInfo.used > 0 && ` (${quotaInfo.used} já usados)`}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 gap-4 w-full">
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500 w-full">
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">Total de Campanhas</CardDescription>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">{campanhas.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500 w-full">
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">Agendadas</CardDescription>
              <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">
              {campanhas.filter((c: any) => c.status === 'scheduled').length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500 w-full">
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">Enviando</CardDescription>
              <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">
              {campanhas.filter((c: any) => c.status === 'sending').length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500 w-full">
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">Concluídas</CardDescription>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">
              {campanhas.filter((c: any) => c.status === 'done').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabela de campanhas */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Todas as Campanhas</CardTitle>
              <CardDescription>
                Gerencie suas campanhas de envio em massa
              </CardDescription>
              {selectedCampaignIds.size > 0 && (
                <p className="text-sm text-primary font-medium mt-2">
                  {selectedCampaignIds.size} campanha(s) selecionada(s)
                </p>
              )}
            </div>
            {selectedCampaignIds.size > 0 && (
              <Button 
                onClick={handleDeleteMultiple} 
                variant="destructive"
                disabled={isDeletingMultiple}
                size="sm"
              >
                {isDeletingMultiple ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deletando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar ({selectedCampaignIds.size})
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {campanhas.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhuma campanha criada ainda
              </p>
              <Button onClick={() => setShowNewCampaignDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Campanha
              </Button>
            </div>
          ) : isMobile ? (
            <div className="space-y-4">
              {campanhas.map((campanha) => (
                <Card key={campanha.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <CardTitle className="text-base truncate">{campanha.nome}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {format(toDate(campanha.dataAgendamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(campanha)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          {canPause(campanha.status) && (
                            <DropdownMenuItem onClick={() => handlePauseCampanha(campanha.id)}>
                              <Pause className="h-4 w-4 mr-2" />
                              Pausar
                            </DropdownMenuItem>
                          )}
                          {canContinue(campanha.status) && (
                            <DropdownMenuItem onClick={() => handleContinueCampanha(campanha.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Continuar
                            </DropdownMenuItem>
                          )}
                          {canDelete(campanha.status) && (
                            <DropdownMenuItem 
                              onClick={() => handleDeleteCampanha(campanha.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={
                        getStatusDisplay(campanha.status) === 'Concluída' ? 'default' :
                        getStatusDisplay(campanha.status) === 'Enviando' ? 'secondary' :
                        getStatusDisplay(campanha.status) === 'Pausada' ? 'outline' :
                        getStatusDisplay(campanha.status) === 'Deletando' ? 'destructive' :
                        'default'
                      }>
                        {getStatusDisplay(campanha.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tipo</span>
                      <span className="text-sm font-medium capitalize">{campanha.tipo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Início</span>
                      <span className="text-sm font-medium">
                        {campanha.createdAt ? format(toDate(campanha.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Término</span>
                      <span className="text-sm font-medium">
                        {campanha.dataConclusao ? format(toDate(campanha.dataConclusao), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-semibold">{campanha.totalContatos}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Enviados</p>
                        <p className="text-lg font-semibold text-green-600">{campanha.enviados || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Falhas</p>
                        <p className="text-lg font-semibold text-red-600">{campanha.falhas || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DataTable 
                columns={uazapiColumns} 
                data={campanhas}
                meta={{
                  onView: handleViewDetails,
                  onPause: handlePauseCampanha,
                  onContinue: handleContinueCampanha,
                  onDelete: handleDeleteCampanha,
                  selectedIds: selectedCampaignIds,
                  onToggleSelection: handleToggleSelection,
                  onToggleSelectAll: handleToggleSelectAll,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Nova Campanha */}
      <Dialog open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Campanha de WhatsApp</DialogTitle>
            <DialogDescription>
              Configure e agende uma campanha de envio em massa
            </DialogDescription>
          </DialogHeader>
          {clientes.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-3">
                <p>Nenhum cliente ativo encontrado. Cadastre clientes ou verifique se há clientes com status "Ativo".</p>
                <Button onClick={async () => {
                  setIsLoadingData(true);
                  await loadData();
                  setIsLoadingData(false);
                }} variant="outline" size="sm" disabled={isLoadingData}>
                  {isLoadingData ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recarregando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Recarregar Clientes
                    </>
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          ) : quotaInfo && quotaInfo.available < 50 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Atenção: Você tem apenas {quotaInfo.available} envios disponíveis hoje. Planeje sua campanha adequadamente.
              </AlertDescription>
            </Alert>
          ) : null}
          {clientes.length > 0 && (
            <CampaignForm
              clientes={clientes}
              onSubmit={handleCreateCampanha}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes da Campanha */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Campanha</DialogTitle>
            <DialogDescription>
              Informações completas e status dos envios
            </DialogDescription>
          </DialogHeader>

          {selectedCampanha && (
            <div className="space-y-6">
              {/* Informações básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedCampanha.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium capitalize">{selectedCampanha.tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Agendamento</p>
                  <p className="font-medium">
                    {format(toDate(selectedCampanha.dataAgendamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedCampanha.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Contatos</p>
                  <p className="font-medium">{selectedCampanha.totalContatos}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enviados</p>
                  <p className="font-medium">{selectedCampanha.contatosEnviados}</p>
                </div>
              </div>

              {/* Mensagem/Mídia */}
              {selectedCampanha.tipo === 'texto' && selectedCampanha.mensagem && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Mensagem</p>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="whitespace-pre-wrap">{selectedCampanha.mensagem}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedCampanha.tipo !== 'texto' && selectedCampanha.mediaUrl && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Mídia</p>
                  <a 
                    href={selectedCampanha.mediaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Ver arquivo →
                  </a>
                </div>
              )}

              {/* Lista de envios */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Status dos Envios</p>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {selectedCampanha.envios.map((envio, index) => {
                    const nomeCompleto = selectedCampanha.contatos.find(c => c.clienteId === envio.contatoId)?.nome || 'Desconhecido';
                    const nomeExibido = nomeCompleto.length > 20 ? nomeCompleto.substring(0, 20) + '...' : nomeCompleto;
                    return (
                    <div 
                      key={index}
                      className="flex items-center justify-between gap-3 p-3 border-b last:border-b-0"
                    >
                      <div className="flex-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="font-medium cursor-help">
                                {nomeExibido}
                              </p>
                            </TooltipTrigger>
                            {nomeCompleto.length > 20 && (
                              <TooltipContent>
                                <p>{nomeCompleto}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                        <p className="text-sm text-muted-foreground">
                          {(() => {
                            const tel = String(envio.telefone);
                            // Remove DDI 55 se tiver 13 dígitos
                            const telSemDDI = tel.length === 13 && tel.startsWith('55') ? tel.substring(2) : tel;
                            // Formata: (81) 99762-8611
                            return telSemDDI.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                          })()}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-medium ${
                          envio.status === 'Enviado' ? 'text-green-600' :
                          envio.status === 'Erro' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {envio.status}
                        </p>
                        {envio.enviadoEm && (
                          <p className="text-xs text-muted-foreground">
                            {format(toDate(envio.enviadoEm), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

