/**
 * 📅 Appointment Entity - IMPLEMENTAÇÃO REAL
 * Entidade de domínio rica com toda lógica de negócio
 */

import { DateTime } from '../value-objects/date-time';
import { Phone } from '../value-objects/phone';
import { Money } from '../value-objects/money';

// ✅ Value Objects para IDs tipados
export class AppointmentId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('AppointmentId cannot be empty');
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: AppointmentId): boolean {
    return this.value === other.value;
  }
}

export class ClientId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ClientId cannot be empty');
    }
  }

  toString(): string {
    return this.value;
  }
}

export class ServiceId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ServiceId cannot be empty');
    }
  }

  toString(): string {
    return this.value;
  }
}

export class ProfessionalId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ProfessionalId cannot be empty');
    }
  }

  toString(): string {
    return this.value;
  }
}

// ✅ Value Object para Duração
export class Duration {
  constructor(public readonly minutes: number) {
    if (minutes <= 0) {
      throw new Error('Duration must be positive');
    }
    if (minutes > 480) { // 8 horas máximo
      throw new Error('Duration cannot exceed 8 hours');
    }
  }

  toHours(): number {
    return this.minutes / 60;
  }

  toString(): string {
    const hours = Math.floor(this.minutes / 60);
    const mins = this.minutes % 60;
    
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  }

  equals(other: Duration): boolean {
    return this.minutes === other.minutes;
  }
}

// ✅ Enum para Status do Agendamento
export enum AppointmentStatus {
  SCHEDULED = 'Agendado',
  CONFIRMED = 'Confirmado', 
  IN_PROGRESS = 'Em Andamento',
  COMPLETED = 'Finalizado',
  CANCELLED = 'Cancelado',
  NO_SHOW = 'Não Compareceu'
}

// ✅ Interfaces para referências
export interface ClientReference {
  id: ClientId;
  name: string;
  phone: Phone;
  email?: string;
  birthDate?: DateTime;
}

export interface ServiceReference {
  id: ServiceId;
  name: string;
  duration: Duration;
  price: Money;
  description?: string;
}

export interface ProfessionalReference {
  id: ProfessionalId;
  name: string;
  phone?: Phone;
}

// ✅ Entidade Principal - Appointment
export class Appointment {
  constructor(
    public readonly id: AppointmentId,
    public readonly client: ClientReference,
    public readonly service: ServiceReference,
    public readonly professional: ProfessionalReference,
    public readonly dateTime: DateTime,
    public readonly status: AppointmentStatus,
    public readonly notes?: string,
    public readonly createdAt: DateTime = DateTime.now(),
    public readonly updatedAt: DateTime = DateTime.now(),
    public readonly cancelledAt?: DateTime,
    public readonly cancelReason?: string
  ) {
    this.validateAppointment();
  }

  // ✅ Factory Methods
  static create(data: {
    id: string;
    clientId: string;
    clientName: string;
    clientPhone: string | number;
    clientEmail?: string;
    clientBirthDate?: any;
    serviceId: string;
    serviceName: string;
    serviceDuration: number;
    servicePrice: number;
    professionalId: string;
    professionalName: string;
    professionalPhone?: string | number;
    dateTime: DateTime;
    notes?: string;
  }): Appointment {
    return new Appointment(
      new AppointmentId(data.id),
      {
        id: new ClientId(data.clientId),
        name: data.clientName,
        phone: Phone.create(data.clientPhone),
        email: data.clientEmail,
        birthDate: data.clientBirthDate ? DateTime.fromFirestoreData(data.clientBirthDate) : undefined
      },
      {
        id: new ServiceId(data.serviceId),
        name: data.serviceName,
        duration: new Duration(data.serviceDuration),
        price: Money.create(data.servicePrice)
      },
      {
        id: new ProfessionalId(data.professionalId),
        name: data.professionalName,
        phone: data.professionalPhone ? Phone.create(data.professionalPhone) : undefined
      },
      data.dateTime,
      AppointmentStatus.SCHEDULED,
      data.notes
    );
  }

