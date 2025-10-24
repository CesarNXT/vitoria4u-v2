'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Trash2, Edit2, AlertCircle, CalendarX } from 'lucide-react';
import { format, isBefore, startOfDay, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DataBloqueada } from '@/lib/types';
import { AppointmentBlockForm } from '../configuracoes/appointment-block-form';

interface ProfessionalBlocksManagerProps {
  profissionalId: string;
  profissionalNome: string;
  bloqueios?: DataBloqueada[];
  onSave: (bloqueios: DataBloqueada[]) => Promise<void>;
}

export function ProfessionalBlocksManager({
  profissionalId,
  profissionalNome,
  bloqueios = [],
  onSave,
}: ProfessionalBlocksManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBloqueio, setEditingBloqueio] = useState<DataBloqueada | null>(null);
  const [localBloqueios, setLocalBloqueios] = useState<DataBloqueada[]>(bloqueios);
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar estado local com props
  useEffect(() => {
    console.log('[BLOQUEIOS-MANAGER] Props bloqueios mudaram:', bloqueios);
    setLocalBloqueios(bloqueios);
  }, [bloqueios]);

  const handleAddBloqueio = async (data: Omit<DataBloqueada, 'id'>) => {
    try {
      setIsSaving(true);
      
      console.log('[BLOQUEIOS-MANAGER] Dados recebidos do formulário:', data);

      const novoBloqueio: DataBloqueada = {
        id: editingBloqueio?.id || `block_${Date.now()}`,
        reason: data.reason,
        startDate: data.startDate,
        endDate: data.endDate,
      };
      
      console.log('[BLOQUEIOS-MANAGER] Novo bloqueio criado:', novoBloqueio);

      let novosBloqueios: DataBloqueada[];
      
      if (editingBloqueio) {
        // Atualizar existente
        novosBloqueios = localBloqueios.map((blq) =>
          blq.id === editingBloqueio.id ? novoBloqueio : blq
        );
        
        toast({
          title: 'Bloqueio atualizado!',
          description: 'O bloqueio foi atualizado com sucesso.',
        });
      } else {
        // Adicionar novo
        novosBloqueios = [...localBloqueios, novoBloqueio];
        
        toast({
          title: 'Bloqueio adicionado!',
          description: 'O período foi bloqueado com sucesso.',
        });
      }

      // Ordenar por data de início
      novosBloqueios.sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      
      console.log('[BLOQUEIOS-MANAGER] Array atualizado de bloqueios:', novosBloqueios);

      setLocalBloqueios(novosBloqueios);
      
      console.log('[BLOQUEIOS-MANAGER] Chamando onSave...');
      await onSave(novosBloqueios);
      console.log('[BLOQUEIOS-MANAGER] onSave completado');

      setIsDialogOpen(false);
      setEditingBloqueio(null);
    } catch (error) {
      console.error('[BLOQUEIOS-MANAGER] Erro ao salvar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o bloqueio. Tente novamente.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditBloqueio = (bloqueio: DataBloqueada) => {
    setEditingBloqueio(bloqueio);
    setIsDialogOpen(true);
  };

  const handleRemoveBloqueio = async (bloqueioId: string) => {
    try {
      const novosBloqueios = localBloqueios.filter((blq) => blq.id !== bloqueioId);
      setLocalBloqueios(novosBloqueios);
      await onSave(novosBloqueios);

      toast({
        title: 'Bloqueio removido!',
        description: 'O bloqueio foi removido com sucesso.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: 'Não foi possível remover o bloqueio. Tente novamente.',
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingBloqueio(null);
  };

  // Separar bloqueios passados e futuros
  const now = new Date();
  const bloqueiosFuturos = localBloqueios.filter(blq => 
    isAfter(new Date(blq.endDate), now)
  );
  const bloqueiosPassados = localBloqueios.filter(blq => 
    isBefore(new Date(blq.endDate), now)
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarX className="h-5 w-5" />
                Bloqueios de Agenda
              </CardTitle>
              <CardDescription>
                Bloqueie períodos específicos na agenda de <strong>{profissionalNome}</strong>
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Bloqueio
            </Button>
          </div>
        </CardHeader>

        <CardContent>
        {localBloqueios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum bloqueio cadastrado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione bloqueios de agenda usando o botão acima
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bloqueios Futuros/Ativos */}
            {bloqueiosFuturos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Bloqueios Ativos/Futuros
                </h3>
                {bloqueiosFuturos.map((bloqueio) => (
                  <div
                    key={bloqueio.id}
                    className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">
                          {format(new Date(bloqueio.startDate), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                          {' até '}
                          {format(new Date(bloqueio.endDate), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>

                      {bloqueio.reason && (
                        <p className="text-sm text-muted-foreground">
                          📝 {bloqueio.reason}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditBloqueio(bloqueio)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveBloqueio(bloqueio.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bloqueios Passados */}
            {bloqueiosPassados.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Histórico de Bloqueios
                </h3>
                {bloqueiosPassados.map((bloqueio) => (
                  <div
                    key={bloqueio.id}
                    className="flex items-start justify-between rounded-lg border border-dashed p-4 opacity-60"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {format(new Date(bloqueio.startDate), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                          {' até '}
                          {format(new Date(bloqueio.endDate), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>

                      {bloqueio.reason && (
                        <p className="text-xs text-muted-foreground">
                          📝 {bloqueio.reason}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditBloqueio(bloqueio)}
                        title="Editar motivo"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveBloqueio(bloqueio.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>

      {/* Dialog de Formulário de Bloqueio */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBloqueio ? 'Editar Bloqueio' : 'Novo Bloqueio'}
            </DialogTitle>
            <DialogDescription>
              Bloqueie um período específico na agenda do profissional
            </DialogDescription>
          </DialogHeader>

          <AppointmentBlockForm
            key={editingBloqueio?.id || 'new-block-form'}
            block={editingBloqueio}
            onSubmit={handleAddBloqueio}
            isSubmitting={isSaving}
            isPastBlock={editingBloqueio ? isBefore(new Date(editingBloqueio.endDate), now) : false}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
