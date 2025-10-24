'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StandardDatePicker } from '@/components/ui/standard-date-picker';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Calendar, Clock, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { format, isBefore, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExcecaoHorario, TipoExcecao } from '@/lib/types';

const excecaoSchema = z.object({
  data: z.date({
    required_error: 'Selecione uma data',
  }).refine((date) => {
    // Data não pode ser no passado
    return !isBefore(startOfDay(date), startOfDay(new Date()));
  }, {
    message: 'A data não pode ser no passado',
  }),
  tipo: z.enum(['dia_completo', 'horario_parcial'] as const, {
    required_error: 'Selecione o tipo de exceção',
  }),
  motivo: z.string().max(100, 'Motivo muito longo (máx. 100 caracteres)').optional(),
  horarioInicio: z.string().optional(),
  horarioFim: z.string().optional(),
}).refine((data) => {
  // Se for horário parcial, horários são obrigatórios
  if (data.tipo === 'horario_parcial') {
    return data.horarioInicio && data.horarioFim;
  }
  return true;
}, {
  message: 'Horários são obrigatórios para exceção parcial',
  path: ['horarioInicio'],
}).refine((data) => {
  // Horário fim deve ser depois do início
  if (data.tipo === 'horario_parcial' && data.horarioInicio && data.horarioFim) {
    return data.horarioFim > data.horarioInicio;
  }
  return true;
}, {
  message: 'Horário final deve ser após o inicial',
  path: ['horarioFim'],
});

type ExcecaoFormData = z.infer<typeof excecaoSchema>;

interface ProfessionalExceptionsManagerProps {
  profissionalId: string;
  profissionalNome: string;
  excecoes?: ExcecaoHorario[];
  onSave: (excecoes: ExcecaoHorario[]) => Promise<void>;
}

