/**
 * 📱 Phone Value Object - IMPLEMENTAÇÃO OTIMIZADA
 * 
 * ✅ FIRESTORE: 11 dígitos (formato nacional brasileiro)
 * ✅ WHATSAPP API: 13 dígitos (com DDI +55)
 * ✅ DISPLAY: Formatado (11) 99999-9999
 * 
 * Regras de Conversão:
 * - Sistema aceita APENAS celulares (11 dígitos)
 * - Converte automaticamente 10 dígitos para 11 (adiciona 9)
 * - Remove 0 inicial se presente (ex: 081988924282 → 81988924282)
 * - Remove DDI 55 se presente (ex: 5581988924282 → 81988924282)
 * - DDD deve ser válido (11-99)
 * - 3º dígito sempre 9 (celular)
 * 
 * Exemplos de entrada → saída:
 * - 81988924282 → 81988924282 (11 dígitos - OK)
 * - 8188924282 → 81988924282 (10 dígitos - adiciona 9)
 * - 081988924282 → 81988924282 (12 dígitos com 0 - remove 0)
 * - 5581988924282 → 81988924282 (13 dígitos com DDI - remove DDI)
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
  private readonly fullNumber: string; // 13 dígitos: +55 + 11 dígitos (para WhatsApp)
  private readonly countryCode: string; // '55' (Brasil)
  private readonly nationalNumber: string; // 11 dígitos - SALVOS NO FIRESTORE
  
  private constructor(phone: string, country: CountryCode = 'BR') {
    let cleaned = this.cleanPhone(phone);
    
    // ✅ PASSO 1: Remove 0 inicial se presente (ex: 081988924282 → 81988924282)
    if (cleaned.startsWith('0') && cleaned.length >= 11) {
      cleaned = cleaned.substring(1);
    }
    
    // ✅ PASSO 2: Remove DDI 55 se presente (ex: 5581988924282 → 81988924282)
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
      cleaned = cleaned.substring(2);
    }
    
    // ✅ PASSO 3: Se ainda começar com 0 após remover DDI, remove novamente
    if (cleaned.startsWith('0') && cleaned.length >= 11) {
      cleaned = cleaned.substring(1);
    }
    
    // ✅ PASSO 4: GARANTIR SEMPRE 11 DÍGITOS - Adicionar o 9 se necessário
    if (cleaned.length === 10) {
      const ddd = cleaned.substring(0, 2);
      const numero = cleaned.substring(2);
      cleaned = ddd + '9' + numero;
    }
    
    // Se tiver 9 dígitos, adicionar 0 no DDD
    if (cleaned.length === 9) {
      cleaned = '0' + cleaned.substring(0, 1) + '9' + cleaned.substring(1);
    }
    
    // Se tiver mais de 11 dígitos, pegar apenas os últimos 11
    if (cleaned.length > 11) {
      cleaned = cleaned.slice(-11);
    }
    
    // Número brasileiro deve ter exatamente 11 dígitos
    if (cleaned.length === 11) {
      this.countryCode = COUNTRY_CODES[country];
      this.nationalNumber = cleaned;
      this.fullNumber = this.countryCode + cleaned;
    } else {
      throw new Error(`Formato de telefone inválido: ${phone} - deve ter 11 dígitos (atual: ${cleaned.length})`);
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
      // ✅ Validação brasileira: DEVE ter exatamente 11 dígitos
      if (this.nationalNumber.length !== 11) {
        throw new Error(`Telefone brasileiro deve ter 11 dígitos: ${this.nationalNumber}`);
      }

      // Deve começar com DDD válido (11-99)
      const ddd = parseInt(this.nationalNumber.substring(0, 2));
      if (ddd < 11 || ddd > 99) {
        throw new Error(`DDD inválido: ${ddd}`);
      }

      // O 3º dígito SEMPRE deve ser 9 (celular) - sistema não aceita fixo
      const thirdDigit = this.nationalNumber.charAt(2);
      if (thirdDigit !== '9') {
        throw new Error(`Apenas celulares são aceitos (deve começar com 9): ${this.nationalNumber}`);
      }
    }
    
    // Validação geral: deve ter exatamente 13 dígitos no total (DDI + 11)
    if (this.fullNumber.length !== 13) {
      throw new Error(`Número internacional inválido: ${this.fullNumber}`);
    }
  }

  // Getters
  get raw(): string {
    return this.nationalNumber; // ✅ 11 dígitos - PARA SALVAR NO FIRESTORE
  }

  get fullRaw(): string {
    return this.fullNumber; // ✅ 13 dígitos - PARA WHATSAPP API
  }

  get ddd(): string {
    return this.nationalNumber.substring(0, 2); // Primeiros 2 dígitos
  }

  get number(): string {
    return this.nationalNumber.substring(2); // 9 dígitos restantes
  }

  get country(): string {
    return this.countryCode; // '55' para Brasil
  }

  get isCellphone(): boolean {
    return true; // Sempre celular (sistema só aceita 11 dígitos)
  }

  get isLandline(): boolean {
    return false; // Sistema não aceita fixo
  }

  get isBrazilian(): boolean {
    return this.countryCode === '55';
  }

  // Formatação padronizada (sempre celular: 11 dígitos)
  format(): string {
    // (11) 99999-9999
    return `(${this.ddd}) ${this.number.substring(0, 5)}-${this.number.substring(5)}`;
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

  // ✅ Retorna 11 dígitos (para salvar no Firestore)
  static normalize(phone: string | number): string {
    try {
      return Phone.create(phone).raw; // 11 dígitos
    } catch {
      return '';
    }
  }

  // ✅ Retorna 13 dígitos (para WhatsApp API)
  static normalizeFull(phone: string | number): string {
    try {
      return Phone.create(phone).fullRaw; // 13 dígitos com DDI
    } catch {
      return '';
    }
  }

  // ✅ Retorna formatado: (11) 99999-9999
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
