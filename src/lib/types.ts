

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
  habilitarFeedback?: boolean;
  feedbackPlatform?: 'google' | 'instagram';
  feedbackLink?: string;
  habilitarEscalonamento?: boolean;
  numeroEscalonamento?: number | null;
  nomeIa?: string;
  instrucoesIa?: string;
  resumoEndereco?: string;
  resumoHorarios?: string;
  linkAgendamento?: string;
  email?: string;
  nextPlanId?: string | null;
  audit?: any;
  setupCompleted?: boolean; // Flag que indica se a configuração inicial obrigatória foi concluída
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
}

export interface Cliente {
  id: string;
  name: string;
  phone: number;
  status: 'Ativo' | 'Inativo';
  avatarUrl?: string;
  birthDate: Timestamp;
  instanciaWhatsapp?: string;
}

export type PlanFeature = 
  | 'lembrete_24h'
  | 'lembrete_2h'
  | 'feedback_pos_atendimento'
  | 'lembrete_aniversario'
  | 'lembrete_profissional'
  | 'disparo_de_mensagens'
  | 'retorno_manutencao'
  | 'notificacao_gestor_agendamento'
  | 'atendimento_whatsapp_ia'
  | 'atendimento_manual_ou_automatizado';

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
  reason: string;
  startDate: Timestamp;
  endDate: Timestamp;
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
}

export interface Profissional {
    id: string;
    name: string;
    phone: number;
    status: 'Ativo' | 'Inativo';
    avatarUrl?: string;
    workHours?: HorarioTrabalho;
    instanciaWhatsapp?: string;
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