export function ProfessionalExceptionsManager({
  profissionalId,
  profissionalNome,
  excecoes = [],
  onSave,
}: ProfessionalExceptionsManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExcecao, setEditingExcecao] = useState<ExcecaoHorario | null>(null);
  const [localExcecoes, setLocalExcecoes] = useState<ExcecaoHorario[]>(excecoes);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ExcecaoFormData>({
    resolver: zodResolver(excecaoSchema),
    defaultValues: {
      tipo: 'dia_completo',
    },
  });

  const tipoExcecao = form.watch('tipo');

  const handleAddExcecao = async (data: ExcecaoFormData) => {
    try {
      setIsSaving(true);

      // Verificar se já existe exceção para esta data
      const existente = localExcecoes.find((exc) =>
        isSameDay(new Date(exc.data), data.data)
      );

      if (existente && !editingExcecao) {
        toast({
          variant: 'destructive',
          title: 'Data já tem exceção',
          description: 'Já existe uma exceção cadastrada para esta data.',
        });
        return;
      }

      const novaExcecao: ExcecaoHorario = {
        id: editingExcecao?.id || `exc_${Date.now()}`,
        data: data.data,
        tipo: data.tipo,
        motivo: data.motivo,
        horarioInicio: data.tipo === 'horario_parcial' ? data.horarioInicio : undefined,
        horarioFim: data.tipo === 'horario_parcial' ? data.horarioFim : undefined,
        createdAt: editingExcecao?.createdAt || new Date(),
      };

      let novasExcecoes: ExcecaoHorario[];
      
      if (editingExcecao) {
        // Atualizar existente
        novasExcecoes = localExcecoes.map((exc) =>
          exc.id === editingExcecao.id ? novaExcecao : exc
        );
      } else {
        // Adicionar nova
        novasExcecoes = [...localExcecoes, novaExcecao];
      }

      // Ordenar por data
      novasExcecoes.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      setLocalExcecoes(novasExcecoes);
      await onSave(novasExcecoes);

      toast({
        title: editingExcecao ? 'Exceção atualizada!' : 'Exceção adicionada!',
        description: `A exceção foi ${editingExcecao ? 'atualizada' : 'cadastrada'} com sucesso.`,
      });

      form.reset();
      setIsDialogOpen(false);
      setEditingExcecao(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a exceção. Tente novamente.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditExcecao = (excecao: ExcecaoHorario) => {
    setEditingExcecao(excecao);
    form.reset({
      data: new Date(excecao.data),
      tipo: excecao.tipo,
      motivo: excecao.motivo,
      horarioInicio: excecao.horarioInicio,
      horarioFim: excecao.horarioFim,
    });
    setIsDialogOpen(true);
  };

  const handleRemoveExcecao = async (excecaoId: string) => {
    try {
      const novasExcecoes = localExcecoes.filter((exc) => exc.id !== excecaoId);
      setLocalExcecoes(novasExcecoes);
      await onSave(novasExcecoes);

      toast({
        title: 'Exceção removida!',
        description: 'A exceção foi removida com sucesso.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: 'Não foi possível remover a exceção. Tente novamente.',
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingExcecao(null);
    form.reset();
  };

  // Gerar horários de 30 em 30 minutos
  const gerarHorarios = () => {
    const horarios: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        horarios.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return horarios;
  };

  const horarios = gerarHorarios();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Exceções de Horário
            </CardTitle>
            <CardDescription>
              Gerencie dias de folga e horários especiais de <strong>{profissionalNome}</strong>
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Exceção
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingExcecao ? 'Editar Exceção' : 'Nova Exceção'}
                </DialogTitle>
                <DialogDescription>
                  Configure um dia ou horário especial para este profissional
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddExcecao)} className="space-y-4">
                  {/* Data */}
                  <FormField
                    control={form.control}
                    name="data"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data *</FormLabel>
                        <FormControl>
                          <StandardDatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Selecione a data"
                            minDate={new Date()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tipo */}
                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Exceção *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                            className="space-y-3"
                          >
                            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-3">
                              <RadioGroupItem value="dia_completo" />
                              <div className="flex-1">
                                <FormLabel className="font-medium">
                                  Dia Completo (Folga)
                                </FormLabel>
                                <FormDescription className="text-xs">
                                  O profissional não trabalha neste dia
                                </FormDescription>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-3">
                              <RadioGroupItem value="horario_parcial" />
                              <div className="flex-1">
                                <FormLabel className="font-medium">
                                  Horário Parcial
                                </FormLabel>
                                <FormDescription className="text-xs">
                                  O profissional trabalha em horário diferente
                                </FormDescription>
                              </div>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Horários (só para tipo parcial) */}
                  {tipoExcecao === 'horario_parcial' && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="horarioInicio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horário Início *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="08:00" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[200px]">
                                {horarios.map((h) => (
                                  <SelectItem key={h} value={h}>
                                    {h}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="horarioFim"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horário Fim *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="18:00" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[200px]">
                                {horarios.map((h) => (
                                  <SelectItem key={h} value={h}>
                                    {h}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Motivo */}
                  <FormField
                    control={form.control}
                    name="motivo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Curso, Casamento, Médico..."
                            maxLength={100}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Ajuda a lembrar o motivo da exceção
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Botões */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDialogClose}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? 'Salvando...' : editingExcecao ? 'Atualizar' : 'Adicionar'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {localExcecoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma exceção cadastrada
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione folgas ou horários especiais usando o botão acima
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {localExcecoes.map((excecao) => (
              <div
                key={excecao.id}
                className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {excecao.tipo === 'dia_completo' ? (
                      <Calendar className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="font-medium">
                      {format(new Date(excecao.data), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  {excecao.tipo === 'dia_completo' ? (
                    <p className="text-sm text-muted-foreground">
                      <strong>Dia completo</strong> - Profissional não trabalha
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      <strong>Horário especial:</strong> {excecao.horarioInicio} às{' '}
                      {excecao.horarioFim}
                    </p>
                  )}

                  {excecao.motivo && (
                    <p className="text-xs text-muted-foreground mt-1">
                      📝 {excecao.motivo}
                    </p>
                  )}
                </div>

                <div className="flex gap-1 ml-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditExcecao(excecao)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveExcecao(excecao.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
