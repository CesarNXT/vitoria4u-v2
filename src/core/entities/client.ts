/**
 * 👥 Client Entity - IMPLEMENTAÇÃO REAL
 * Entidade de domínio rica para clientes
 */

import { DateTime } from '../value-objects/date-time';
import { Phone } from '../value-objects/phone';

// ✅ Value Object para ID do Cliente
export class ClientId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ClientId cannot be empty');
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: ClientId): boolean {
    return this.value === other.value;
  }
}

// ✅ Enum para Status do Cliente
export enum ClientStatus {
  ACTIVE = 'Ativo',
  INACTIVE = 'Inativo'
}

// ✅ Value Object para Email
export class Email {
  constructor(public readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error('Invalid email format');
    }
  }

  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }
}

// ✅ Entidade Principal - Client
export class Client {
  constructor(
    public readonly id: ClientId,
    public readonly name: string,
    public readonly phone: Phone,
    public readonly status: ClientStatus,
    public readonly birthDate?: DateTime,
    public readonly email?: Email,
    public readonly notes?: string,
    public readonly avatarUrl?: string,
    public readonly createdAt: DateTime = DateTime.now(),
    public readonly updatedAt: DateTime = DateTime.now()
  ) {
    this.validateClient();
  }

  // ✅ Factory Methods
  static create(data: {
    id: string;
    name: string;
    phone: string | number;
    email?: string;
    birthDate?: any;
    notes?: string;
    avatarUrl?: string;
  }): Client {
    return new Client(
      new ClientId(data.id),
      data.name.trim(),
      Phone.create(data.phone),
      ClientStatus.ACTIVE,
      data.birthDate ? DateTime.fromFirestoreData(data.birthDate) : undefined,
      data.email ? new Email(data.email) : undefined,
      data.notes?.trim(),
      data.avatarUrl
    );
  }

  static fromFirestore(id: string, data: any): Client {
    return new Client(
      new ClientId(id),
      data.name || 'Cliente',
      Phone.create(data.phone || ''),
      data.status as ClientStatus || ClientStatus.ACTIVE,
      data.birthDate ? DateTime.fromFirestoreData(data.birthDate) : undefined,
      data.email ? new Email(data.email) : undefined,
      data.observacoes || data.notes,
      data.avatarUrl,
      data.createdAt ? DateTime.fromFirestoreData(data.createdAt) : DateTime.now(),
      data.updatedAt ? DateTime.fromFirestoreData(data.updatedAt) : DateTime.now()
    );
  }

  // ✅ Business Logic Methods
  isActive(): boolean {
    return this.status === ClientStatus.ACTIVE;
  }

  isInactive(): boolean {
    return this.status === ClientStatus.INACTIVE;
  }

  getAge(): number | null {
    if (!this.birthDate) return null;
    
    const now = DateTime.now();
    const years = now.diffInDays(this.birthDate) / 365.25;
    return Math.floor(years);
  }

  isBirthdayToday(): boolean {
    if (!this.birthDate) return false;
    
    const today = DateTime.now();
    const birthDay = this.birthDate.toDate().getDate();
    const birthMonth = this.birthDate.toDate().getMonth();
    
    return today.toDate().getDate() === birthDay && 
           today.toDate().getMonth() === birthMonth;
  }

