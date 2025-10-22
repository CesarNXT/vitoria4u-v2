import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ConfiguracoesNegocio, PlanFeature, Plano, HorarioSlot, Profissional, Servico, Agendamento, DataBloqueada, HorarioTrabalho } from "./types"
import { DateTime } from "@/core/value-objects/date-time"
import { Phone } from "@/core/value-objects/phone"
import { Money } from "@/core/value-objects/money"

/**
 * ✅ FUNÇÃO SEGURA: Verifica se usuário tem custom claim de admin
 * Esta função APENAS verifica o token JWT local - servidor ainda valida
 * Use esta para UI (mostrar/esconder elementos admin)
 * 
 * @param user - Firebase User object
 * @returns Promise<boolean> se é admin baseado em custom claims
 */
export async function isAdminUser(user: any): Promise<boolean> {
  if (!user) return false;
  
  try {
    // Verificar custom claim do token JWT
    const idTokenResult = await user.getIdTokenResult();
    return idTokenResult.claims.admin === true;
  } catch {
    return false;
  }
}

/**
 * ⚠️ DEPRECADO: Verificação por email (INSEGURO)
 * Mantido apenas para compatibilidade com código legado
 * Use isAdminUser() com o objeto user do Firebase
 */
export function isAdminUserByEmail(email: string | null | undefined): boolean {
  // Sempre retorna false - use isAdminUser() com token JWT
  return false;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ✅ REFATORADO: Converte dados do Firestore usando DateTime
 * Substitui a gambiarra anterior que misturava Date e Timestamp
 */
export function convertTimestamps(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Usar DateTime value object para conversão padronizada
  if (obj.toDate || typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
    try {
      return DateTime.fromFirestoreData(obj).toDate();
    } catch {
      return obj;
    }
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


/**
 * ✅ REFATORADO: Usa DateTime para verificar status
 */
export const getAccessStatus = (settings: ConfiguracoesNegocio): { text: string; variant: StatusVariant } => {
    if (!settings?.access_expires_at) {
        return { text: 'Expirado', variant: 'destructive' };
    }

    try {
        const expirationDate = DateTime.fromFirestoreData(settings.access_expires_at);
        const hasActivePlan = expirationDate.isFuture();

        if (!hasActivePlan) {
            return { text: 'Expirado', variant: 'destructive' };
        }

        return { text: 'Ativo', variant: 'default' };
    } catch {
        return { text: 'Expirado', variant: 'destructive' };
    }
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

/**
 * ✅ REFATORADO: Usa Phone value object
 * Substitui TODA a gambiarra de formatação de telefone
 */
export const formatPhoneNumber = (phone: string | number | null | undefined): string => {
  if (!phone) return '';
  
  try {
    return Phone.create(phone).format();
  } catch {
    // Fallback para valores inválidos
    return String(phone);
  }
};


/**
 * ✅ REFATORADO: Usa Phone value object para normalização
 */
export const normalizePhoneNumber = (phone: string | number): string => {
  if (!phone) return '';
  
  try {
    return Phone.create(phone).formatForWhatsApp();
  } catch {
    // Fallback para valores inválidos
    const cleaned = String(phone).replace(/\D/g, '');
    return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  }
};


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


/**
 * ✅ REFATORADO: Usa DateTime para cálculos de disponibilidade
 */
export const calculateAvailableTimesForDate = (
  date: Date,
  professional: Profissional,
  service: Servico,
  allAppointments: Agendamento[],
  businessSettings: ConfiguracoesNegocio,
  blockedDates: DataBloqueada[]
): string[] => {
  const dateTime = DateTime.fromDate(date);
  const dayOfWeek = dateTime.getWeekday();
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
  
  const appointmentsForDay = allAppointments.filter((appt) => {
    try {
      const apptDate = DateTime.fromFirestoreData(appt.date);
      return apptDate.isSameDay(dateTime) && 
             appt.profissional.id === professional.id && 
             appt.status === 'Agendado';
    } catch {
      return false;
    }
  });

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
    try {
      const blockStart = DateTime.fromFirestoreData(block.startDate);
      const blockEnd = DateTime.fromFirestoreData(block.endDate);
      
      // Verifica se a data está dentro do período bloqueado
      if (dateTime.isAfter(blockStart.startOfDay()) && dateTime.isBefore(blockEnd.endOfDay())) {
        const start = timeToMinutes(blockStart.formatTime());
        const end = timeToMinutes(blockEnd.formatTime());
        for (let i = start; i < end; i++) {
          blockedMinutes.add(i);
        }
      }
    } catch {
      // Ignora bloqueios com datas inválidas
      continue;
    }
  }

  return timeSlots.filter(time => {
    const start = timeToMinutes(time);
    const end = start + serviceDuration;
    
    // Verificar se o horário já passou (para o dia atual)
    if (dateTime.isToday()) {
      const timeParts = time.split(':').map(Number);
      const hours = timeParts[0] || 0;
      const minutes = timeParts[1] || 0;
      const timeSlot = dateTime.startOfDay().addHours(hours).addMinutes(minutes);
      
      if (timeSlot.isPast()) {
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
 * ✅ REFATORADO: Usa Money value object para formatação
 */
export const formatServicePrice = (price: number, priceType: 'fixed' | 'on_request' | 'starting_from' = 'fixed'): string => {
  try {
    const money = Money.create(price);
    const formattedPrice = money.format();

    switch (priceType) {
      case 'on_request':
        return 'Sob orçamento';
      case 'starting_from':
        return `A partir de ${formattedPrice}`;
      case 'fixed':
      default:
        return formattedPrice;
    }
  } catch {
    // Fallback para valores inválidos
    return 'Valor inválido';
  }
}

/**
 * ✅ Função compatível para gerar UUID (funciona em todos os navegadores)
 * Tenta usar crypto.randomUUID() se disponível, caso contrário gera UUID v4
 * 
 * @returns UUID string (formato: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 */
export function generateUUID(): string {
  // Tenta usar crypto.randomUUID se disponível (navegadores modernos)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Se falhar, usa fallback
    }
  }
  
  // Fallback: gera UUID v4 compatível com todos os navegadores
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
