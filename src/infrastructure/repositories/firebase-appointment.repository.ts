/**
 * 🔥 Firebase Appointment Repository - IMPLEMENTAÇÃO REAL
 * Implementação concreta do repositório usando Firebase
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Appointment } from '@/core/entities/appointment';
import { DateTime } from '@/core/value-objects/date-time';
import { AppointmentRepository } from '@/core/use-cases/create-appointment.use-case';

export class FirebaseAppointmentRepository implements AppointmentRepository {
  private readonly collectionName = 'agendamentos';
  private readonly firestore;

  constructor() {
    const firebase = initializeFirebase();
    this.firestore = firebase.firestore;
  }

  async generateId(): Promise<string> {
    const docRef = doc(collection(this.firestore, this.collectionName));
    return docRef.id;
  }

  async save(appointment: Appointment, businessId: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, appointment.id.toString());
      const data = {
        ...appointment.toFirestore(),
        businessId
      };
      
      await setDoc(docRef, data);
    } catch (error) {
      throw new Error(`Erro ao salvar agendamento: ${error}`);
    }
  }

  async findConflicts(
    professionalId: string,
    dateTime: DateTime,
    duration: number,
    businessId: string,
    excludeId?: string
  ): Promise<Appointment[]> {
    try {
      const startTime = dateTime;
      const endTime = dateTime.addMinutes(duration);

      // Buscar agendamentos do profissional no mesmo dia
      const dayStart = dateTime.startOfDay();
      const dayEnd = dateTime.endOfDay();

      const q = query(
        collection(this.firestore, this.collectionName),
        where('businessId', '==', businessId),
        where('profissional.id', '==', professionalId),
        where('date', '>=', dayStart.toTimestamp()),
        where('date', '<=', dayEnd.toTimestamp()),
        where('status', 'in', ['Agendado', 'Confirmado'])
      );

      const querySnapshot = await getDocs(q);
      const conflicts: Appointment[] = [];

      for (const docSnap of querySnapshot.docs) {
        // Pular se for o mesmo agendamento (para edição)
        if (excludeId && docSnap.id === excludeId) {
          continue;
        }

        try {
          const appointment = Appointment.fromFirestore(docSnap.id, docSnap.data());
          const appointmentStart = appointment.dateTime;
          const appointmentEnd = appointment.getEndTime();

          // Verificar sobreposição de horários
          if (
            (startTime.isBefore(appointmentEnd) && endTime.isAfter(appointmentStart)) ||
            (appointmentStart.isBefore(endTime) && appointmentEnd.isAfter(startTime))
          ) {
            conflicts.push(appointment);
          }
        } catch (error) {
          console.error(`Erro ao processar agendamento ${docSnap.id}:`, error);
        }
      }

      return conflicts;
    } catch (error) {
      throw new Error(`Erro ao verificar conflitos: ${error}`);
    }
  }

  async findById(id: string, businessId: string): Promise<Appointment | null> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      
      // Verificar se pertence ao negócio
      if (data.businessId !== businessId) {
        return null;
      }

      return Appointment.fromFirestore(docSnap.id, data);
    } catch (error) {
      throw new Error(`Erro ao buscar agendamento: ${error}`);
    }
  }

  async findByBusinessId(businessId: string): Promise<Appointment[]> {
    try {
      const q = query(
        collection(this.firestore, this.collectionName),
        where('businessId', '==', businessId),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      querySnapshot.forEach((doc) => {
        try {
          const appointment = Appointment.fromFirestore(doc.id, doc.data());
          appointments.push(appointment);
        } catch (error) {
          console.error(`Erro ao converter agendamento ${doc.id}:`, error);
        }
      });

      return appointments;
    } catch (error) {
      throw new Error(`Erro ao buscar agendamentos: ${error}`);
    }
  }

  async findByDateRange(
    startDate: DateTime,
    endDate: DateTime,
    businessId: string
  ): Promise<Appointment[]> {
    try {
      const q = query(
        collection(this.firestore, this.collectionName),
        where('businessId', '==', businessId),
        where('date', '>=', startDate.toTimestamp()),
        where('date', '<=', endDate.toTimestamp()),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      querySnapshot.forEach((doc) => {
        try {
          const appointment = Appointment.fromFirestore(doc.id, doc.data());
          appointments.push(appointment);
        } catch (error) {
          console.error(`Erro ao converter agendamento ${doc.id}:`, error);
        }
      });

      return appointments;
    } catch (error) {
      throw new Error(`Erro ao buscar agendamentos por data: ${error}`);
    }
  }

  async findTodayAppointments(businessId: string): Promise<Appointment[]> {
    const today = DateTime.nowInBrazil().startOfDay();
    const tomorrow = today.addDays(1);
    
    return this.findByDateRange(today, tomorrow, businessId);
  }

  async findUpcomingAppointments(businessId: string, days: number = 7): Promise<Appointment[]> {
    const now = DateTime.nowInBrazil();
    const futureDate = now.addDays(days);
    
    return this.findByDateRange(now, futureDate, businessId);
  }
}
