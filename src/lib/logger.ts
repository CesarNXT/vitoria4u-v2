/**
 * 🔐 Sistema de Logging com Sanitização de Dados Sensíveis
 * 
 * Este módulo fornece logging seguro que automaticamente remove/oculta
 * dados sensíveis antes de registrá-los.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Campos considerados sensíveis (case-insensitive)
 */
const SENSITIVE_FIELDS = [
  'password',
  'senha',
  'token',
  'secret',
  'key',
  'apikey',
  'api_key',
  'accesstoken',
  'access_token',
  'idtoken',
  'id_token',
  'refreshtoken',
  'refresh_token',
  'sessioncookie',
  'session_cookie',
  'authorization',
  'cpf',
  'cnpj',
  'credit_card',
  'creditcard',
  'card_number',
  'cvv',
  'cvc',
  'pin',
];

/**
 * Padrões de dados sensíveis (regex)
 */
const SENSITIVE_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+?55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}[-.\s]?\d{4}/g,
  cpf: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g,
  creditCard: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g,
};

/**
 * 🔒 Sanitiza dados sensíveis para logging
 * 
 * Remove ou oculta informações sensíveis como:
 * - Emails → em***@exemplo.com
 * - Telefones → (11) 9****-1234
 * - Tokens → tok_***
 * - Senhas → [REDACTED]
 * - CPF → ***.123.456-**
 * 
 * @param data - Dados a serem sanitizados (string, object, array)
 * @returns Dados sanitizados seguros para log
 */
export function sanitizeForLog(data: any): any {
  // Null ou undefined
  if (data === null || data === undefined) {
    return data;
  }

  // String
  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  // Number, Boolean, etc
  if (typeof data !== 'object') {
    return data;
  }

  // Array
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLog(item));
  }

  // Object
  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const lowerKey = key.toLowerCase();
      
      // Campo sensível identificado pelo nome
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLog(data[key]);
      }
    }
  }
  
  return sanitized;
}

/**
 * Sanitiza strings aplicando máscaras em dados sensíveis
 */
function sanitizeString(str: string): string {
  let sanitized = str;

  // Ocultar emails: exemplo@dominio.com → ex***@dominio.com
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.email, (email) => {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `**@${domain}`;
    return `${local.substring(0, 2)}***@${domain}`;
  });

  // Ocultar telefones: (11) 98765-4321 → (11) 9****-4321
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.phone, (phone) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 8) {
      const last4 = digits.slice(-4);
      const ddd = digits.length >= 10 ? `(${digits.slice(-11, -9)}) ` : '';
      return `${ddd}****-${last4}`;
    }
    return '****';
  });

  // Ocultar CPF: 123.456.789-00 → ***.456.789-**
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.cpf, (cpf) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length === 11) {
      return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
    }
    return '***';
  });

  // Ocultar cartão de crédito: 1234 5678 9012 3456 → **** **** **** 3456
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.creditCard, () => {
    return '**** **** **** ****';
  });

  return sanitized;
}

/**
 * Classe Logger com níveis de log e sanitização automática
 */
class Logger {
  private isDevelopment: boolean;
  private isServer: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.isServer = typeof window === 'undefined';
  }

  /**
   * Log de debug - APENAS no servidor e em desenvolvimento
   */
  debug(message: string, data?: any) {
    // 🔒 NUNCA loga no navegador
    if (this.isServer && this.isDevelopment) {
      const sanitized = data ? sanitizeForLog(data) : '';
      console.log(`[DEBUG] ${message}`, sanitized);
    }
  }

  /**
   * Log de informação - APENAS no servidor
   */
  info(message: string, data?: any) {
    // 🔒 NUNCA loga no navegador
    if (this.isServer) {
      const sanitized = data ? sanitizeForLog(data) : '';
      console.log(`[INFO] ${message}`, sanitized);
    }
  }

  /**
   * Log de aviso - APENAS no servidor
   */
  warn(message: string, data?: any) {
    // 🔒 NUNCA loga no navegador
    if (this.isServer) {
      const sanitized = data ? sanitizeForLog(data) : '';
      console.warn(`[WARN] ${message}`, sanitized);
    }
  }

  /**
   * Log de erro - APENAS no servidor
   */
  error(message: string, error?: any) {
    // 🔒 NUNCA loga no navegador
    if (this.isServer) {
      const sanitized = error ? sanitizeForLog(error) : '';
      console.error(`[ERROR] ${message}`, sanitized);
    }
  }

  /**
   * Log de sucesso - APENAS no servidor e em desenvolvimento
   */
  success(message: string, data?: any) {
    // 🔒 NUNCA loga no navegador
    if (this.isServer && this.isDevelopment) {
      const sanitized = data ? sanitizeForLog(data) : '';
      console.log(`✅ [SUCCESS] ${message}`, sanitized);
    }
  }
}

// Exportar instância única do logger
export const logger = new Logger();

// Exportar também funções individuais para compatibilidade
export const logDebug = (message: string, data?: any) => logger.debug(message, data);
export const logInfo = (message: string, data?: any) => logger.info(message, data);
export const logWarn = (message: string, data?: any) => logger.warn(message, data);
export const logError = (message: string, error?: any) => logger.error(message, error);
export const logSuccess = (message: string, data?: any) => logger.success(message, data);
