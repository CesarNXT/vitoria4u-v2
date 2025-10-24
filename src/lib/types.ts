

// Using `any` for Timestamps until we decide on a client/server serialization strategy
// For mock data, we use Date objects. In a real Firestore app, you'd get Timestamps.
type Timestamp = any;

export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'business';
  avatarUrl?: string;
}

export interface HorarioSlot {
  start: string;
  end: string;
}

export interface HorarioDia {
  enabled: boolean;
  slots: HorarioSlot[];
}

export type DiasDaSemana = 'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado';

export interface Endereco {
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
}

export interface PlanoSaude {
  id: string;
  nome: string;
}

export interface ConfiguracoesNegocio {
  id: string;
  nome: string;
  telefone: number;
  categoria: string;
  endereco: Endereco;
  horariosFuncionamento: {
    [key in DiasDaSemana]: HorarioDia;
  };
  // Fields not edited in the main settings form but required for the type
  whatsappConectado: boolean;
  instanciaWhatsapp?: string;
  tokenInstancia?: string | null;
  planId: string;
  access_expires_at: Timestamp;
  mp?: {
    preapprovalId?: string;
    status: 'authorized' | 'cancelled' | 'paused' | 'pending';
    last_payment_at?: Timestamp;
    lastPaymentId?: string;
    lastPaymentStatus?: string;
    paymentMethod?: string;
    paymentType?: string;
  };
  createdAt: Timestamp;
  agendamentos?: Agendamento[];
  clientes?: Cliente[];
  habilitarLembrete24h?: boolean;
  habilitarLembrete2h?: boolean;
  habilitarAniversario?: boolean; // Enviar mensagem de aniversário para clientes
  habilitarFeedback?: boolean;
  feedbackPlatform?: 'google' | 'instagram';
  feedbackLink?: string;
  habilitarEscalonamento?: boolean;
  numeroEscalonamento?: number | null;
  nomeIa?: string;
  instrucoesIa?: string;
  iaAtiva?: boolean; // Se a IA está ativa (padrão true) - usado para controle externo (n8n)
  resumoEndereco?: string;
  resumoHorarios?: string;
  linkAgendamento?: string;
  email?: string;
  nextPlanId?: string | null;
  audit?: any;
  setupCompleted?: boolean; // Flag que indica se a configuração inicial obrigatória foi concluída
  planosSaudeAceitos?: PlanoSaude[]; // Planos de saúde/odontológicos aceitos
  notificarClienteAgendamento?: boolean; // Enviar confirmação de agendamento para o cliente
  notificarGestorAgendamento?: boolean; // Notificar gestor sobre agendamentos/cancelamentos (não requer WhatsApp)
  
  // Rejeição automática de chamadas
  rejeitarChamadasAutomaticamente?: boolean; // Rejeitar chamadas automaticamente
  mensagemRejeicaoChamada?: string; // Mensagem enviada após rejeitar chamada
  
  // Status da conexão WhatsApp (atualizados via webhook)
  whatsappStatus?: 'conectado' | 'desconectado' | 'conectando';
  whatsappQR?: string | null;
  whatsappUltimaAtualizacao?: Timestamp;
}

export interface ReminderCampaign {
  type: '24h' | '2h';
  folderId: string;
  scheduledFor: Date;
}

export interface Agendamento {
  id: string;
  cliente: Cliente;
  servico: Servico;
  profissional: Profissional;
  date: Timestamp;
  startTime: string;
  status: 'Agendado' | 'Finalizado' | 'Cancelado';
  instanciaWhatsapp?: string;
  tokenInstancia?: string | null;
  createdAt?: Timestamp;
  canceledAt?: Timestamp;
  canceledBy?: string;
  tipoAtendimento?: 'particular' | 'plano'; // Tipo de atendimento
  planoSaude?: PlanoSaude; // Plano de saúde usado (se tipoAtendimento === 'plano')
  
  // Sistema de lembretes via UazAPI
  reminderCampaigns?: ReminderCampaign[]; // IDs das campanhas agendadas na UazAPI
  
  // Status Lembrete 24h (atualizados via webhook)
  lembrete24hEnviado?: boolean;
  lembrete24hEnviadoEm?: Timestamp;
  lembrete24hEntregue?: boolean;
  lembrete24hEntregueEm?: Timestamp;
  lembrete24hLido?: boolean;
  lembrete24hLidoEm?: Timestamp;
  lembrete24hErro?: boolean;
  lembrete24hErroMotivo?: string;
  lembrete24hErroEm?: Timestamp;
  
  // Status Lembrete 2h (atualizados via webhook)
  lembrete2hEnviado?: boolean;
  lembrete2hEnviadoEm?: Timestamp;
  lembrete2hEntregue?: boolean;
  lembrete2hEntregueEm?: Timestamp;
  lembrete2hLido?: boolean;
  lembrete2hLidoEm?: Timestamp;
  lembrete2hErro?: boolean;
  lembrete2hErroMotivo?: string;
  lembrete2hErroEm?: Timestamp;
}

