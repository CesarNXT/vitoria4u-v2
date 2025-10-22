/**
 * 💼 Service Entity - IMPLEMENTAÇÃO REAL
 * Entidade de domínio rica para serviços
 */

import { DateTime } from '../value-objects/date-time';
import { Money } from '../value-objects/money';
import { Duration } from './appointment';

// ✅ Value Object para ID do Serviço
export class ServiceId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ServiceId cannot be empty');
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: ServiceId): boolean {
    return this.value === other.value;
  }
}

// ✅ Enum para Status do Serviço
export enum ServiceStatus {
  ACTIVE = 'Ativo',
  INACTIVE = 'Inativo'
}

// ✅ Enum para Tipo de Preço
export enum PriceType {
  FIXED = 'fixed',
  ON_REQUEST = 'on_request',
  STARTING_FROM = 'starting_from'
}

// ✅ Interface para Profissional Habilitado
export interface ServiceProfessional {
  id: string;
  name: string;
}

// ✅ Interface para Plano de Saúde Aceito
export interface HealthPlan {
  id: string;
  name: string;
}

// ✅ Entidade Principal - Service
export class Service {
  constructor(
    public readonly id: ServiceId,
    public readonly name: string,
    public readonly price: Money,
    public readonly priceType: PriceType,
    public readonly duration: Duration,
    public readonly status: ServiceStatus,
    public readonly description?: string,
    public readonly imageUrl?: string,
    public readonly professionals: ServiceProfessional[] = [],
    public readonly cost?: Money,
    public readonly returnInDays?: number,
    public readonly healthPlans: HealthPlan[] = [],
    public readonly createdAt: DateTime = DateTime.now(),
    public readonly updatedAt: DateTime = DateTime.now()
  ) {
    this.validateService();
  }

  // ✅ Factory Methods
  static create(data: {
    id: string;
    name: string;
    price: number;
    priceType?: PriceType;
    duration: number;
    description?: string;
    imageUrl?: string;
    professionals?: ServiceProfessional[];
    cost?: number;
    returnInDays?: number;
    healthPlans?: HealthPlan[];
  }): Service {
    return new Service(
      new ServiceId(data.id),
      data.name.trim(),
      Money.create(data.price),
      data.priceType || PriceType.FIXED,
      new Duration(data.duration),
      ServiceStatus.ACTIVE,
      data.description?.trim(),
      data.imageUrl,
      data.professionals || [],
      data.cost ? Money.create(data.cost) : undefined,
      data.returnInDays,
      data.healthPlans || []
    );
  }

  static fromFirestore(id: string, data: any): Service {
    return new Service(
      new ServiceId(id),
      data.name || 'Serviço',
      Money.create(data.price || 0),
      data.priceType as PriceType || PriceType.FIXED,
      new Duration(data.duration || 60),
      data.status as ServiceStatus || ServiceStatus.ACTIVE,
      data.description,
      data.imageUrl,
      data.professionals || [],
      data.custo ? Money.create(data.custo) : undefined,
      data.returnInDays,
      data.planosAceitos || [],
      data.createdAt ? DateTime.fromFirestoreData(data.createdAt) : DateTime.now(),
      data.updatedAt ? DateTime.fromFirestoreData(data.updatedAt) : DateTime.now()
    );
  }

  // ✅ Business Logic Methods
  isActive(): boolean {
    return this.status === ServiceStatus.ACTIVE;
  }

  isInactive(): boolean {
    return this.status === ServiceStatus.INACTIVE;
  }

  hasFixedPrice(): boolean {
    return this.priceType === PriceType.FIXED;
  }

  isPriceOnRequest(): boolean {
    return this.priceType === PriceType.ON_REQUEST;
  }

  isStartingFromPrice(): boolean {
    return this.priceType === PriceType.STARTING_FROM;
  }

  getFormattedPrice(): string {
    switch (this.priceType) {
      case PriceType.ON_REQUEST:
        return 'Sob orçamento';
      case PriceType.STARTING_FROM:
        return `A partir de ${this.price.format()}`;
      case PriceType.FIXED:
      default:
        return this.price.format();
    }
  }

  getFormattedDuration(): string {
    return this.duration.toString();
  }

  hasProfessionals(): boolean {
    return this.professionals.length > 0;
  }

  isProfessionalEnabled(professionalId: string): boolean {
    return this.professionals.some(p => p.id === professionalId);
  }

  getEnabledProfessionals(): ServiceProfessional[] {
    return [...this.professionals];
  }

  hasReturnPolicy(): boolean {
    return this.returnInDays !== undefined && this.returnInDays > 0;
  }

