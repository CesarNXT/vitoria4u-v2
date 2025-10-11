

import { getBusinessConfig } from './firestore';
import { startOfDay, endOfDay, addMinutes, format, getDay, isWithinInterval } from 'date-fns';
import type { ConfiguracoesNegocio, Agendamento, Profissional, Servico, HorarioTrabalho, HorarioSlot, DataBloqueada } from '@/lib/types';


interface TimeSlot {
  time: string;
  available: boolean;
}

interface GetAvailableTimesParams {
  businessId: string;
  date: Date;
  serviceDuration: number;
  professional: Profissional;
  appointments: Agendamento[];
  blockedDates: DataBloqueada[];
}

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


export async function getAvailableTimes({
  businessId,
  date,
  serviceDuration,
  professional,
  appointments,
  blockedDates,
}: GetAvailableTimesParams): Promise<string[]> {
    
  const businessConfig = await getBusinessConfig(businessId);

  if (!businessConfig) {
    throw new Error('Business configuration not found.');
  }

  const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
  const dayNames: (keyof HorarioTrabalho)[] = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const dayKey = dayNames[dayOfWeek];

  const businessSchedule = businessConfig.horariosFuncionamento[dayKey];
  const professionalSchedule = professional.workHours ? professional.workHours[dayKey] : null;

  if (!businessSchedule || !businessSchedule.enabled) {
      return [];
  }

  let effectiveWorkSlots: HorarioSlot[];

  if (professionalSchedule && professionalSchedule.enabled) {
      effectiveWorkSlots = businessSchedule.slots.flatMap(businessSlot => 
          professionalSchedule.slots.map(profSlot => getIntersection(businessSlot, profSlot))
      ).filter((slot): slot is HorarioSlot => slot !== null);
  } else {
      // If professional has no specific schedule for the day, but business is open,
      // we assume the professional follows the business hours.
      effectiveWorkSlots = businessSchedule.slots;
  }
  
  // If professional schedule is disabled for the day, no slots available.
  if(professionalSchedule && !professionalSchedule.enabled) {
      effectiveWorkSlots = [];
  }

  if (effectiveWorkSlots.length === 0) {
      return [];
  }
  
  const interval = 30; // Assuming businessConfig.slotInterval or a default

  const allTimes: string[] = [];

  for (const slot of effectiveWorkSlots) {
    let current = startOfDay(date);
    const [startHour, startMinute] = slot.start.split(':').map(Number);
    current.setHours(startHour, startMinute);

    let endSlotTime = startOfDay(date);
    const [endHour, endMinute] = slot.end.split(':').map(Number);
    endSlotTime.setHours(endHour, endMinute);

    while (current < endSlotTime) {
      const potentialTime = addMinutes(current,0);
      if (addMinutes(potentialTime, serviceDuration) <= endSlotTime) {
        allTimes.push(format(potentialTime, 'HH:mm'));
      }
      current = addMinutes(current, interval);
    }
  }
  
  const professionalAppointments = appointments.filter(
    (appt) => appt.profissional.id === professional.id && new Date(appt.date).toDateString() === date.toDateString() && appt.status === 'Agendado'
  );

  // Consider global blocked dates/times for the business
  const dayBlockedDates = blockedDates.filter(b => {
    const blockStart = new Date(b.startDate);
    const blockEnd = new Date(b.endDate);
    const checkDate = new Date(date);
    // Simple check if the dates overlap, more complex logic might be needed for multi-day blocks
    return checkDate >= startOfDay(blockStart) && checkDate <= endOfDay(blockEnd);
  });
  
  const busySlots = new Set<string>();

  professionalAppointments.forEach((appt) => {
    const apptDuration = appt.servico.duration;
    let current = new Date(`${format(date, 'yyyy-MM-dd')}T${appt.startTime}`);
    const endTime = addMinutes(current, apptDuration);

    while (current < endTime) {
        busySlots.add(format(current, 'HH:mm'));
        current = addMinutes(current, interval);
    }
  });

  dayBlockedDates.forEach((block) => {
    const blockStart = new Date(block.startDate);
    const blockEnd = new Date(block.endDate);
    
    // Create time strings for comparison
    const blockStartTime = format(blockStart, 'HH:mm');
    const blockEndTime = format(blockEnd, 'HH:mm');

    allTimes.forEach(time => {
        const slotTime = new Date(`${format(date, 'yyyy-MM-dd')}T${time}`);
        const slotEndTime = addMinutes(slotTime, serviceDuration);
        
        // Check for any overlap between the potential appointment and the block
        if(slotTime < blockEnd && slotEndTime > blockStart) {
            busySlots.add(time);
        }
    });
  });


  const availableTimes = allTimes.filter((time) => {
    if (busySlots.has(time)) {
      return false;
    }
    
    // Check if the entire duration of the service is free
    let current = new Date(`${format(date, 'yyyy-MM-dd')}T${time}`);
    const serviceEndTime = addMinutes(current, serviceDuration);
    
    // NOVO: Verificar se o horário já passou (para o dia atual)
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      // Se é hoje, verificar se o horário já passou
      if (current <= now) {
        return false; // Horário já passou
      }
    }
    
    let tempTime = new Date(current);
    while(tempTime < serviceEndTime) {
      if(busySlots.has(format(tempTime, 'HH:mm'))) {
        return false;
      }
      tempTime = addMinutes(tempTime, interval);
    }

    return true;
  });

  return availableTimes;
}
