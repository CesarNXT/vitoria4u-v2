/**
 * 👨‍💼 Professional Entity - IMPLEMENTAÇÃO REAL
 * Entidade de domínio rica para profissionais
 */

import { DateTime } from '../value-objects/date-time';
import { Phone } from '../value-objects/phone';
import { Email } from './client';

// ✅ Value Object para ID do Profissional
export class ProfessionalId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ProfessionalId cannot be empty');
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: ProfessionalId): boolean {
    return this.value === other.value;
  }
}

// ✅ Enum para Status do Profissional
export enum ProfessionalStatus {
  ACTIVE = 'Ativo',
  INACTIVE = 'Inativo',
  ON_VACATION = 'Em Férias',
  SICK_LEAVE = 'Licença Médica'
}

// ✅ Interface para Horário de Trabalho
export interface WorkHours {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface WeeklySchedule {
  domingo: WorkHours;
  segunda: WorkHours;
  terca: WorkHours;
  quarta: WorkHours;
  quinta: WorkHours;
  sexta: WorkHours;
  sabado: WorkHours;
}

// ✅ Interface para Serviços Habilitados
export interface ProfessionalService {
  id: string;
  name: string;
  enabled: boolean;
}

// ✅ Entidade Principal - Professional
export class Professional {
  constructor(
    public readonly id: ProfessionalId,
    public readonly name: string,
    public readonly status: ProfessionalStatus,
    public readonly phone?: Phone,
    public readonly email?: Email,
    public readonly workHours?: WeeklySchedule,
    public readonly services: ProfessionalService[] = [],
    public readonly avatarUrl?: string,
    public readonly bio?: string,
    public readonly specialties: string[] = [],
    public readonly commission?: number, // Percentual de comissão
    public readonly createdAt: DateTime = DateTime.now(),
    public readonly updatedAt: DateTime = DateTime.now()
  ) {
    this.validateProfessional();
  }

  // ✅ Factory Methods
  static create(data: {
    id: string;
    name: string;
    phone?: string | number;
    email?: string;
    workHours?: WeeklySchedule;
    services?: ProfessionalService[];
    avatarUrl?: string;
    bio?: string;
    specialties?: string[];
    commission?: number;
  }): Professional {
    return new Professional(
      new ProfessionalId(data.id),
      data.name.trim(),
      ProfessionalStatus.ACTIVE,
      data.phone ? Phone.create(data.phone) : undefined,
      data.email ? new Email(data.email) : undefined,
      data.workHours,
      data.services || [],
      data.avatarUrl,
      data.bio?.trim(),
      data.specialties || [],
      data.commission
    );
  }

  static fromFirestore(id: string, data: any): Professional {
    return new Professional(
      new ProfessionalId(id),
      data.name || 'Profissional',
      data.status as ProfessionalStatus || ProfessionalStatus.ACTIVE,
      data.phone ? Phone.create(data.phone) : undefined,
      data.email ? new Email(data.email) : undefined,
      data.workHours,
      data.services || [],
      data.avatarUrl,
      data.bio,
      data.especialidades || data.specialties || [],
      data.comissao || data.commission,
      data.createdAt ? DateTime.fromFirestoreData(data.createdAt) : DateTime.now(),
      data.updatedAt ? DateTime.fromFirestoreData(data.updatedAt) : DateTime.now()
    );
  }

  // ✅ Business Logic Methods
  isActive(): boolean {
    return this.status === ProfessionalStatus.ACTIVE;
  }

  isInactive(): boolean {
    return this.status === ProfessionalStatus.INACTIVE;
  }

  isOnVacation(): boolean {
    return this.status === ProfessionalStatus.ON_VACATION;
  }

  isOnSickLeave(): boolean {
    return this.status === ProfessionalStatus.SICK_LEAVE;
  }

  isAvailable(): boolean {
    return this.isActive();
  }

  hasWorkHours(): boolean {
    return this.workHours !== undefined;
  }

  isWorkingOn(dayOfWeek: number): boolean {
    if (!this.hasWorkHours()) return true; // Se não tem horário definido, assume que trabalha

    const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const dayKey = dayNames[dayOfWeek] as keyof WeeklySchedule;
    const daySchedule = this.workHours![dayKey];

    return daySchedule.enabled && daySchedule.slots.length > 0;
  }

  getWorkHoursForDay(dayOfWeek: number): TimeSlot[] {
    if (!this.isWorkingOn(dayOfWeek)) return [];

    const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const dayKey = dayNames[dayOfWeek] as keyof WeeklySchedule;
    
    return this.workHours![dayKey].slots;
  }

  hasServices(): boolean {
    return this.services.length > 0;
  }

  canPerformService(serviceId: string): boolean {
    return this.services.some(s => s.id === serviceId && s.enabled);
  }

  getEnabledServices(): ProfessionalService[] {
    return this.services.filter(s => s.enabled);
  }

