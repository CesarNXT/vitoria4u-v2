"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MediaUpload } from './media-upload';
import { Cliente, CampanhaTipo, CampanhaContato } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  CalendarIcon, 
  Clock, 
  Users, 
  AlertCircle, 
  Search,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { useScrollToError } from '@/lib/form-utils';

const campaignSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  tipo: z.enum(['texto', 'imagem', 'audio', 'video']),
  mensagem: z.string().optional(),
  mediaUrl: z.string().optional(),
  dataAgendamento: z.date({
    required_error: "Data de agendamento é obrigatória",
  }),
  horaInicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido (HH:MM)'),
}).refine((data) => {
  if (data.tipo === 'texto') {
    return !!data.mensagem && data.mensagem.length > 0;
  }
  return !!data.mediaUrl;
}, {
  message: "Mensagem ou mídia é obrigatória",
  path: ['mensagem'],
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

interface CampaignFormProps {
  clientes: Cliente[];
  onSubmit: (data: CampaignFormValues & { contatos: CampanhaContato[] }) => Promise<void>;
  isSubmitting: boolean;
}

export function CampaignForm({ clientes, onSubmit, isSubmitting }: CampaignFormProps) {
  const [tipo, setTipo] = useState<CampanhaTipo>('texto');
  const [contatos, setContatos] = useState<CampanhaContato[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isContactsDialogOpen, setIsContactsDialogOpen] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(50);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      nome: '',
      tipo: 'texto',
      mensagem: '',
      mediaUrl: '',
      horaInicio: '08:00',
    },
  });

  // Scroll automático para o primeiro erro
  useScrollToError(form.formState.errors);

  // Inicializar contatos baseado nos clientes
  useEffect(() => {
    const contatosIniciais: CampanhaContato[] = clientes.map(cliente => ({
      clienteId: cliente.id,
      nome: cliente.name,
      telefone: cliente.phone,
      selecionado: cliente.status === 'Ativo', // Ativos já selecionados
      status: cliente.status,
    }));
    setContatos(contatosIniciais);
  }, [clientes]);

  // Filtrar contatos por busca
  const contatosFiltrados = useMemo(() => {
    let filtered = contatos;

    // Filtrar por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        c => c.nome.toLowerCase().includes(term) || 
             c.telefone.toString().includes(term)
      );
    }

    // Filtrar por status se necessário
    if (!incluirInativos) {
      filtered = filtered.filter(c => c.status === 'Ativo');
    }

    return filtered;
  }, [contatos, searchTerm, incluirInativos]);

  // Contar selecionados
  const contatosSelecionados = contatos.filter(c => c.selecionado).length;

  // Calcular tempo estimado (80-120s por mensagem)
  const calcularTempoEstimado = () => {
    if (contatosSelecionados === 0) return '0min';

    const tempoMinPorMensagem = 80; // segundos
    const tempoMaxPorMensagem = 120; // segundos
    const tempoMedio = (tempoMinPorMensagem + tempoMaxPorMensagem) / 2;

    const totalSegundos = contatosSelecionados * tempoMedio;
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);

    if (horas > 0) {
      return `${horas}h ${minutos}min`;
    }
    return `${minutos}min`;
  };

  // Calcular hora estimada de término
  const calcularHoraTermino = (horaInicio: string) => {
    if (contatosSelecionados === 0) return horaInicio;

    const [horaStr, minutoStr] = horaInicio.split(':');
    const hora = parseInt(horaStr || '0', 10);
    const minuto = parseInt(minutoStr || '0', 10);
    const inicioMinutos = hora * 60 + minuto;

    const tempoMedioPorMensagem = 100; // segundos
    const totalMinutos = (contatosSelecionados * tempoMedioPorMensagem) / 60;

    const terminoMinutos = inicioMinutos + totalMinutos;
    const terminoHora = Math.floor(terminoMinutos / 60) % 24;
    const terminoMinuto = Math.floor(terminoMinutos % 60);

    return `${String(terminoHora).padStart(2, '0')}:${String(terminoMinuto).padStart(2, '0')}`;
  };

  // Toggle seleção de contato
  const toggleContato = (clienteId: string, forceValue?: boolean) => {
    setContatos(prev => prev.map(c => 
      c.clienteId === clienteId 
        ? { ...c, selecionado: forceValue !== undefined ? forceValue : !c.selecionado } 
        : c
    ));
  };

  // Selecionar/desselecionar todos
  const toggleTodos = () => {
    const todosVisiveis = contatosFiltrados.every(c => c.selecionado);
    const idsVisiveis = contatosFiltrados.map(c => c.clienteId);
    
    setContatos(prev => prev.map(c => 
      idsVisiveis.includes(c.clienteId) ? { ...c, selecionado: !todosVisiveis } : c
    ));
  };

  // Validações antes de submeter
  const handleSubmit = async (data: CampaignFormValues) => {
    // Validar número de contatos
    if (contatosSelecionados === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum contato selecionado",
        description: "Selecione pelo menos um contato para a campanha.",
      });
      // Rolar até seção de contatos
      document.getElementById('contatos-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (contatosSelecionados > 200) {
      toast({
        variant: "destructive",
        title: "Muitos contatos selecionados",
        description: "O limite máximo é 200 contatos por campanha.",
      });
      // Rolar até seção de contatos
      document.getElementById('contatos-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Validar data e hora (não pode ser no passado)
    const agora = new Date();
    const agoraComHora = new Date();
    const dataAgendamentoSemHora = new Date(data.dataAgendamento);
    dataAgendamentoSemHora.setHours(0, 0, 0, 0);
    const hojeSemHora = new Date();
    hojeSemHora.setHours(0, 0, 0, 0);
    
    // Se for hoje, validar hora também
    if (dataAgendamentoSemHora.getTime() === hojeSemHora.getTime()) {
      const [horaStr, minutoStr] = data.horaInicio.split(':');
      const hora = parseInt(horaStr || '0', 10);
      const minuto = parseInt(minutoStr || '0', 10);
      const dataHoraAgendamento = new Date();
      dataHoraAgendamento.setHours(hora, minuto, 0, 0);
      
      if (dataHoraAgendamento <= agoraComHora) {
        toast({
          variant: "destructive",
          title: "Hora inválida",
          description: "Para agendamento hoje, a hora precisa ser futura.",
        });
        // Rolar até campo de hora
        document.getElementById('hora-inicio')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    
    // Se for data passada, bloquear
    if (dataAgendamentoSemHora < hojeSemHora) {
      toast({
        variant: "destructive",
        title: "Data inválida",
        description: "A data de agendamento não pode ser no passado.",
      });
      // Rolar até campo de data
      document.getElementById('data-agendamento')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Validar tipo e conteúdo
    if (data.tipo === 'texto' && (!data.mensagem || data.mensagem.trim() === '')) {
      toast({
        variant: "destructive",
        title: "Mensagem obrigatória",
        description: "Digite uma mensagem para enviar.",
      });
      // Rolar até campo de mensagem
      document.getElementById('mensagem-texto')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (data.tipo !== 'texto' && !data.mediaUrl) {
      toast({
        variant: "destructive",
        title: "Mídia obrigatória",
        description: `Faça upload de ${data.tipo} para a campanha.`,
      });
      // Rolar até campo de mídia
      document.getElementById('tipo-mensagem')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    await onSubmit({
      ...data,
      contatos: contatos.filter(c => c.selecionado),
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Informações básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Campanha</CardTitle>
          <CardDescription>
            Defina os detalhes básicos da sua campanha de WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Campanha *</Label>
            <Input
              id="nome"
              placeholder="Ex: Promoção de Natal 2024"
              {...form.register('nome')}
            />
            {form.formState.errors.nome && (
              <p className="text-sm text-destructive">{form.formState.errors.nome.message}</p>
            )}
          </div>

          {/* Tipo de mensagem */}
          <div className="space-y-2" id="tipo-mensagem">
            <Label>Tipo de Mensagem *</Label>
            <RadioGroup
              value={tipo}
              onValueChange={(value) => {
                setTipo(value as CampanhaTipo);
                form.setValue('tipo', value as CampanhaTipo);
                form.setValue('mensagem', '');
                form.setValue('mediaUrl', '');
              }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="texto" id="texto" />
                <Label htmlFor="texto" className="cursor-pointer flex-1">Texto</Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="imagem" id="imagem" />
                <Label htmlFor="imagem" className="cursor-pointer flex-1">Imagem</Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="audio" id="audio" />
                <Label htmlFor="audio" className="cursor-pointer flex-1">Áudio</Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="video" id="video" />
                <Label htmlFor="video" className="cursor-pointer flex-1">Vídeo</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Mensagem de texto */}
          {tipo === 'texto' && (
            <div className="space-y-2" id="mensagem-texto">
              <Label htmlFor="mensagem">Mensagem *</Label>
              <Textarea
                id="mensagem"
                placeholder="Digite sua mensagem..."
                rows={6}
                {...form.register('mensagem')}
              />
              {form.formState.errors.mensagem && (
                <p className="text-sm text-destructive">{form.formState.errors.mensagem.message}</p>
              )}
            </div>
          )}

          {/* Upload de mídia */}
          {tipo !== 'texto' && (
            <MediaUpload
              tipo={tipo}
              mediaUrl={form.watch('mediaUrl')}
              onUploadComplete={(url) => form.setValue('mediaUrl', url)}
              onRemove={() => form.setValue('mediaUrl', '')}
            />
          )}

          {/* Data e hora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2" id="data-agendamento">
              <Label>Data de Agendamento *</Label>
              <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch('dataAgendamento') && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch('dataAgendamento') ? (
                      format(form.watch('dataAgendamento'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione a data</span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-auto p-2 max-w-[calc(100vw-2rem)]">
                  <DialogHeader>
                    <DialogTitle className="sr-only">Data de Agendamento</DialogTitle>
                    <DialogDescription className="sr-only">Selecione a data para iniciar a campanha.</DialogDescription>
                  </DialogHeader>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Calendar
                      mode="single"
                      selected={form.watch('dataAgendamento')}
                      onSelect={(date) => {
                        if (date) {
                          form.setValue('dataAgendamento', date);
                          setIsCalendarOpen(false);
                        }
                      }}
                      disabled={(date) => {
                        // Permitir hoje, mas bloquear dias passados
                        const hoje = new Date();
                        hoje.setHours(0, 0, 0, 0);
                        const dataComparar = new Date(date);
                        dataComparar.setHours(0, 0, 0, 0);
                        return dataComparar < hoje;
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                  </div>
                </DialogContent>
              </Dialog>
              {form.formState.errors.dataAgendamento && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.dataAgendamento.message}
                </p>
              )}
            </div>

            <div className="space-y-2" id="hora-inicio">
              <Label htmlFor="horaInicio">Hora de Início *</Label>
              <Input
                id="horaInicio"
                type="time"
                {...form.register('horaInicio')}
              />
              {form.formState.errors.horaInicio && (
                <p className="text-sm text-destructive">{form.formState.errors.horaInicio.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seleção de contatos - Botão que abre Dialog */}
      <Card id="contatos-section">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contatos</CardTitle>
              <CardDescription>
                Selecione os contatos para enviar a campanha
              </CardDescription>
            </div>
            <Badge variant={contatosSelecionados > 0 ? "default" : "secondary"}>
              {contatosSelecionados} contato{contatosSelecionados !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Os envios são espaçados entre 80-120 segundos para evitar bloqueios do WhatsApp.
              Contatos inativos aparecem destacados e desmarcados por padrão.
            </AlertDescription>
          </Alert>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setIsContactsDialogOpen(true)}
          >
            <Users className="h-4 w-4 mr-2" />
            {contatosSelecionados === 0 
              ? 'Selecionar Contatos' 
              : `${contatosSelecionados} contato${contatosSelecionados > 1 ? 's' : ''} selecionado${contatosSelecionados > 1 ? 's' : ''}`
            }
          </Button>
        </CardContent>
      </Card>

      {/* Dialog de seleção de contatos - NOVO DESIGN */}
      <Dialog open={isContactsDialogOpen} onOpenChange={setIsContactsDialogOpen}>
        <DialogContent className="max-w-[600px] w-[calc(100vw-2rem)] h-[80vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl">Selecionar Contatos</DialogTitle>
            <DialogDescription>
              Escolha os contatos para enviar a campanha (sem limite)
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col px-6">
            {/* Busca e ações */}
            <div className="flex flex-col gap-3 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setDisplayedCount(50);
                  }}
                  className="pl-9 h-10"
                />
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="incluirInativos"
                    checked={incluirInativos}
                    onCheckedChange={(checked) => setIncluirInativos(checked as boolean)}
                  />
                  <Label htmlFor="incluirInativos" className="cursor-pointer text-sm">
                    Mostrar inativos
                  </Label>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const todosVisiveis = contatosFiltrados.slice(0, displayedCount);
                      const todosSelecionados = todosVisiveis.every(c => c.selecionado);
                      todosVisiveis.forEach(c => {
                        toggleContato(c.clienteId, !todosSelecionados);
                      });
                    }}
                  >
                    {contatosFiltrados.slice(0, displayedCount).every(c => c.selecionado) ? 'Desmarcar' : 'Marcar'} Visíveis
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={toggleTodos}
                  >
                    {contatosFiltrados.every(c => c.selecionado) ? 'Desmarcar' : 'Marcar'} Todos
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="mb-3" />

            {/* Lista de contatos - VIRTUALIZADA */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto space-y-1.5"
              onScroll={(e) => {
                const target = e.currentTarget;
                const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 200;
                
                if (isNearBottom && displayedCount < contatosFiltrados.length) {
                  setDisplayedCount(prev => Math.min(prev + 50, contatosFiltrados.length));
                }
              }}
            >
              {contatosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm">Nenhum contato encontrado</p>
                </div>
              ) : (
                <>
                  {contatosFiltrados.slice(0, displayedCount).map((contato) => (
                    <div
                      key={contato.clienteId}
                      className={cn(
                        "flex items-center gap-3 p-3 border rounded-md transition-all cursor-pointer hover:bg-accent/50",
                        contato.selecionado && "bg-primary/5 border-primary/50 shadow-sm",
                        contato.status === 'Inativo' && "opacity-50"
                      )}
                      onClick={() => toggleContato(contato.clienteId)}
                    >
                      <Checkbox
                        className="flex-shrink-0"
                        checked={contato.selecionado}
                        onCheckedChange={(checked) => toggleContato(contato.clienteId, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{contato.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {String(contato.telefone).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                        </p>
                      </div>
                      {contato.status === 'Ativo' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  ))}
                  
                  {displayedCount < contatosFiltrados.length && (
                    <div className="text-center py-3 text-sm text-muted-foreground">
                      Mostrando {displayedCount} de {contatosFiltrados.length} • Role para carregar mais
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer com contador e botão */}
          <div className="border-t p-4 flex items-center justify-between gap-3 bg-background">
            <div className="flex items-center gap-3">
              <Badge variant={contatosSelecionados > 0 ? "default" : "secondary"} className="text-sm px-3 py-1">
                {contatosSelecionados} selecionado{contatosSelecionados !== 1 ? 's' : ''}
              </Badge>
              {contatosSelecionados > 0 && (
                <span className="text-xs text-muted-foreground">
                  ~{calcularTempoEstimado()}
                </span>
              )}
            </div>
            <Button 
              onClick={() => {
                setIsContactsDialogOpen(false);
                setDisplayedCount(50);
              }} 
              size="sm"
              disabled={contatosSelecionados === 0}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resumo e previsão */}
      {contatosSelecionados > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Previsão de Envio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total de Contatos</p>
                <p className="text-2xl font-bold">{contatosSelecionados}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tempo Estimado</p>
                <p className="text-2xl font-bold">{calcularTempoEstimado()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Previsão de Término</p>
                <p className="text-2xl font-bold">
                  {form.watch('horaInicio') ? calcularHoraTermino(form.watch('horaInicio')) : '--:--'}
                </p>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Os envios são distribuídos aleatoriamente entre 80-120 segundos para simular comportamento humano
                e evitar bloqueios do WhatsApp.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Botões de ação */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={isSubmitting || contatosSelecionados === 0}
        >
          {isSubmitting ? 'Agendando...' : 'Agendar Campanha'}
        </Button>
      </div>
    </form>
  );
}
