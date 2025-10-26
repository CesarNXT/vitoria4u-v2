/**
 * Biblioteca de formatação e validação de telefones
 * Consolida código duplicado de formatação de telefone em um único lugar
 */

/**
 * Formata um número de telefone para exibição legível
 * 
 * @param phone - Número de telefone (string ou number)
 * @returns Telefone formatado como (DDD) 9XXXX-XXXX ou (DDD) XXXX-XXXX
 * 
 * @example
 * formatPhone(5581999887766) // "(81) 99988-7766"
 * formatPhone("81999887766") // "(81) 99988-7766"
 * formatPhone("8199887766") // "(81) 9988-7766"
 */
export function formatPhone(phone: string | number): string {
  const cleaned = phone.toString().replace(/\D/g, '');
  
  // Telefone com 11 dígitos (DDD + 9 + número)
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  }
  
  // Telefone com 10 dígitos (DDD + número sem 9)
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  
  // Se não tiver 10 ou 11 dígitos, retorna apenas números
  return cleaned;
}

/**
 * Limpa um número de telefone removendo caracteres especiais
 * 
 * @param phone - Número de telefone com ou sem formatação
 * @returns Apenas números
 * 
 * @example
 * cleanPhone("(81) 99988-7766") // "81999887766"
 * cleanPhone("+55 81 99988-7766") // "5581999887766"
 */
export function cleanPhone(phone: string | number): string {
  return phone.toString().replace(/\D/g, '');
}

/**
 * Valida se um telefone brasileiro é válido
 * 
 * @param phone - Número de telefone para validar
 * @returns true se válido, false se inválido
 * 
 * @example
 * isValidPhone("81999887766") // true
 * isValidPhone("8199887766") // true
 * isValidPhone("123") // false
 */
export function isValidPhone(phone: string | number): boolean {
  const cleaned = cleanPhone(phone);
  
  // Deve ter 10 ou 11 dígitos
  if (cleaned.length !== 10 && cleaned.length !== 11) {
    return false;
  }
  
  // DDD deve estar entre 11 e 99
  const ddd = parseInt(cleaned.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) {
    return false;
  }
  
  // Se tiver 11 dígitos, o terceiro deve ser 9
  if (cleaned.length === 11 && cleaned[2] !== '9') {
    return false;
  }
  
  return true;
}

/**
 * Adiciona código do país (+55) ao telefone
 * 
 * @param phone - Número de telefone brasileiro
 * @returns Telefone com código do país
 * 
 * @example
 * addCountryCode("81999887766") // "5581999887766"
 */
export function addCountryCode(phone: string | number): string {
  const cleaned = cleanPhone(phone);
  
  // Se já tiver código do país, retorna como está
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return cleaned;
  }
  
  return `55${cleaned}`;
}

/**
 * Formata telefone para WhatsApp (apenas números com código do país)
 * 
 * @param phone - Número de telefone
 * @returns Telefone formatado para WhatsApp API
 * 
 * @example
 * formatPhoneForWhatsApp("(81) 99988-7766") // "5581999887766"
 */
export function formatPhoneForWhatsApp(phone: string | number): string {
  return addCountryCode(phone);
}

/**
 * Ofusca parte do telefone para exibição pública
 * 
 * @param phone - Número de telefone
 * @returns Telefone parcialmente ofuscado
 * 
 * @example
 * obfuscatePhone("81999887766") // "(81) 9****-7766"
 */
export function obfuscatePhone(phone: string | number): string {
  const cleaned = cleanPhone(phone);
  
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned[2]}****-${cleaned.substring(7)}`;
  }
  
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ****-${cleaned.substring(6)}`;
  }
  
  return '***';
}