  getServiceIds(): string[] {
    return this.getEnabledServices().map(s => s.id);
  }

  hasSpecialties(): boolean {
    return this.specialties.length > 0;
  }

  hasCommission(): boolean {
    return this.commission !== undefined && this.commission > 0;
  }

  getCommissionRate(): number {
    return this.commission || 0;
  }

  calculateCommission(amount: number): number {
    if (!this.hasCommission()) return 0;
    return (amount * this.getCommissionRate()) / 100;
  }

  getInitials(): string {
    return this.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  getDisplayName(): string {
    return this.name;
  }

  getWhatsAppUrl(): string | null {
    if (!this.phone) return null;
    
    const message = encodeURIComponent(`Olá ${this.name}! Como posso ajudá-lo?`);
    return `https://api.whatsapp.com/send?phone=${this.phone.formatForWhatsApp()}&text=${message}`;
  }

  // ✅ State Transition Methods
  activate(): Professional {
    if (this.isActive()) return this;

    return new Professional(
      this.id,
      this.name,
      ProfessionalStatus.ACTIVE,
      this.phone,
      this.email,
      this.workHours,
      this.services,
      this.avatarUrl,
      this.bio,
      this.specialties,
      this.commission,
      this.createdAt,
      DateTime.now()
    );
  }

  deactivate(): Professional {
    if (this.isInactive()) return this;

    return new Professional(
      this.id,
      this.name,
      ProfessionalStatus.INACTIVE,
      this.phone,
      this.email,
      this.workHours,
      this.services,
      this.avatarUrl,
      this.bio,
      this.specialties,
      this.commission,
      this.createdAt,
      DateTime.now()
    );
  }

  setOnVacation(): Professional {
    return new Professional(
      this.id,
      this.name,
      ProfessionalStatus.ON_VACATION,
      this.phone,
      this.email,
      this.workHours,
      this.services,
      this.avatarUrl,
      this.bio,
      this.specialties,
      this.commission,
      this.createdAt,
      DateTime.now()
    );
  }

  setOnSickLeave(): Professional {
    return new Professional(
      this.id,
      this.name,
      ProfessionalStatus.SICK_LEAVE,
      this.phone,
      this.email,
      this.workHours,
      this.services,
      this.avatarUrl,
      this.bio,
      this.specialties,
      this.commission,
      this.createdAt,
      DateTime.now()
    );
  }

  updateInfo(data: {
    name?: string;
    phone?: string | number;
    email?: string;
    bio?: string;
    avatarUrl?: string;
    commission?: number;
  }): Professional {
    return new Professional(
      this.id,
      data.name?.trim() || this.name,
      this.status,
      data.phone ? Phone.create(data.phone) : this.phone,
      data.email ? new Email(data.email) : this.email,
      this.workHours,
      this.services,
      data.avatarUrl || this.avatarUrl,
      data.bio?.trim() || this.bio,
      this.specialties,
      data.commission !== undefined ? data.commission : this.commission,
      this.createdAt,
      DateTime.now()
    );
  }

  updateWorkHours(workHours: WeeklySchedule): Professional {
    return new Professional(
      this.id,
      this.name,
      this.status,
      this.phone,
      this.email,
      workHours,
      this.services,
      this.avatarUrl,
      this.bio,
      this.specialties,
      this.commission,
      this.createdAt,
      DateTime.now()
    );
  }

  updateServices(services: ProfessionalService[]): Professional {
    return new Professional(
      this.id,
      this.name,
      this.status,
      this.phone,
      this.email,
      this.workHours,
      [...services],
      this.avatarUrl,
      this.bio,
      this.specialties,
      this.commission,
      this.createdAt,
      DateTime.now()
    );
  }

  enableService(serviceId: string): Professional {
    const updatedServices = this.services.map(s => 
      s.id === serviceId ? { ...s, enabled: true } : s
    );

    return this.updateServices(updatedServices);
  }

  disableService(serviceId: string): Professional {
    const updatedServices = this.services.map(s => 
      s.id === serviceId ? { ...s, enabled: false } : s
    );

    return this.updateServices(updatedServices);
  }

  addService(service: ProfessionalService): Professional {
    if (this.services.some(s => s.id === service.id)) {
      return this;
    }

    return this.updateServices([...this.services, service]);
  }

  removeService(serviceId: string): Professional {
    const updatedServices = this.services.filter(s => s.id !== serviceId);
    return this.updateServices(updatedServices);
  }

  updateSpecialties(specialties: string[]): Professional {
    return new Professional(
      this.id,
      this.name,
      this.status,
      this.phone,
      this.email,
      this.workHours,
      this.services,
      this.avatarUrl,
      this.bio,
      [...specialties],
      this.commission,
      this.createdAt,
      DateTime.now()
    );
  }

  addSpecialty(specialty: string): Professional {
    if (this.specialties.includes(specialty)) {
      return this;
    }

    return this.updateSpecialties([...this.specialties, specialty]);
  }

  removeSpecialty(specialty: string): Professional {
    const updatedSpecialties = this.specialties.filter(s => s !== specialty);
    return this.updateSpecialties(updatedSpecialties);
  }

  // ✅ Query Methods
  getStatusLabel(): string {
    return this.status;
  }

  getStatusColor(): string {
    const colors = {
      [ProfessionalStatus.ACTIVE]: 'green',
      [ProfessionalStatus.INACTIVE]: 'red',
      [ProfessionalStatus.ON_VACATION]: 'orange',
      [ProfessionalStatus.SICK_LEAVE]: 'yellow'
    };
    return colors[this.status];
  }

  getWorkingDays(): string[] {
    if (!this.hasWorkHours()) return [];

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const workingDays: string[] = [];

    for (let i = 0; i < 7; i++) {
      const dayName = dayNames[i];
      if (this.isWorkingOn(i) && dayName) {
        workingDays.push(dayName);
      }
    }

    return workingDays;
  }

  getSpecialtiesDisplay(): string {
    return this.specialties.join(', ') || 'Nenhuma especialidade';
  }

  getServicesDisplay(): string {
    const enabledServices = this.getEnabledServices();
    return enabledServices.map(s => s.name).join(', ') || 'Nenhum serviço';
  }

  // ✅ Search and Filter Methods
  matchesSearch(searchTerm: string): boolean {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    return (
      this.name.toLowerCase().includes(term) ||
      (this.phone && this.phone.format().includes(term)) ||
      (this.email && this.email.value.toLowerCase().includes(term)) ||
      (this.bio && this.bio.toLowerCase().includes(term)) ||
      this.specialties.some(s => s.toLowerCase().includes(term)) ||
      this.services.some(s => s.name.toLowerCase().includes(term))
    );
  }

  // ✅ Validation Methods
  canReceiveWhatsApp(): boolean {
    return this.phone?.isCellphone || false;
  }

  hasValidEmail(): boolean {
    return this.email !== undefined;
  }

  hasCompleteInfo(): boolean {
    return !!(this.name && this.phone && this.hasServices());
  }

  canAcceptAppointments(): boolean {
    return this.isAvailable() && this.hasServices();
  }

  // ✅ Serialization Methods
  toFirestore(): any {
    return {
      name: this.name,
      status: this.status,
      phone: this.phone?.raw,
      email: this.email?.value,
      workHours: this.workHours,
      services: this.services,
      avatarUrl: this.avatarUrl,
      bio: this.bio,
      especialidades: this.specialties,
      comissao: this.commission,
      createdAt: this.createdAt.toFirestoreData(),
      updatedAt: this.updatedAt.toFirestoreData()
    };
  }

  toJSON(): any {
    return {
      id: this.id.toString(),
      name: this.name,
      status: this.status,
      phone: this.phone?.format(),
      phoneRaw: this.phone?.raw,
      email: this.email?.value,
      workHours: this.workHours,
      services: this.services,
      enabledServices: this.getEnabledServices(),
      avatarUrl: this.avatarUrl,
      bio: this.bio,
      specialties: this.specialties,
      commission: this.commission,
      initials: this.getInitials(),
      isActive: this.isActive(),
      isAvailable: this.isAvailable(),
      workingDays: this.getWorkingDays(),
      canAcceptAppointments: this.canAcceptAppointments(),
      createdAt: this.createdAt.toISO(),
      updatedAt: this.updatedAt.toISO()
    };
  }

  // ✅ Export for external systems
  toExportFormat(): any {
    return {
      'Nome': this.name,
      'Status': this.status,
      'Telefone': this.phone?.format() || '',
      'Email': this.email?.value || '',
      'Especialidades': this.getSpecialtiesDisplay(),
      'Serviços': this.getServicesDisplay(),
      'Dias de Trabalho': this.getWorkingDays().join(', '),
      'Comissão (%)': this.commission || '',
      'Bio': this.bio || '',
      'Criado em': this.createdAt.formatDateTime()
    };
  }

  // ✅ Private Validation Methods
  private validateProfessional(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Professional name cannot be empty');
    }

    if (this.name.length > 100) {
      throw new Error('Professional name cannot exceed 100 characters');
    }

    if (this.bio && this.bio.length > 500) {
      throw new Error('Professional bio cannot exceed 500 characters');
    }

    if (this.commission !== undefined && (this.commission < 0 || this.commission > 100)) {
      throw new Error('Commission must be between 0 and 100 percent');
    }

    if (this.specialties.length > 10) {
      throw new Error('Professional cannot have more than 10 specialties');
    }

    if (this.services.length > 50) {
      throw new Error('Professional cannot have more than 50 services');
    }
  }

  // ✅ Equality and Comparison
  equals(other: Professional): boolean {
    return this.id.equals(other.id);
  }

  toString(): string {
    return `Professional(${this.id.toString()}, ${this.name}, ${this.status})`;
  }
}
