"use client"

import { useState, useEffect } from 'react';
import { usePlan } from '@/contexts/PlanContext';
import { FeatureLocked } from '@/components/feature-locked';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { CampaignForm } from './campaign-form';
import { columns } from './columns';
import { 
  getClientesAction, 
  getCampanhasAction, 
  createCampanhaAction,
  cancelCampanhaAction,
  deleteCampanhaAction,
  getCampanhaDetailsAction
} from './actions';
import { Cliente, Campanha, CampanhaContato } from '@/lib/types';
import { Loader2, Plus, AlertCircle, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export default function CampanhasPage() {
  const { canUseFeature, isLoading: planLoading } = usePlan();

  // Estados
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCampanha, setSelectedCampanha] = useState<Campanha | null>(null);

  // Verificar feature
  const featureCheck = canUseFeature('disparo_de_mensagens');

  // Carregar dados iniciais
  useEffect(() => {
    if (!planLoading && featureCheck.allowed) {
      loadData();
    }
  }, [planLoading, featureCheck.allowed]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [clientesRes, campanhasRes] = await Promise.all([
        getClientesAction(),
        getCampanhasAction(),
      ]);

      if (clientesRes.success) {
        setClientes(clientesRes.clientes);
      }

      if (campanhasRes.success) {
        setCampanhas(campanhasRes.campanhas);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: "Tente recarregar a página",
      });
    } finally {
      setIsLoadingData(false);
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
          description: result.message,
        });
        setShowNewCampaignDialog(false);
        await loadData();
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao criar campanha",
          description: result.error,
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

  // Ver detalhes da campanha
  const handleViewDetails = async (campanha: Campanha) => {
    setSelectedCampanha(campanha);
    setShowDetailsDialog(true);
  };

  // Cancelar campanha
  const handleCancelCampanha = async (campanha: Campanha) => {
    if (!confirm(`Deseja realmente cancelar a campanha "${campanha.nome}"?`)) {
      return;
    }

    try {
      const result = await cancelCampanhaAction(campanha.id);

      if (result.success) {
        toast({
          title: "Campanha cancelada",
          description: result.message,
        });
        await loadData();
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao cancelar",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao cancelar",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  // Deletar campanha
  const handleDeleteCampanha = async (campanha: Campanha) => {
    const message = campanha.status === 'Em Andamento' 
      ? `A campanha "${campanha.nome}" está EM ANDAMENTO. Deletar irá CANCELAR todos os envios pendentes. Deseja continuar?`
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
        <Button onClick={() => setShowNewCampaignDialog(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Avisos importantes */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> As mensagens são enviadas com intervalos de 80-120 segundos entre cada contato 
          para evitar bloqueios do WhatsApp. Limite de 200 contatos por campanha.
        </AlertDescription>
      </Alert>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Campanhas</CardDescription>
            <CardTitle className="text-3xl">{campanhas.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Agendadas</CardDescription>
            <CardTitle className="text-3xl">
              {campanhas.filter(c => c.status === 'Agendada').length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Em Andamento</CardDescription>
            <CardTitle className="text-3xl">
              {campanhas.filter(c => c.status === 'Em Andamento').length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Concluídas</CardDescription>
            <CardTitle className="text-3xl">
              {campanhas.filter(c => c.status === 'Concluída').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabela de campanhas */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Campanhas</CardTitle>
          <CardDescription>
            Gerencie suas campanhas de envio em massa
          </CardDescription>
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
          ) : (
            <DataTable 
              columns={columns} 
              data={campanhas}
              meta={{
                onView: handleViewDetails,
                onCancel: handleCancelCampanha,
                onDelete: handleDeleteCampanha,
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog: Nova Campanha */}
      <Dialog open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
            <DialogDescription>
              Configure sua campanha de envio em massa
            </DialogDescription>
          </DialogHeader>

          {clientes.length === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Você precisa ter clientes cadastrados para criar uma campanha.
                Cadastre clientes primeiro na aba "Clientes".
              </AlertDescription>
            </Alert>
          ) : (
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
                          {String(envio.telefone).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
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