export interface Cliente {
  id: string;
  name: string;
  phone: number;
  status: 'Ativo' | 'Inativo';
  avatarUrl?: string;
  birthDate: Timestamp;
  instanciaWhatsapp?: string;
  observacoes?: string; // Observações/notas sobre o cliente
  planoSaude?: PlanoSaude; // Plano de saúde do cliente (se tiver)
  matriculaPlano?: string; // Matrícula/Número da carteirinha do plano (opcional, máx 64 chars)
}

export type PlanFeature = 
  | 'lembrete_24h'
  | 'lembrete_2h'
  | 'feedback_pos_atendimento'
  | 'solicitacao_feedback'
  | 'lembrete_aniversario'
  | 'lembrete_profissional'
  | 'disparo_de_mensagens'
  | 'retorno_manutencao'
  | 'notificacao_gestor_agendamento'
  | 'notificacao_cliente_agendamento'
  | 'atendimento_whatsapp_ia'
  | 'escalonamento_humano'
  | 'rejeicao_chamadas'; // Rejeitar chamadas automaticamente

export interface Plano {
  id: string;
  name: string;
  description?: string;
  price: number;
  oldPrice?: number;
  durationInDays: number; // Duração do acesso em dias
  features: PlanFeature[];
  isFeatured?: boolean;
  status?: 'Ativo' | 'Inativo';
  // O campo mercadoPagoId é mantido apenas para retrocompatibilidade com dados antigos,
  // mas não deve ser usado em nova lógica.
  mercadoPagoId?: string; 
}

export interface AdminData {
  businesses: ConfiguracoesNegocio[];
  plans: Plano[];
  allAppointments: Agendamento[];
  allClients: Cliente[];
}

export interface DataBloqueada {
  id: string;
  reason?: string;
  startDate: Timestamp | Date;
  endDate: Timestamp | Date;
}

export type PriceType = 'fixed' | 'on_request' | 'starting_from';

export interface Servico {
    id: string;
    name: string;
    description?: string;
    price: number;
    priceType: PriceType; // Tipo de precificação
    duration: number;
    status: 'Ativo' | 'Inativo';
    professionals: { id: string, name: string }[];
    imageUrl?: string;
    instanciaWhatsapp?: string;
    returnInDays?: number | null;
    custo?: number; // Custo médio do serviço (produtos, materiais, etc)
    planosAceitos?: PlanoSaude[]; // Planos de saúde que aceitam este serviço (só para clínicas)
}

export interface Profissional {
    id: string;
    name: string;
    phone: number;
    status: 'Ativo' | 'Inativo';
    avatarUrl?: string;
    workHours?: HorarioTrabalho;
    instanciaWhatsapp?: string;
    notificarAgendamentos?: boolean; // Se true, profissional recebe notificações de agendamentos/cancelamentos
    datasBloqueadas?: DataBloqueada[]; // Bloqueios de agenda do profissional (férias, folgas, etc)
}

// Tipos de exceção de horário para profissionais
export type TipoExcecao = 'dia_completo' | 'horario_parcial';

export interface ExcecaoHorario {
    id: string;
    data: Date; // Data específica da exceção
    tipo: TipoExcecao;
    motivo?: string; // Ex: "Curso", "Casamento", "Médico"
    // Para tipo 'horario_parcial':
    horarioInicio?: string; // Ex: "12:00" (chega mais tarde)
    horarioFim?: string; // Ex: "17:00" (sai mais cedo)
    // Para tipo 'dia_completo': profissional não trabalha neste dia
    createdAt?: Date;
}

export type HorarioTrabalho = ConfiguracoesNegocio['horariosFuncionamento'];
export type EnderecoNegocio = ConfiguracoesNegocio['endereco'];

export interface SystemConfig {
  id: 'global';
  trial: {
    enabled: boolean;
    days: number;
    planId: string; // ID do plano oferecido no teste
  };
}

export type CampanhaTipo = 'texto' | 'imagem' | 'audio' | 'video';
export type CampanhaStatus = 'Agendada' | 'Em Andamento' | 'Concluída' | 'Cancelada' | 'Expirada' | 'Erro';

export interface CampanhaContato {
  clienteId: string;
  nome: string;
  telefone: number;
  selecionado: boolean;
  status: 'Ativo' | 'Inativo';
}

export interface CampanhaEnvio {
  contatoId: string;
  telefone: number;
  status: 'Pendente' | 'Enviado' | 'Erro';
  enviadoEm?: Timestamp;
  erro?: string;
}

export interface Campanha {
  id: string;
  businessId: string;
  nome: string;
  tipo: CampanhaTipo;
  mensagem?: string; // Para tipo texto
  mediaUrl?: string; // Para tipo imagem, audio, video
  contatos: CampanhaContato[];
  totalContatos: number;
  contatosEnviados: number;
  status: CampanhaStatus;
  dataAgendamento: Timestamp;
  horaInicio: string; // Ex: "08:00"
  dataInicioExecucao?: Timestamp; // Quando começou a executar
  dataConclusao?: Timestamp; // Quando terminou
  tempoEstimadoConclusao?: string; // Ex: "2h 30min"
  instanciaWhatsapp: string;
  tokenInstancia: string;
  envios: CampanhaEnvio[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  canceledAt?: Timestamp;
  erro?: string; // Erro geral da campanha
}
