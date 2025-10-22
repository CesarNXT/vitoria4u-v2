/**
 * 💰 Money Value Object - IMPLEMENTAÇÃO REAL
 * Substitui TODAS as gambiarras de formatação de dinheiro
 */

export class Money {
  private readonly amount: number;
  private readonly currency: string;

  private constructor(amount: number, currency: string = 'BRL') {
    this.amount = this.validateAndNormalize(amount);
    this.currency = currency.toUpperCase();
  }

  static create(amount: number | string, currency: string = 'BRL'): Money {
    const numAmount = typeof amount === 'string' ? this.parseAmount(amount) : amount;
    return new Money(numAmount, currency);
  }

  static fromAny(value: any, currency: string = 'BRL'): Money {
    if (value instanceof Money) return value;
    return Money.create(value, currency);
  }

  static zero(currency: string = 'BRL'): Money {
    return new Money(0, currency);
  }

  // Parse string values like "R$ 1.234,56" or "1234.56"
  private static parseAmount(value: string): number {
    // Remove currency symbols and spaces
    let cleaned = value.replace(/[R$\s]/g, '');
    
    // Handle Brazilian format (1.234,56)
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Has both comma and dot - assume Brazilian format
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      // Only comma - could be decimal separator
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1] && parts[1].length <= 2) {
        // Decimal separator
        cleaned = cleaned.replace(',', '.');
      } else {
        // Thousands separator
        cleaned = cleaned.replace(/,/g, '');
      }
    }
    
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) {
      throw new Error(`Invalid money amount: ${value}`);
    }
    
    return parsed;
  }

  private validateAndNormalize(amount: number): number {
    if (isNaN(amount) || !isFinite(amount)) {
      throw new Error(`Invalid money amount: ${amount}`);
    }
    
    if (amount < 0) {
      throw new Error(`Money amount cannot be negative: ${amount}`);
    }
    
    // Round to 2 decimal places to avoid floating point issues
    return Math.round(amount * 100) / 100;
  }

  // Getters
  get value(): number {
    return this.amount;
  }

  get currencyCode(): string {
    return this.currency;
  }

  get cents(): number {
    return Math.round(this.amount * 100);
  }

  // Arithmetic operations
  add(other: Money): Money {
    this.validateSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.validateSameCurrency(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new Error('Subtraction would result in negative amount');
    }
    return new Money(result, this.currency);
  }

  multiply(factor: number): Money {
    if (isNaN(factor) || !isFinite(factor) || factor < 0) {
      throw new Error(`Invalid multiplication factor: ${factor}`);
    }
    return new Money(this.amount * factor, this.currency);
  }

  divide(divisor: number): Money {
    if (isNaN(divisor) || !isFinite(divisor) || divisor <= 0) {
      throw new Error(`Invalid division factor: ${divisor}`);
    }
    return new Money(this.amount / divisor, this.currency);
  }

  percentage(percent: number): Money {
    return this.multiply(percent / 100);
  }

  // Comparison
  equals(other: Money): boolean {
    this.validateSameCurrency(other);
    return this.amount === other.amount;
  }

  isGreaterThan(other: Money): boolean {
    this.validateSameCurrency(other);
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    this.validateSameCurrency(other);
    return this.amount < other.amount;
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  isPositive(): boolean {
    return this.amount > 0;
  }

  // Formatting
  format(locale: string = 'pt-BR'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(this.amount);
  }

  formatCompact(locale: string = 'pt-BR'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(this.amount);
  }

  formatWithoutSymbol(locale: string = 'pt-BR'): string {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(this.amount);
  }

  formatForInput(): string {
    // Format for input fields (Brazilian format: 1.234,56)
    return this.amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Validation helper
  private validateSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot operate on different currencies: ${this.currency} vs ${other.currency}`);
    }
  }

  // Serialization
  toString(): string {
    return this.format();
  }

  toJSON(): number {
    return this.amount;
  }

  valueOf(): number {
    return this.amount;
  }

  toObject(): { amount: number; currency: string } {
    return {
      amount: this.amount,
      currency: this.currency
    };
  }

  // Static utilities
  static isValid(value: any): boolean {
    try {
      Money.create(value);
      return true;
    } catch {
      return false;
    }
  }

  static format(value: number | string, currency: string = 'BRL', locale: string = 'pt-BR'): string {
    try {
      return Money.create(value, currency).format(locale);
    } catch {
      return typeof value === 'string' ? value : value.toString();
    }
  }

  static sum(moneys: Money[]): Money {
    if (moneys.length === 0) {
      return Money.zero();
    }
    
    const firstMoney = moneys[0];
    if (!firstMoney) {
      return Money.zero();
    }
    
    const currency = firstMoney.currency;
    const total = moneys.reduce((sum, money) => {
      if (money.currency !== currency) {
        throw new Error('Cannot sum different currencies');
      }
      return sum + money.amount;
    }, 0);
    
    return new Money(total, currency);
  }

  static max(...moneys: Money[]): Money {
    if (moneys.length === 0) {
      throw new Error('Cannot find max of empty array');
    }
    
    return moneys.reduce((max, current) => 
      current.isGreaterThan(max) ? current : max
    );
  }

  static min(...moneys: Money[]): Money {
    if (moneys.length === 0) {
      throw new Error('Cannot find min of empty array');
    }
    
    return moneys.reduce((min, current) => 
      current.isLessThan(min) ? current : min
    );
  }
}

// Helper Functions para migração
export function createMoneyFromAny(value: any, currency: string = 'BRL'): Money {
  if (value instanceof Money) return value;
  return Money.create(value, currency);
}

export function isMoney(value: any): value is Money {
  return value instanceof Money;
}

export function formatMoney(value: number | string, currency: string = 'BRL'): string {
  return Money.format(value, currency);
}