  getReturnDate(serviceDate: DateTime): DateTime | null {
    if (!this.hasReturnPolicy()) return null;
    return serviceDate.addDays(this.returnInDays!);
  }

  acceptsHealthPlan(planId: string): boolean {
    return this.healthPlans.some(p => p.id === planId);
  }

  getAcceptedHealthPlans(): HealthPlan[] {
    return [...this.healthPlans];
  }

  hasProfit(): boolean {
    if (!this.cost || !this.hasFixedPrice()) return false;
    return this.price.isGreaterThan(this.cost);
  }

  getProfit(): Money | null {
    if (!this.hasProfit()) return null;
    return this.price.subtract(this.cost!);
  }

  getProfitMargin(): number | null {
    const profit = this.getProfit();
    if (!profit) return null;
    return (profit.value / this.price.value) * 100;
  }

  // ✅ State Transition Methods
  activate(): Service {
    if (this.isActive()) return this;

    return new Service(
      this.id,
      this.name,
      this.price,
      this.priceType,
      this.duration,
      ServiceStatus.ACTIVE,
      this.description,
      this.imageUrl,
      this.professionals,
      this.cost,
      this.returnInDays,
      this.healthPlans,
      this.createdAt,
      DateTime.now()
    );
  }

  deactivate(): Service {
    if (this.isInactive()) return this;

    return new Service(
      this.id,
      this.name,
      this.price,
      this.priceType,
      this.duration,
      ServiceStatus.INACTIVE,
      this.description,
      this.imageUrl,
      this.professionals,
      this.cost,
      this.returnInDays,
      this.healthPlans,
      this.createdAt,
      DateTime.now()
    );
  }

  updateInfo(data: {
    name?: string;
    price?: number;
    priceType?: PriceType;
    duration?: number;
    description?: string;
    imageUrl?: string;
    cost?: number;
    returnInDays?: number;
  }): Service {
    return new Service(
      this.id,
      data.name?.trim() || this.name,
      data.price ? Money.create(data.price) : this.price,
      data.priceType || this.priceType,
      data.duration ? new Duration(data.duration) : this.duration,
      this.status,
      data.description?.trim() || this.description,
      data.imageUrl || this.imageUrl,
      this.professionals,
      data.cost ? Money.create(data.cost) : this.cost,
      data.returnInDays,
      this.healthPlans,
      this.createdAt,
      DateTime.now()
    );
  }

  addProfessional(professional: ServiceProfessional): Service {
    if (this.isProfessionalEnabled(professional.id)) {
      return this;
    }

    return new Service(
      this.id,
      this.name,
      this.price,
      this.priceType,
      this.duration,
      this.status,
      this.description,
      this.imageUrl,
      [...this.professionals, professional],
      this.cost,
      this.returnInDays,
      this.healthPlans,
      this.createdAt,
      DateTime.now()
    );
  }

  removeProfessional(professionalId: string): Service {
    return new Service(
      this.id,
      this.name,
      this.price,
      this.priceType,
      this.duration,
      this.status,
      this.description,
      this.imageUrl,
      this.professionals.filter(p => p.id !== professionalId),
      this.cost,
      this.returnInDays,
      this.healthPlans,
      this.createdAt,
      DateTime.now()
    );
  }

  updateProfessionals(professionals: ServiceProfessional[]): Service {
    return new Service(
      this.id,
      this.name,
      this.price,
      this.priceType,
      this.duration,
      this.status,
      this.description,
      this.imageUrl,
      [...professionals],
      this.cost,
      this.returnInDays,
      this.healthPlans,
      this.createdAt,
      DateTime.now()
    );
  }

  addHealthPlan(healthPlan: HealthPlan): Service {
    if (this.acceptsHealthPlan(healthPlan.id)) {
      return this;
    }

    return new Service(
      this.id,
      this.name,
      this.price,
      this.priceType,
      this.duration,
      this.status,
      this.description,
      this.imageUrl,
      this.professionals,
      this.cost,
      this.returnInDays,
      [...this.healthPlans, healthPlan],
      this.createdAt,
      DateTime.now()
    );
  }

  removeHealthPlan(planId: string): Service {
    return new Service(
      this.id,
      this.name,
      this.price,
      this.priceType,
      this.duration,
      this.status,
      this.description,
      this.imageUrl,
      this.professionals,
      this.cost,
      this.returnInDays,
      this.healthPlans.filter(p => p.id !== planId),
      this.createdAt,
      DateTime.now()
    );
  }

  // ✅ Query Methods
  getStatusLabel(): string {
    return this.status;
  }