  static fromFirestore(id: string, data: any): Appointment {
    return new Appointment(
      new AppointmentId(id),
      {
        id: new ClientId(data.cliente?.id || data.clienteId),
        name: data.cliente?.name || 'Cliente',
        phone: Phone.create(data.cliente?.phone || ''),
        email: data.cliente?.email,
        birthDate: data.cliente?.birthDate ? DateTime.fromFirestoreData(data.cliente.birthDate) : undefined
      },
      {
        id: new ServiceId(data.servico?.id || data.servicoId),
        name: data.servico?.name || 'Serviço',
        duration: new Duration(data.servico?.duration || 60),
        price: Money.create(data.servico?.price || 0)
      },
      {
        id: new ProfessionalId(data.profissional?.id || data.profissionalId),
        name: data.profissional?.name || 'Profissional',
        phone: data.profissional?.phone ? Phone.create(data.profissional.phone) : undefined
      },
      DateTime.fromFirestoreData(data.date),
      data.status as AppointmentStatus || AppointmentStatus.SCHEDULED,
      data.notes,
      data.createdAt ? DateTime.fromFirestoreData(data.createdAt) : DateTime.now(),
      data.updatedAt ? DateTime.fromFirestoreData(data.updatedAt) : DateTime.now(),
      data.cancelledAt ? DateTime.fromFirestoreData(data.cancelledAt) : undefined,
      data.cancelReason
    );
  }

  // ✅ Business Logic Methods
  canBeCancelled(): boolean {
    if (this.status === AppointmentStatus.CANCELLED) return false;
    if (this.status === AppointmentStatus.COMPLETED) return false;
    if (this.status === AppointmentStatus.NO_SHOW) return false;
    
    return this.dateTime.isFuture();
  }

  canBeRescheduled(): boolean {
    if (this.status === AppointmentStatus.CANCELLED) return false;
    if (this.status === AppointmentStatus.COMPLETED) return false;
    if (this.status === AppointmentStatus.NO_SHOW) return false;
    
    const twoHoursBefore = this.dateTime.addHours(-2);
    return DateTime.now().isBefore(twoHoursBefore);
  }

  canBeConfirmed(): boolean {
    return this.status === AppointmentStatus.SCHEDULED;
  }

  canBeStarted(): boolean {
    return this.status === AppointmentStatus.CONFIRMED || 
           this.status === AppointmentStatus.SCHEDULED;
  }

  canBeCompleted(): boolean {
    return this.status === AppointmentStatus.IN_PROGRESS;
  }

  isUpcoming(): boolean {
    return this.dateTime.isFuture() && 
           this.status !== AppointmentStatus.CANCELLED;
  }

  isToday(): boolean {
    return this.dateTime.isToday();
  }

  getEndTime(): DateTime {
    return this.dateTime.addMinutes(this.service.duration.minutes);
  }

  getDuration(): Duration {
    return this.service.duration;
  }

  getPrice(): Money {
    return this.service.price;
  }

  // ✅ State Transition Methods
  confirm(): Appointment {
    if (!this.canBeConfirmed()) {
      throw new Error('Cannot confirm appointment in current status');
    }

    return new Appointment(
      this.id,
      this.client,
      this.service,
      this.professional,
      this.dateTime,
      AppointmentStatus.CONFIRMED,
      this.notes,
      this.createdAt,
      DateTime.now(),
      this.cancelledAt,
      this.cancelReason
    );
  }

  start(): Appointment {
    if (!this.canBeStarted()) {
      throw new Error('Cannot start appointment in current status');
    }

    return new Appointment(
      this.id,
      this.client,
      this.service,
      this.professional,
      this.dateTime,
      AppointmentStatus.IN_PROGRESS,
      this.notes,
      this.createdAt,
      DateTime.now(),
      this.cancelledAt,
      this.cancelReason
    );
  }

  complete(): Appointment {
    if (!this.canBeCompleted()) {
      throw new Error('Cannot complete appointment in current status');
    }

    return new Appointment(
      this.id,
      this.client,
      this.service,
      this.professional,
      this.dateTime,
      AppointmentStatus.COMPLETED,
      this.notes,
      this.createdAt,
      DateTime.now(),
      this.cancelledAt,
      this.cancelReason
    );
  }

  cancel(reason: string): Appointment {
    if (!this.canBeCancelled()) {
      throw new Error('Cannot cancel appointment in current status');
    }

    return new Appointment(
      this.id,
      this.client,
      this.service,
      this.professional,
      this.dateTime,
      AppointmentStatus.CANCELLED,
      this.notes,
      this.createdAt,
      DateTime.now(),
      DateTime.now(),
      reason
    );
  }

