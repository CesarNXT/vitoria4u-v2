import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ConfiguracoesNegocio, PlanFeature, Plano, HorarioSlot, Profissional, Servico, Agendamento, DataBloqueada, HorarioTrabalho } from "./types"
import { isFuture, differenceInDays, getDay, isWithinInterval as isWithinFnsInterval } from 'date-fns';

export function isAdminUser(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim());
  return adminEmails.includes(email);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertTimestamps(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj.toDate) { // Check if it's a Firestore Timestamp
    return obj.toDate();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = convertTimestamps(obj[key]);
    }
  }
  return newObj;
}

export type AccessStatus = 'pago' | 'ativo' | 'expirado' | 'pendente' | 'cancelado';
export type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline';


export const getAccessStatus = (settings: ConfiguracoesNegocio): { text: string; variant: StatusVariant } => {
    const hasActivePlan = settings?.access_expires_at ? isFuture(new Date(settings.access_expires_at)) : false;

    if (!hasActivePlan) {
        return { text: 'Expirado', variant: 'destructive' };
    }

    // Since it's all manual, if the access is not expired, we consider it 'Active'.
    // The "Pago" status could be used if you manually set a flag after payment, but "Ativo" is clearer for manual management.
    return { text: 'Ativo', variant: 'default' };
};


export const getSubscriptionStatus = (status: 'authorized' | 'cancelled' | 'paused' | 'pending'): { text: string; variant: 'default' | 'secondary' | 'destructive' } => {
  switch (status) {
    case 'authorized':
      return { text: 'Ativa', variant: 'default' };
    case 'cancelled':
      return { text: 'Cancelada', variant: 'destructive' };
    case 'paused':
      return { text: 'Pausada', variant: 'secondary' };
    case 'pending':
        return { text: 'Pendente', variant: 'secondary' };
    default:
      return { text: 'Desconhecido', variant: 'secondary' };
  }
};

/**
 * Features disponíveis no Plano Gratuito / Expirado
 * Funcionalidades básicas que continuam funcionando mesmo sem plano pago
 */
export const FREE_PLAN_FEATURES: PlanFeature[] = [
  'notificacao_gestor_agendamento', // Aviso de agendamento/cancelamento via WhatsApp
];

/**
 * Features que exigem acesso básico (sempre disponíveis)
 * Essas não são "features de plano", são funcionalidades core do sistema
 */
export const CORE_FEATURES = {
  agendamentos: true,
  clientes: true,
  servicos: true,
  profissionais: true,
  dashboard: true,
  configuracoes: true,
};

/**
 * Verifica se um negócio tem acesso a uma funcionalidade específica baseado no plano
 * 
 * Lógica:
 * 1. Se plano expirado → verifica features do plano_gratis (funcionalidades básicas)
 * 2. Se plano ativo → verifica campos de habilitação do negócio
 * 
 * IMPORTANTE: Para features dinâmicas (do Firestore), use hasFeatureAccessAsync
 */
export const hasFeatureAccess = (
  business: ConfiguracoesNegocio | null | undefined,
  feature: PlanFeature
): boolean => {
  if (!business) return false;
  
  // Verificar se o plano está ativo (não expirado)
  const hasValidAccess = business.access_expires_at ? isFuture(new Date(business.access_expires_at)) : false;
  const planName = business.planId || '';
  
  // Se plano expirado ou é plano_gratis, usar apenas features básicas
  if (!hasValidAccess || planName === 'plano_gratis') {
    // Features disponíveis no plano gratuito/expirado
    const freePlanFeatures: PlanFeature[] = [
      'notificacao_gestor_agendamento', // Webhook via número oficial Vitoria
    ];
    return freePlanFeatures.includes(feature);
  }
  
  // Plano ativo: verificar campos de habilitação
  const featureMap: Record<PlanFeature, boolean | undefined> = {
    'lembrete_24h': business.habilitarLembrete24h,
    'lembrete_2h': business.habilitarLembrete2h,
    'feedback_pos_atendimento': business.habilitarFeedback,
    'lembrete_aniversario': false, // TODO: adicionar campo no type
    'lembrete_profissional': false, // TODO: adicionar campo no type
    'disparo_de_mensagens': false, // Verificado via planId (abaixo)
    'retorno_manutencao': false, // TODO: adicionar campo no type
    'notificacao_gestor_agendamento': true, // Sempre disponível em planos ativos
    'atendimento_whatsapp_ia': false, // TODO: adicionar campo no type
    'atendimento_manual_ou_automatizado': false, // TODO: adicionar campo no type
  };
  
  // Se o campo de habilitação existe e está true, usa ele
  const featureEnabled = featureMap[feature];
  if (featureEnabled === true) {
    return true;
  }
  
  // Fallback: verificar por nome do plano (HARDCODED - compatibilidade temporária)
  // Disparo de mensagens só em planos Profissional e Premium
  if (feature === 'disparo_de_mensagens') {
    return planName === 'Plano Profissional' || planName === 'Plano Premium';
  }
  
  return false;
};