  getStatusColor(): string {
    return this.status === ServiceStatus.ACTIVE ? 'green' : 'red';
  }

  getPriceTypeLabel(): string {
    const labels = {
      [PriceType.FIXED]: 'Preço fixo',
      [PriceType.ON_REQUEST]: 'Sob orçamento',
      [PriceType.STARTING_FROM]: 'A partir de'
    };
    return labels[this.priceType];
  }

  getShortDescription(): string {
    if (!this.description) return '';
    return this.description.length > 100 
      ? `${this.description.substring(0, 100)}...`
      : this.description;
  }

  // ✅ Search and Filter Methods
  matchesSearch(searchTerm: string): boolean {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    return (
      this.name.toLowerCase().includes(term) ||
      (this.description && this.description.toLowerCase().includes(term)) ||
      this.getFormattedPrice().toLowerCase().includes(term) ||
      this.professionals.some(p => p.name.toLowerCase().includes(term))
    );
  }

  // ✅ Validation Methods
  canBeBooked(): boolean {
    return this.isActive() && this.hasProfessionals();
  }

  hasValidPricing(): boolean {
    if (this.priceType === PriceType.ON_REQUEST) return true;
    return this.price.isPositive();
  }

  isComplete(): boolean {
    return !!(
      this.name &&
      this.duration.minutes > 0 &&
      this.hasValidPricing() &&
      this.hasProfessionals()
    );
  }

  // ✅ Serialization Methods
  toFirestore(): any {
    return {
      name: this.name,
      price: this.price.value,
      priceType: this.priceType,
      duration: this.duration.minutes,
      status: this.status,
      description: this.description,
      imageUrl: this.imageUrl,
      professionals: this.professionals,
      custo: this.cost?.value,
      returnInDays: this.returnInDays,
      planosAceitos: this.healthPlans,
      createdAt: this.createdAt.toFirestoreData(),
      updatedAt: this.updatedAt.toFirestoreData()
    };
  }

  toJSON(): any {
    return {
      id: this.id.toString(),
      name: this.name,
      price: this.price.format(),
      priceValue: this.price.value,
      priceType: this.priceType,
      formattedPrice: this.getFormattedPrice(),
      duration: this.duration.toString(),
      durationMinutes: this.duration.minutes,
      status: this.status,
      description: this.description,
      shortDescription: this.getShortDescription(),
      imageUrl: this.imageUrl,
      professionals: this.professionals,
      cost: this.cost?.format(),
      profit: this.getProfit()?.format(),
      profitMargin: this.getProfitMargin(),
      returnInDays: this.returnInDays,
      healthPlans: this.healthPlans,
      isActive: this.isActive(),
      canBeBooked: this.canBeBooked(),
      createdAt: this.createdAt.toISO(),
      updatedAt: this.updatedAt.toISO()
    };
  }

  // ✅ Export for external systems
  toExportFormat(): any {
    return {
      'Nome': this.name,
      'Preço': this.getFormattedPrice(),
      'Duração': this.getFormattedDuration(),
      'Status': this.status,
      'Descrição': this.description || '',
      'Profissionais': this.professionals.map(p => p.name).join(', '),
      'Custo': this.cost?.format() || '',
      'Lucro': this.getProfit()?.format() || '',
      'Margem (%)': this.getProfitMargin()?.toFixed(1) || '',
      'Retorno (dias)': this.returnInDays || '',
      'Criado em': this.createdAt.formatDateTime()
    };
  }

  // ✅ Private Validation Methods
  private validateService(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Service name cannot be empty');
    }

    if (this.name.length > 100) {
      throw new Error('Service name cannot exceed 100 characters');
    }

    if (this.description && this.description.length > 500) {
      throw new Error('Service description cannot exceed 500 characters');
    }

    if (this.duration.minutes <= 0) {
      throw new Error('Service duration must be positive');
    }

    if (this.priceType !== PriceType.ON_REQUEST && !this.price.isPositive()) {
      throw new Error('Service price must be positive for fixed pricing');
    }

    if (this.returnInDays !== undefined && this.returnInDays < 0) {
      throw new Error('Return days cannot be negative');
    }

    if (this.cost && this.priceType === PriceType.FIXED && this.cost.isGreaterThan(this.price)) {
      console.warn(`Service ${this.name}: cost is higher than price`);
    }
  }

  // ✅ Equality and Comparison
  equals(other: Service): boolean {
    return this.id.equals(other.id);
  }

  toString(): string {
    return `Service(${this.id.toString()}, ${this.name}, ${this.getFormattedPrice()})`;
  }
}