  reschedule(newDateTime: DateTime): Appointment {
    if (!this.canBeRescheduled()) {
      throw new Error('Cannot reschedule appointment in current status');
    }

    return new Appointment(
      this.id,
      this.client,
      this.service,
      this.professional,
      newDateTime,
      AppointmentStatus.SCHEDULED,
      this.notes,
      this.createdAt,
      DateTime.now(),
      this.cancelledAt,
      this.cancelReason
    );
  }

  markAsNoShow(): Appointment {
    if (this.status === AppointmentStatus.COMPLETED) {
      throw new Error('Cannot mark completed appointment as no-show');
    }
    if (this.status === AppointmentStatus.CANCELLED) {
      throw new Error('Cannot mark cancelled appointment as no-show');
    }

    return new Appointment(
      this.id,
      this.client,
      this.service,
      this.professional,
      this.dateTime,
      AppointmentStatus.NO_SHOW,
      this.notes,
      this.createdAt,
      DateTime.now(),
      this.cancelledAt,
      this.cancelReason
    );
  }

  updateNotes(notes: string): Appointment {
    return new Appointment(
      this.id,
      this.client,
      this.service,
      this.professional,
      this.dateTime,
      this.status,
      notes,
      this.createdAt,
      DateTime.now(),
      this.cancelledAt,
      this.cancelReason
    );
  }

  // ✅ Query Methods
  getStatusLabel(): string {
    return this.status;
  }

  getStatusColor(): string {
    const colors = {
      [AppointmentStatus.SCHEDULED]: 'blue',
      [AppointmentStatus.CONFIRMED]: 'green',
      [AppointmentStatus.IN_PROGRESS]: 'orange',
      [AppointmentStatus.COMPLETED]: 'gray',
      [AppointmentStatus.CANCELLED]: 'red',
      [AppointmentStatus.NO_SHOW]: 'red'
    };
    return colors[this.status];
  }

  // ✅ Serialization Methods
  toFirestore(): any {
    return {
      cliente: {
        id: this.client.id.toString(),
        name: this.client.name,
        phone: this.client.phone.raw,
        email: this.client.email,
        birthDate: this.client.birthDate?.toFirestoreData()
      },
      servico: {
        id: this.service.id.toString(),
        name: this.service.name,
        duration: this.service.duration.minutes,
        price: this.service.price.value
      },
      profissional: {
        id: this.professional.id.toString(),
        name: this.professional.name,
        phone: this.professional.phone?.raw
      },
      date: this.dateTime.toFirestoreData(),
      startTime: this.dateTime.formatTime(),
      status: this.status,
      notes: this.notes,
      createdAt: this.createdAt.toFirestoreData(),
      updatedAt: this.updatedAt.toFirestoreData(),
      cancelledAt: this.cancelledAt?.toFirestoreData(),
      cancelReason: this.cancelReason
    };
  }

  toJSON(): any {
    return {
      id: this.id.toString(),
      client: {
        id: this.client.id.toString(),
        name: this.client.name,
        phone: this.client.phone.format(),
        email: this.client.email
      },
      service: {
        id: this.service.id.toString(),
        name: this.service.name,
        duration: this.service.duration.toString(),
        price: this.service.price.format()
      },
      professional: {
        id: this.professional.id.toString(),
        name: this.professional.name
      },
      dateTime: this.dateTime.toISO(),
      status: this.status,
      notes: this.notes,
      createdAt: this.createdAt.toISO(),
      updatedAt: this.updatedAt.toISO()
    };
  }

  // ✅ Private Validation Methods
  private validateAppointment(): void {
    if (this.status === AppointmentStatus.SCHEDULED && this.dateTime.isPast()) {
      throw new Error('Cannot schedule appointment in the past');
    }

    const hour = this.dateTime.toDate().getHours();
    if (hour < 8 || hour >= 18) {
      throw new Error('Appointment must be scheduled during business hours (8:00 - 18:00)');
    }

    if (this.dateTime.getWeekday() === 0) {
      throw new Error('Cannot schedule appointments on Sundays');
    }
  }

  // ✅ Equality and Comparison
  equals(other: Appointment): boolean {
    return this.id.equals(other.id);
  }

  toString(): string {
    return `Appointment(${this.id.toString()}, ${this.client.name}, ${this.dateTime.formatDateTime()})`;
  }
}