export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';

  // Ensure phone is a string before calling replace
  const phoneStr = String(phone);
  
  // Remove "55" prefix and any non-digit characters
  const cleaned = phoneStr.replace(/\D/g, '');
  const numberWithoutCountryCode = cleaned.startsWith('55') ? cleaned.substring(2) : cleaned;
  
  // Now format the remaining 11 or 10 digits
  if (numberWithoutCountryCode.length === 11) {
    const match = numberWithoutCountryCode.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  if (numberWithoutCountryCode.length === 10) {
    const match = numberWithoutCountryCode.match(/^(\d{2})(\d{4})(\d{4})$/);
    if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  // Fallback for incomplete numbers or other formats
  return numberWithoutCountryCode; 
};


export const normalizePhoneNumber = (phone: string) => {
  if (!phone) return '';
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it already starts with 55 and is the correct length (13 digits), return it
  if (cleaned.startsWith('55') && cleaned.length === 13) {
    return cleaned;
  }
  
  // If it's 11 digits (DDD + number), prepend 55
  if (cleaned.length === 11) {
    return `55${cleaned}`;
  }
  
  // If it's 10 digits (DDD without 9 + number), prepend 55
  // This is less common now but good to handle
  if (cleaned.length === 10) {
    return `55${cleaned}`;
  }

  // Fallback for other formats, though they are less likely
  return `55${cleaned}`; 
}


export const capitalizeWords = (str: string) => {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
};

// Helper para converter string 'HH:mm' para minutos totais
const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

// Helper para converter minutos totais para string 'HH:mm'
const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
};

// Helper para encontrar a interseção de dois intervalos de tempo
const getIntersection = (slot1: HorarioSlot, slot2: HorarioSlot): HorarioSlot | null => {
    const start1 = timeToMinutes(slot1.start);
    const end1 = timeToMinutes(slot1.end);
    const start2 = timeToMinutes(slot2.start);
    const end2 = timeToMinutes(slot2.end);

    const intersectionStart = Math.max(start1, start2);
    const intersectionEnd = Math.min(end1, end2);

    if (intersectionStart < intersectionEnd) {
        return {
            start: minutesToTime(intersectionStart),
            end: minutesToTime(intersectionEnd),
        };
    }
    return null;
};


export const calculateAvailableTimesForDate = (
  date: Date,
  professional: Profissional,
  service: Servico,
  allAppointments: Agendamento[],
  businessSettings: ConfiguracoesNegocio,
  blockedDates: DataBloqueada[]
): string[] => {
  const dayOfWeek = getDay(date);
  const dayNames: (keyof HorarioTrabalho)[] = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const dayKey = dayNames[dayOfWeek];

  const businessSchedule = businessSettings.horariosFuncionamento[dayKey];
  const professionalSchedule = professional.workHours ? professional.workHours[dayKey] : null;

  // Se o negócio está fechado nesse dia, não há horários.
  if (!businessSchedule || !businessSchedule.enabled) {
      return [];
  }

  // Determina os slots de trabalho efetivos do profissional.
  let effectiveWorkSlots: HorarioSlot[];

  // Se o profissional tem horário customizado e está habilitado para o dia...
  if (professionalSchedule && professionalSchedule.enabled) {
      // Calcula a interseção entre o horário do negócio e o do profissional.
      effectiveWorkSlots = businessSchedule.slots.flatMap(businessSlot => 
          professionalSchedule.slots.map(profSlot => getIntersection(businessSlot, profSlot))
      ).filter((slot): slot is HorarioSlot => slot !== null);
  } else {
      // Caso contrário, usa o horário do negócio como padrão.
      effectiveWorkSlots = businessSchedule.slots;
  }

  if (effectiveWorkSlots.length === 0) {
      return [];
  }

  const serviceDuration = service.duration;
  const timeSlots: string[] = [];
  const appointmentInterval = 30; // Intervalo de 30 em 30 minutos para novos agendamentos

  for (const slot of effectiveWorkSlots) {
    let current = timeToMinutes(slot.start);
    const end = timeToMinutes(slot.end);

    while (current + serviceDuration <= end) {
      timeSlots.push(minutesToTime(current));
      current += appointmentInterval;
    }
  }
  
  const appointmentsForDay = allAppointments.filter(
    (appt) => new Date(appt.date).toDateString() === date.toDateString() && appt.profissional.id === professional.id && appt.status === 'Agendado'
  );

  // Usa um Set para performance
  const blockedMinutes = new Set<number>();

  // Adiciona horários de agendamentos existentes
  for (const appt of appointmentsForDay) {
    const start = timeToMinutes(appt.startTime);
    const end = start + (appt.servico.duration || serviceDuration);
    for (let i = start; i < end; i++) {
      blockedMinutes.add(i);
    }
  }

  // Adiciona horários de bloqueios globais
  for (const block of blockedDates) {
    const blockStart = new Date(block.startDate);
    const blockEnd = new Date(block.endDate);
    
    if (isWithinFnsInterval(date, { start: blockStart, end: blockEnd })) {
        const start = timeToMinutes(blockStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        const end = timeToMinutes(blockEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        for (let i = start; i < end; i++) {
            blockedMinutes.add(i);
        }
    }
  }

  return timeSlots.filter(time => {
    const start = timeToMinutes(time);
    const end = start + serviceDuration;
    
    // NOVO: Verificar se o horário já passou (para o dia atual)
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      // Se é hoje, verificar se o horário já passou
      const [hours, minutes] = time.split(':').map(Number);
      const timeDate = new Date(date);
      timeDate.setHours(hours, minutes, 0, 0);
      
      if (timeDate <= now) {
        return false; // Horário já passou
      }
    }
    
    // Verifica se algum minuto dentro do slot do serviço está bloqueado
    for (let i = start; i < end; i++) {
        if (blockedMinutes.has(i)) {
            return false;
        }
    }
    return true;
  });
}
