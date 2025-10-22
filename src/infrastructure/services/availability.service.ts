/**
 * 📅 Availability Service - IMPLEMENTAÇÃO REAL
 * Serviço para verificar disponibilidade de horários
 */

import {
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { DateTime } from '@/core/value-objects/date-time';
import { AvailabilityService } from '@/core/use-cases/create-appointment.use-case';

export class FirebaseAvailabilityService implements AvailabilityService {
  private readonly firestore;

  constructor() {
    const firebase = initializeFirebase();
    this.firestore = firebase.firestore;
  }

  async isTimeSlotAvailable(
    professionalId: string,
    dateTime: DateTime,
    duration: number,
    businessId: string
  ): Promise<{ available: boolean; reason?: string }> {
    try {
      // 1. Verificar se é horário comercial
      const businessHoursCheck = this.checkBusinessHours(dateTime);
      if (!businessHoursCheck.available) {
        return businessHoursCheck;
      }

      // 2. Verificar horário de trabalho do profissional
      const professionalHoursCheck = await this.checkProfessionalHours(
        professionalId,
        dateTime,
        businessId
      );
      if (!professionalHoursCheck.available) {
        return professionalHoursCheck;
      }

      // 3. Verificar se não há agendamentos conflitantes
      const conflictCheck = await this.checkAppointmentConflicts(
        professionalId,
        dateTime,
        duration,
        businessId
      );
      if (!conflictCheck.available) {
        return conflictCheck;
      }

      return { available: true };

    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      return {
        available: false,
        reason: 'Erro ao verificar disponibilidade'
      };
    }
  }

  async isDateBlocked(
    dateTime: DateTime,
    businessId: string
  ): Promise<{ blocked: boolean; reason?: string }> {
    try {
      const q = query(
        collection(this.firestore, 'datasBloqueadas'),
        where('businessId', '==', businessId)
      );

      const querySnapshot = await getDocs(q);

      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        
        try {
          const blockStart = DateTime.fromFirestoreData(data.startDate);
          const blockEnd = DateTime.fromFirestoreData(data.endDate);

          // Verificar se a data está dentro do período bloqueado
          if (dateTime.isAfter(blockStart.startOfDay()) && 
              dateTime.isBefore(blockEnd.endOfDay())) {
            return {
              blocked: true,
              reason: data.reason || 'Data bloqueada para agendamentos'
            };
          }
        } catch (error) {
          console.error(`Erro ao processar bloqueio ${doc.id}:`, error);
        }
      }

      return { blocked: false };

    } catch (error) {
      console.error('Erro ao verificar bloqueios:', error);
      return {
        blocked: false // Em caso de erro, não bloqueia
      };
    }
  }

  // ✅ Verificar horário comercial
  private checkBusinessHours(dateTime: DateTime): { available: boolean; reason?: string } {
    const hour = dateTime.toDate().getHours();
    const dayOfWeek = dateTime.getWeekday();

    // Não funciona aos domingos
    if (dayOfWeek === 0) {
      return {
        available: false,
        reason: 'Não funcionamos aos domingos'
      };
    }

    // Horário comercial: 8h às 18h
    if (hour < 8 || hour >= 18) {
      return {
        available: false,
        reason: 'Fora do horário de funcionamento (8h às 18h)'
      };
    }

    return { available: true };
  }

  // ✅ Verificar horário de trabalho do profissional
  private async checkProfessionalHours(
    professionalId: string,
    dateTime: DateTime,
    businessId: string
  ): Promise<{ available: boolean; reason?: string }> {
    try {
      // Buscar dados do profissional
      const professionalDoc = await this.firestore
        .collection('profissionais')
        .doc(professionalId)
        .get();

      if (!professionalDoc.exists) {
        return {
          available: false,
          reason: 'Profissional não encontrado'
        };
      }

      const professionalData = professionalDoc.data();
      
      // Se não tem horário definido, assume que trabalha no horário comercial
      if (!professionalData?.workHours) {
        return { available: true };
      }

      const dayOfWeek = dateTime.getWeekday();
      const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      const dayKey = dayNames[dayOfWeek];
      const daySchedule = professionalData.workHours[dayKey];

      // Se não trabalha neste dia
      if (!daySchedule?.enabled || !daySchedule?.slots?.length) {
        return {
          available: false,
          reason: `Profissional não trabalha às ${dayNames[dayOfWeek]}s`
        };
      }

      // Verificar se o horário está dentro dos slots de trabalho
      const requestedTime = dateTime.formatTime();
      const isWithinWorkHours = daySchedule.slots.some((slot: any) => {
        return requestedTime >= slot.start && requestedTime < slot.end;
      });

      if (!isWithinWorkHours) {
        return {
          available: false,
          reason: 'Fora do horário de trabalho do profissional'
        };
      }

      return { available: true };

    } catch (error) {
      console.error('Erro ao verificar horário do profissional:', error);
      return { available: true }; // Em caso de erro, não bloqueia
    }
  }

  // ✅ Verificar conflitos de agendamento
  private async checkAppointmentConflicts(
    professionalId: string,
    dateTime: DateTime,
    duration: number,
    businessId: string
  ): Promise<{ available: boolean; reason?: string }> {
    try {
      const startTime = dateTime;
      const endTime = dateTime.addMinutes(duration);

      // Buscar agendamentos do profissional no mesmo dia
      const dayStart = dateTime.startOfDay();
      const dayEnd = dateTime.endOfDay();

      const q = query(
        collection(this.firestore, 'agendamentos'),
        where('businessId', '==', businessId),
        where('profissional.id', '==', professionalId),
        where('date', '>=', dayStart.toTimestamp()),
        where('date', '<=', dayEnd.toTimestamp()),
        where('status', 'in', ['Agendado', 'Confirmado', 'Em Andamento'])
      );

      const querySnapshot = await getDocs(q);

      for (const doc of querySnapshot.docs) {
        try {
          const appointmentData = doc.data();
          const appointmentStart = DateTime.fromFirestoreData(appointmentData.date);
          const appointmentDuration = appointmentData.servico?.duration || 60;
          const appointmentEnd = appointmentStart.addMinutes(appointmentDuration);

          // Verificar sobreposição
          if (
            (startTime.isBefore(appointmentEnd) && endTime.isAfter(appointmentStart)) ||
            (appointmentStart.isBefore(endTime) && appointmentEnd.isAfter(startTime))
          ) {
            return {
              available: false,
              reason: 'Já existe um agendamento neste horário'
            };
          }
        } catch (error) {
          console.error(`Erro ao processar agendamento ${doc.id}:`, error);
        }
      }

      return { available: true };

    } catch (error) {
      console.error('Erro ao verificar conflitos:', error);
      return { available: true }; // Em caso de erro, não bloqueia
    }
  }

  // ✅ Método auxiliar para buscar horários disponíveis
  async getAvailableSlots(
    professionalId: string,
    date: DateTime,
    serviceDuration: number,
    businessId: string,
    intervalMinutes: number = 30
  ): Promise<string[]> {
    const availableSlots: string[] = [];
    
    // Gerar slots de 30 em 30 minutos das 8h às 18h
    let currentTime = date.startOfDay().addHours(8);
    const endTime = date.startOfDay().addHours(18);

    while (currentTime.isBefore(endTime)) {
      const slotCheck = await this.isTimeSlotAvailable(
        professionalId,
        currentTime,
        serviceDuration,
        businessId
      );

      if (slotCheck.available) {
        availableSlots.push(currentTime.formatTime());
      }

      currentTime = currentTime.addMinutes(intervalMinutes);
    }

    return availableSlots;
  }
}
