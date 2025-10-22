/**
 * 📅 DateTime Value Object - IMPLEMENTAÇÃO REAL
 * Substitui TODAS as gambiarras de data do sistema
 */

import { Timestamp } from 'firebase/firestore';

export class DateTime {
  private static readonly TIMEZONE_BRAZIL = 'America/Recife';
  
  private constructor(private readonly value: Date) {
    if (isNaN(value.getTime())) {
      throw new Error('Invalid date provided to DateTime');
    }
  }

  // Factory Methods - SUBSTITUI todas as conversões manuais
  static fromDate(date: Date): DateTime {
    return new DateTime(new Date(date));
  }

  static fromTimestamp(timestamp: Timestamp): DateTime {
    return new DateTime(timestamp.toDate());
  }

  static fromISO(iso: string): DateTime {
    const date = new Date(iso);
    return new DateTime(date);
  }

  static fromFirestoreData(data: any): DateTime {
    if (data?.toDate) {
      return DateTime.fromTimestamp(data);
    }
    if (typeof data === 'string') {
      return DateTime.fromISO(data);
    }
    if (data instanceof Date) {
      return DateTime.fromDate(data);
    }
    if (data?.seconds) {
      // Firestore Timestamp object
      return new DateTime(new Date(data.seconds * 1000));
    }
    throw new Error(`Cannot convert ${typeof data} to DateTime`);
  }

  static now(): DateTime {
    return new DateTime(new Date());
  }

  static nowInBrazil(): DateTime {
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString('en-US', { 
      timeZone: DateTime.TIMEZONE_BRAZIL 
    }));
    return new DateTime(brazilTime);
  }

  // Conversion Methods - PADRONIZA todas as saídas
  toDate(): Date {
    return new Date(this.value);
  }

  toISO(): string {
    return this.value.toISOString();
  }

  toTimestamp(): Timestamp {
    return Timestamp.fromDate(this.value);
  }

  toFirestoreData(): Timestamp {
    return this.toTimestamp();
  }

  // Formatting Methods - SUBSTITUI format() manual
  format(pattern: string = 'dd/MM/yyyy', locale: string = 'pt-BR'): string {
    const options: Intl.DateTimeFormatOptions = this.getFormatOptions(pattern);
    return new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: DateTime.TIMEZONE_BRAZIL
    }).format(this.value);
  }

  formatTime(): string {
    return this.format('HH:mm');
  }

  formatDate(): string {
    return this.format('dd/MM/yyyy');
  }

  formatDateTime(): string {
    return this.format('dd/MM/yyyy HH:mm');
  }

  formatRelative(): string {
    const now = DateTime.now();
    const diffInDays = this.diffInDays(now);
    
    if (diffInDays === 0) return 'Hoje';
    if (diffInDays === 1) return 'Amanhã';
    if (diffInDays === -1) return 'Ontem';
    if (diffInDays > 1 && diffInDays <= 7) return `Em ${diffInDays} dias`;
    if (diffInDays < -1 && diffInDays >= -7) return `${Math.abs(diffInDays)} dias atrás`;
    
    return this.formatDate();
  }

  // Comparison Methods
  isBefore(other: DateTime): boolean {
    return this.value.getTime() < other.value.getTime();
  }

  isAfter(other: DateTime): boolean {
    return this.value.getTime() > other.value.getTime();
  }

  isSameDay(other: DateTime): boolean {
    return this.toDateString() === other.toDateString();
  }

  isToday(): boolean {
    return this.isSameDay(DateTime.nowInBrazil());
  }

  isFuture(): boolean {
    return this.isAfter(DateTime.nowInBrazil());
  }

  isPast(): boolean {
    return this.isBefore(DateTime.nowInBrazil());
  }

  // Manipulation Methods
  addDays(days: number): DateTime {
    const newDate = new Date(this.value);
    newDate.setDate(newDate.getDate() + days);
    return new DateTime(newDate);
  }

  addHours(hours: number): DateTime {
    const newDate = new Date(this.value);
    newDate.setHours(newDate.getHours() + hours);
    return new DateTime(newDate);
  }

  addMinutes(minutes: number): DateTime {
    const newDate = new Date(this.value);
    newDate.setMinutes(newDate.getMinutes() + minutes);
    return new DateTime(newDate);
  }

  startOfDay(): DateTime {
    const newDate = new Date(this.value);
    newDate.setHours(0, 0, 0, 0);
    return new DateTime(newDate);
  }

  endOfDay(): DateTime {
    const newDate = new Date(this.value);
    newDate.setHours(23, 59, 59, 999);
    return new DateTime(newDate);
  }

  // Utility Methods
  diffInDays(other: DateTime): number {
    const diffInMs = this.value.getTime() - other.value.getTime();
    return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  }

  diffInHours(other: DateTime): number {
    const diffInMs = this.value.getTime() - other.value.getTime();
    return Math.floor(diffInMs / (1000 * 60 * 60));
  }

  diffInMinutes(other: DateTime): number {
    const diffInMs = this.value.getTime() - other.value.getTime();
    return Math.floor(diffInMs / (1000 * 60));
  }

  getWeekday(): number {
    return this.value.getDay();
  }

  getWeekdayName(): string {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const day = days[this.getWeekday()];
    return day || 'Desconhecido';
  }

  isValid(): boolean {
    return !isNaN(this.value.getTime());
  }

  isBusinessDay(): boolean {
    const weekday = this.getWeekday();
    return weekday >= 1 && weekday <= 5;
  }

  isWeekend(): boolean {
    const weekday = this.getWeekday();
    return weekday === 0 || weekday === 6;
  }

  private toDateString(): string {
    return this.value.toDateString();
  }

  private getFormatOptions(pattern: string): Intl.DateTimeFormatOptions {
    const options: Intl.DateTimeFormatOptions = {};
    
    if (pattern.includes('dd')) {
      options.day = '2-digit';
    }
    if (pattern.includes('MM')) {
      options.month = '2-digit';
    }
    if (pattern.includes('yyyy')) {
      options.year = 'numeric';
    }
    if (pattern.includes('HH')) {
      options.hour = '2-digit';
      options.hour12 = false;
    }
    if (pattern.includes('mm')) {
      options.minute = '2-digit';
    }
    
    return options;
  }

  toString(): string {
    return this.toISO();
  }

  valueOf(): number {
    return this.value.getTime();
  }

  toJSON(): string {
    return this.toISO();
  }
}

// Helper Functions para migração
export function createDateTimeFromAny(value: any): DateTime {
  if (value instanceof DateTime) return value;
  return DateTime.fromFirestoreData(value);
}

export function isDateTime(value: any): value is DateTime {
  return value instanceof DateTime;
}
