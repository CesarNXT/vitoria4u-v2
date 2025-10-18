import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ConfiguracoesNegocio, PlanFeature, Plano, HorarioSlot, Profissional, Servico, Agendamento, DataBloqueada, HorarioTrabalho } from "./types"
import { isFuture, differenceInDays, getDay, isWithinInterval as isWithinFnsInterval } from 'date-fns';

export function isAdminUser(email: string | null | undefined): boolean {
  if (!email) return false;
  
  // Pegar lista de emails admin da variável de ambiente
  const adminEmailsEnv = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
  
  // Se não tem nenhum email configurado, retorna false (não é admin)
  if (!adminEmailsEnv || adminEmailsEnv.trim() === '') {
    return false;
  }
  
  const adminEmails = adminEmailsEnv.split(',').map(e => e.trim()).filter(e => e.length > 0);
  
  // Se a lista está vazia, retorna false
  if (adminEmails.length === 0) {
    return false;
  }
  
  return adminEmails.includes(email.toLowerCase());
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertTimestamps(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Firestore Timestamp
  if (obj.toDate) {
    return obj.toDate();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      // Se é uma string ISO de data, converte para Date
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        newObj[key] = new Date(value);
      } else {
        newObj[key] = convertTimestamps(value);
      }
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
// A função hasFeatureAccess foi removida para dar lugar à checkFeatureAccess, que busca os dados do plano dinamicamente.

export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';

  // Ensure phone is a string before calling replace
  const phoneStr = String(phone);
  
  // Remove non-digit characters
  const cleaned = phoneStr.replace(/\D/g, '');
  
  // Remover DDI "55" APENAS se tiver 13 dígitos (DDI + DDD + número)
  // Se tiver 11 dígitos e começar com 55, é DDD de Santa Catarina, NÃO remover!
  let numberWithoutCountryCode = cleaned;
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    numberWithoutCountryCode = cleaned.substring(2); // Remove DDI 55
  } else if (cleaned.length === 12 && cleaned.startsWith('55')) {
    numberWithoutCountryCode = cleaned.substring(2); // Remove DDI 55 (fixo)
  }
  
  // Formatar 11 dígitos (DDD + 9 + número)
  if (numberWithoutCountryCode.length === 11) {
    const match = numberWithoutCountryCode.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  // Fallback: retornar o que foi digitado (sem formatação)
  return numberWithoutCountryCode; 
};


export const normalizePhoneNumber = (phone: string) => {
  if (!phone) return '';
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Se já tem 13 dígitos e começa com 55, retorna como está (DDI + DDD + celular)
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return cleaned;
  }
  
  // Se tem 12 dígitos e começa com 55, retorna como está (DDI + DDD + fixo)
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    return cleaned;
  }
  
  // Se tem 11 dígitos (DDD + celular), SEMPRE adiciona DDI 55 na frente
  // Exemplo: 55995207521 → 5555995207521 (13 dígitos)
  // Exemplo: 95995207521 → 5595995207521 (13 dígitos)
  if (cleaned.length === 11) {
    return `55${cleaned}`;
  }
  
  // Se tem 10 dígitos (DDD + fixo), SEMPRE adiciona DDI 55 na frente
  // Exemplo: 5595207521 → 555595207521 (12 dígitos)
  // Exemplo: 9532075210 → 559532075210 (12 dígitos)
  if (cleaned.length === 10) {
    return `55${cleaned}`;
  }

  // Fallback: adiciona 55 na frente para qualquer outro tamanho
  return `55${cleaned}`; 
}


export const capitalizeWords = (str: string) => {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
};

const timeToMinutes = (time: string): number => {
    const parts = time.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
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
  const dayKey = dayNames[dayOfWeek] as keyof HorarioTrabalho;

  const businessSchedule = businessSettings.horariosFuncionamento[dayKey];
  const professionalSchedule = professional.workHours ? professional.workHours[dayKey] : null;

  // Se o negócio está fechado nesse dia, não há horários.
  if (!businessSchedule || !businessSchedule.enabled) {
      return [];
  }

  // Determina os slots de trabalho efetivos do profissional.
  let effectiveWorkSlots: HorarioSlot[];

  if (professionalSchedule && professionalSchedule.enabled) {
      effectiveWorkSlots = businessSchedule.slots.flatMap((businessSlot: HorarioSlot) => 
          professionalSchedule.slots.map((profSlot: HorarioSlot) => getIntersection(businessSlot, profSlot))
      ).filter((slot: HorarioSlot | null): slot is HorarioSlot => slot !== null);
  } else {
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
      const timeParts = time.split(':').map(Number);
      const hours = timeParts[0] || 0;
      const minutes = timeParts[1] || 0;
      const timeDate = new Date(date);
      timeDate.setHours(hours, minutes, 0, 0);
      
      if (timeDate <= now) {
        return false;
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

/**
 * Formata o preço de um serviço baseado no tipo de precificação
 * @param price - Valor do serviço
 * @param priceType - Tipo de precificação ('fixed', 'on_request', 'starting_from')
 * @returns String formatada com o preço
 */
export const formatServicePrice = (price: number, priceType: 'fixed' | 'on_request' | 'starting_from' = 'fixed'): string => {
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);

  switch (priceType) {
    case 'on_request':
      return 'Sob orçamento';
    case 'starting_from':
      return `A partir de ${formattedPrice}`;
    case 'fixed':
    default:
      return formattedPrice;
  }
}