  isBirthdayThisWeek(): boolean {
    if (!this.birthDate) return false;
    
    const today = DateTime.now();
    const endOfWeek = today.addDays(7);
    
    // Criar data de aniversário para este ano
    const thisYearBirthday = DateTime.fromDate(new Date(
      today.toDate().getFullYear(),
      this.birthDate.toDate().getMonth(),
      this.birthDate.toDate().getDate()
    ));
    
    return thisYearBirthday.isAfter(today) && thisYearBirthday.isBefore(endOfWeek);
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

  getWhatsAppUrl(): string {
    const message = encodeURIComponent(`Olá ${this.name}! Como posso ajudá-lo?`);
    return `https://wa.me/${this.phone.formatForWhatsApp()}?text=${message}`;
  }

  // ✅ State Transition Methods
  activate(): Client {
    if (this.isActive()) {
      return this;
    }

    return new Client(
      this.id,
      this.name,
      this.phone,
      ClientStatus.ACTIVE,
      this.birthDate,
      this.email,
      this.notes,
      this.avatarUrl,
      this.createdAt,
      DateTime.now()
    );
  }

  deactivate(): Client {
    if (this.isInactive()) {
      return this;
    }

    return new Client(
      this.id,
      this.name,
      this.phone,
      ClientStatus.INACTIVE,
      this.birthDate,
      this.email,
      this.notes,
      this.avatarUrl,
      this.createdAt,
      DateTime.now()
    );
  }

  updateInfo(data: {
    name?: string;
    phone?: string | number;
    email?: string;
    birthDate?: any;
    notes?: string;
    avatarUrl?: string;
  }): Client {
    return new Client(
      this.id,
      data.name?.trim() || this.name,
      data.phone ? Phone.create(data.phone) : this.phone,
      this.status,
      data.birthDate ? DateTime.fromFirestoreData(data.birthDate) : this.birthDate,
      data.email ? new Email(data.email) : this.email,
      data.notes?.trim() || this.notes,
      data.avatarUrl || this.avatarUrl,
      this.createdAt,
      DateTime.now()
    );
  }

  addNotes(additionalNotes: string): Client {
    const currentNotes = this.notes || '';
    const newNotes = currentNotes 
      ? `${currentNotes}\n\n${DateTime.now().formatDateTime()}: ${additionalNotes}`
      : `${DateTime.now().formatDateTime()}: ${additionalNotes}`;

    return new Client(
      this.id,
      this.name,
      this.phone,
      this.status,
      this.birthDate,
      this.email,
      newNotes,
      this.avatarUrl,
      this.createdAt,
      DateTime.now()
    );
  }

  // ✅ Query Methods
  getStatusLabel(): string {
    return this.status;
  }

  getStatusColor(): string {
    return this.status === ClientStatus.ACTIVE ? 'green' : 'red';
  }

  getBirthdayFormatted(): string | null {
    if (!this.birthDate) return null;
    return this.birthDate.format('dd/MM');
  }

  getAgeDisplay(): string {
    const age = this.getAge();
    return age !== null ? `${age} anos` : 'Idade não informada';
  }

  // ✅ Search and Filter Methods
  matchesSearch(searchTerm: string): boolean {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    return (
      this.name.toLowerCase().includes(term) ||
      this.phone.format().includes(term) ||
      this.phone.raw.includes(term) ||
      (this.email && this.email.value.toLowerCase().includes(term)) ||
      (this.notes && this.notes.toLowerCase().includes(term))
    );
  }

  // ✅ Validation Methods
  canReceiveWhatsApp(): boolean {
    try {
      return this.phone.isCellphone;
    } catch {
      return false;
    }
  }

  hasValidEmail(): boolean {
    return this.email !== undefined;
  }

  hasCompleteInfo(): boolean {
    return !!(this.name && this.phone && this.birthDate);
  }

  // ✅ Serialization Methods
  toFirestore(): any {
    return {
      name: this.name,
      phone: this.phone.raw,
      status: this.status,
      birthDate: this.birthDate?.toFirestoreData(),
      email: this.email?.value,
      observacoes: this.notes,
      avatarUrl: this.avatarUrl,
      createdAt: this.createdAt.toFirestoreData(),
      updatedAt: this.updatedAt.toFirestoreData()
    };
  }

  toJSON(): any {
    return {
      id: this.id.toString(),
      name: this.name,
      phone: this.phone.format(),
      phoneRaw: this.phone.raw,
      status: this.status,
      birthDate: this.birthDate?.toISO(),
      email: this.email?.value,
      notes: this.notes,
      avatarUrl: this.avatarUrl,
      age: this.getAge(),
      initials: this.getInitials(),
      isActive: this.isActive(),
      isBirthdayToday: this.isBirthdayToday(),
      createdAt: this.createdAt.toISO(),
      updatedAt: this.updatedAt.toISO()
    };
  }

  // ✅ Export for external systems
  toExportFormat(): any {
    return {
      'Nome': this.name,
      'Telefone': this.phone.format(),
      'Email': this.email?.value || '',
      'Data de Nascimento': this.birthDate?.formatDate() || '',
      'Idade': this.getAgeDisplay(),
      'Status': this.status,
      'Observações': this.notes || '',
      'Criado em': this.createdAt.formatDateTime()
    };
  }

  // ✅ Private Validation Methods
  private validateClient(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Client name cannot be empty');
    }

    if (this.name.length > 100) {
      throw new Error('Client name cannot exceed 100 characters');
    }

    if (this.notes && this.notes.length > 1000) {
      throw new Error('Client notes cannot exceed 1000 characters');
    }

    if (this.birthDate && this.birthDate.isFuture()) {
      throw new Error('Birth date cannot be in the future');
    }

    // Validar idade mínima (não pode ser menor que 0 ou maior que 120)
    const age = this.getAge();
    if (age !== null && (age < 0 || age > 120)) {
      throw new Error('Invalid birth date: age must be between 0 and 120 years');
    }
  }

  // ✅ Equality and Comparison
  equals(other: Client): boolean {
    return this.id.equals(other.id);
  }

  toString(): string {
    return `Client(${this.id.toString()}, ${this.name}, ${this.phone.format()})`;
  }
}
