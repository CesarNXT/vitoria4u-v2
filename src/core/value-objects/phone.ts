/**
 * 📱 Phone Value Object - IMPLEMENTAÇÃO INTERNACIONAL
 * Frontend: 11 dígitos (formato brasileiro)
 * Backend/DB: 13 dígitos (+55 + número)
 * Suporte: Todos os países (Brasil como padrão)
 */

// Lista de códigos de país (DDI)
export const COUNTRY_CODES = {
  BR: '55', // Brasil (padrão)
  US: '1',  // Estados Unidos
  AR: '54', // Argentina
  CL: '56', // Chile
  CO: '57', // Colômbia
  PE: '51', // Peru
  UY: '598', // Uruguai
  PY: '595', // Paraguai
  BO: '591', // Bolívia
  EC: '593', // Equador
  VE: '58', // Venezuela
  // Adicionar mais países conforme necessário
} as const;

export type CountryCode = keyof typeof COUNTRY_CODES;

export class Phone {
  private readonly fullNumber: string; // 13 dígitos: +55 + 11 dígitos
  private readonly countryCode: string;
  private readonly nationalNumber: string; // 11 dígitos para Brasil
  
  private constructor(phone: string, country: CountryCode = 'BR') {
    const cleaned = this.cleanPhone(phone);
    
    // Se já tem DDI, extrair
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      this.fullNumber = cleaned;
      this.countryCode = '55';
      this.nationalNumber = cleaned.substring(2);
    } else if (cleaned.length === 11) {
      // Número nacional brasileiro (11 dígitos)
      this.countryCode = COUNTRY_CODES[country];
      this.nationalNumber = cleaned;
      this.fullNumber = this.countryCode + cleaned;
    } else if (cleaned.length === 10) {
      // Telefone fixo brasileiro (10 dígitos)
      this.countryCode = COUNTRY_CODES[country];
      this.nationalNumber = cleaned;
      this.fullNumber = this.countryCode + cleaned;
    } else {
      throw new Error(`Formato de telefone inválido: ${phone}`);
    }
    
    this.validate();
  }

  static create(phone: string | number, country: CountryCode = 'BR'): Phone {
    const phoneStr = typeof phone === 'number' ? phone.toString() : phone;
    return new Phone(phoneStr, country);
  }

  static fromAny(value: any, country: CountryCode = 'BR'): Phone {
    if (value instanceof Phone) return value;
    return Phone.create(value, country);
  }

  // Limpa o telefone removendo caracteres especiais
  private cleanPhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  // Valida telefone brasileiro (pode ser expandido para outros países)
  private validate(): void {
    if (this.countryCode === '55') {
      // Validação brasileira
      if (this.nationalNumber.length < 10 || this.nationalNumber.length > 11) {
        throw new Error(`Telefone brasileiro inválido: ${this.nationalNumber}`);
      }

      // Deve começar com DDD válido (11-99)
      const ddd = parseInt(this.nationalNumber.substring(0, 2));
      if (ddd < 11 || ddd > 99) {
        throw new Error(`DDD inválido: ${ddd}`);
      }

      // Se tem 11 dígitos, o 3º dígito deve ser 9 (celular)
      if (this.nationalNumber.length === 11) {
        const thirdDigit = this.nationalNumber.charAt(2);
        if (thirdDigit !== '9') {
          throw new Error(`Celular deve começar com 9: ${this.nationalNumber}`);
        }
      }
    }
    
    // Validação geral: deve ter exatamente 13 dígitos no total
    if (this.fullNumber.length !== 13 && this.fullNumber.length !== 12) {
      throw new Error(`Número internacional inválido: ${this.fullNumber}`);
    }
  }

  // Getters
  get raw(): string {
    return this.nationalNumber; // Frontend: 11 dígitos
  }

  get fullRaw(): string {
    return this.fullNumber; // Backend: 13 dígitos
  }

  get ddd(): string {
    return this.nationalNumber.substring(0, 2);
  }

  get number(): string {
    return this.nationalNumber.substring(2);
  }

  get country(): string {
    return this.countryCode;
  }

  get isCellphone(): boolean {
    return this.nationalNumber.length === 11;
  }

  get isLandline(): boolean {
    return this.nationalNumber.length === 10;
  }

  get isBrazilian(): boolean {
    return this.countryCode === '55';
  }

  // Formatação padronizada
  format(): string {
    if (this.isCellphone) {
      // (11) 99999-9999
      return `(${this.ddd}) ${this.number.substring(0, 5)}-${this.number.substring(5)}`;
    } else {
      // (11) 9999-9999
      return `(${this.ddd}) ${this.number.substring(0, 4)}-${this.number.substring(4)}`;
    }
  }

  formatForWhatsApp(): string {
    // Formato para WhatsApp: sempre com DDI completo
    return this.fullNumber;
  }

  formatInternational(): string {
    // Formato internacional: +55 (11) 99999-9999
    return `+${this.countryCode} ${this.format()}`;
  }

  formatCompact(): string {
    // Formato compacto: 11999999999 (frontend)
    return this.nationalNumber;
  }

  formatFull(): string {
    // Formato completo: 5511999999999 (backend)
    return this.fullNumber;
  }

  // Comparação
  equals(other: Phone): boolean {
    return this.fullNumber === other.fullNumber;
  }

  // Serialização
  toString(): string {
    return this.format(); // Frontend: formato brasileiro
  }

  toJSON(): string {
    return this.fullNumber; // Backend: sempre 13 dígitos
  }

  valueOf(): string {
    return this.nationalNumber; // Frontend: 11 dígitos
  }

  // Métodos estáticos utilitários
  static isValid(phone: string | number): boolean {
    try {
      Phone.create(phone);
      return true;
    } catch {
      return false;
    }
  }

  static normalize(phone: string | number): string {
    try {
      return Phone.create(phone).raw; // Frontend: 11 dígitos
    } catch {
      return '';
    }
  }

  static normalizeFull(phone: string | number): string {
    try {
      return Phone.create(phone).fullRaw; // Backend: 13 dígitos
    } catch {
      return '';
    }
  }

  static format(phone: string | number): string {
    try {
      return Phone.create(phone).format();
    } catch {
      return typeof phone === 'string' ? phone : phone.toString();
    }
  }
}

// Helper Functions para migração
export function createPhoneFromAny(value: any): Phone {
  if (value instanceof Phone) return value;
  return Phone.create(value);
}

export function isPhone(value: any): value is Phone {
  return value instanceof Phone;
}

export function formatPhoneNumber(phone: string | number): string {
  return Phone.format(phone);
}
