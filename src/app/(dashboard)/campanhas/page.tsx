"use client"

import { useState, useEffect } from 'react';
import { usePlan } from '@/contexts/PlanContext';
import { useBusinessUser } from '@/contexts/BusinessUserContext';
import { FeatureLocked } from '@/components/feature-locked';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Loader2, Plus, AlertCircle, BarChart3, Send, Play, Pause, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

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
  const { businessUserId } = useBusinessUser();

  // Estados - Campanhas Firestore
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCampanha, setSelectedCampanha] = useState<Campanha | null>(null);

  // Estados - Campanhas em Massa (UazAPI)
  const [massaCampaigns, setMassaCampaigns] = useState<any[]>([]);
  const [isLoadingMassa, setIsLoadingMassa] = useState(false);
  const [tokenInstancia, setTokenInstancia] = useState<string>('');
  const [activeTab, setActiveTab] = useState('firestore');

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

  // Carregar token da instância
  useEffect(() => {
    if (!businessUserId) return;
    
    const loadToken = async () => {
      try {
        const { getBusinessConfig } = await import('@/lib/firestore');
        const config = await getBusinessConfig(businessUserId);
        setTokenInstancia(config?.tokenInstancia || '');
      } catch (error) {
        console.error('Erro ao carregar token:', error);
      }
    };
    
    loadToken();
  }, [businessUserId]);

  // Carregar campanhas em massa
  const loadMassaCampaigns = async () => {
    if (!tokenInstancia) return;
    
    setIsLoadingMassa(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/sender/listfolders`, {
        headers: {
          'token': tokenInstancia,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMassaCampaigns(data.folders || []);
      }
    } catch (error) {
      console.error('Erro ao carregar campanhas em massa:', error);
    } finally {
      setIsLoadingMassa(false);
    }
  };

  useEffect(() => {
    if (tokenInstancia && activeTab === 'massa') {
      loadMassaCampaigns();
      // Atualizar a cada 30 segundos
      const interval = setInterval(loadMassaCampaigns, 30000);
      return () => clearInterval(interval);
    }
  }, [tokenInstancia, activeTab]);

  // Controlar campanha em massa
  const handleControlMassaCampaign = async (folderId: string, action: 'stop' | 'continue' | 'delete') => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/sender/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': tokenInstancia,
        },
        body: JSON.stringify({ folder_id: folderId, action }),
      });

      if (response.ok) {
        const actionText = {
          stop: 'pausada',
          continue: 'retomada',
          delete: 'deletada'
        }[action];
        
        toast({
          title: 'Sucesso',
          description: `Campanha ${actionText} com sucesso.`,
        });
        loadMassaCampaigns();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível executar a ação.',
      });
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

      {/* Tabs para alternar entre campanhas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="firestore">
            <BarChart3 className="mr-2 h-4 w-4" />
            Campanhas Agendadas
          </TabsTrigger>
          <TabsTrigger value="massa">
            <Send className="mr-2 h-4 w-4" />
            Envio em Massa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="firestore" className="space-y-4 mt-6">{/* Conteúdo das campanhas firestore */}

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
        </TabsContent>

        {/* Tab: Campanhas em Massa */}
        <TabsContent value="massa" className="space-y-4 mt-6">
          {!tokenInstancia ? (
            <Card>
              <CardHeader>
                <CardTitle>⚠️ WhatsApp Não Conectado</CardTitle>
                <CardDescription>
                  Você precisa conectar o WhatsApp nas configurações para usar envio em massa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => window.location.href = '/configuracoes'}>
                  Ir para Configurações
                </Button>
              </CardContent>
            </Card>
          ) : isLoadingMassa ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {massaCampaigns.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground mb-4">Nenhuma campanha em massa encontrada</p>
                    <p className="text-sm text-muted-foreground">
                      Crie uma em &quot;Campanhas em Massa&quot; no menu lateral
                    </p>
                  </CardContent>
                </Card>
              ) : (
                massaCampaigns.map((campaign) => {
                  const progress = campaign.total_messages ? Math.round((campaign.sent_messages || 0) / campaign.total_messages * 100) : 0;
                  const canPause = campaign.status === 'sending' || campaign.status === 'scheduled';
                  const canResume = campaign.status === 'paused';
                  const canDelete = campaign.status !== 'deleting';
                  
                  return (
                    <Card key={campaign.folder_id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2">
                              {campaign.info || `Campanha ${campaign.folder_id}`}
                            </CardTitle>
                            <Badge variant={
                              campaign.status === 'sending' ? 'default' :
                              campaign.status === 'paused' ? 'outline' :
                              campaign.status === 'done' ? 'secondary' :
                              campaign.status === 'deleting' ? 'destructive' : 'secondary'
                            }>
                              {campaign.status === 'scheduled' && 'Agendada'}
                              {campaign.status === 'sending' && 'Enviando'}
                              {campaign.status === 'paused' && 'Pausada'}
                              {campaign.status === 'done' && 'Concluída'}
                              {campaign.status === 'deleting' && 'Deletando'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Enviadas: {campaign.sent_messages || 0}</span>
                            <span>Total: {campaign.total_messages || 0}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {canPause && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleControlMassaCampaign(campaign.folder_id, 'stop')}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {canResume && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleControlMassaCampaign(campaign.folder_id, 'continue')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm('Tem certeza que deseja deletar esta campanha?')) {
                                  handleControlMassaCampaign(campaign.folder_id, 'delete');
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
                Cadastre clientes primeiro na aba &quot;Clientes&quot;.
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

