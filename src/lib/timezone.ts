/**
 * Utilitários para manipulação de timezone (America/Recife)
 */

const TIMEZONE_RECIFE = 'America/Recife';

/**
 * Converte data UTC para timezone de Recife
 */
export function utcParaRecife(data: Date): Date {
  return new Date(data.toLocaleString('en-US', { timeZone: TIMEZONE_RECIFE }));
}

/**
 * Converte data de Recife para UTC
 */
export function recifeParaUTC(data: Date): Date {
  const offsetRecife = getOffsetRecife(data);
  return new Date(data.getTime() - offsetRecife);
}

/**
 * Obtém o offset de Recife em millisegundos
 */
function getOffsetRecife(data: Date): number {
  const utcDate = new Date(data.toLocaleString('en-US', { timeZone: 'UTC' }));
  const recifeDate = new Date(data.toLocaleString('en-US', { timeZone: TIMEZONE_RECIFE }));
  return utcDate.getTime() - recifeDate.getTime();
}

/**
 * Verifica se uma data está em horário de verão (Recife não tem, mas boa prática)
 */
export function isHorarioVerao(data: Date): boolean {
  // Recife (UTC-3) não tem horário de verão desde 2019
  return false;
}

/**
 * Formata data/hora para exibição em pt-BR (timezone Recife)
 */
export function formatarDataHoraBR(data: Date, incluirHora = true): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: TIMEZONE_RECIFE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(incluirHora && {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
  
  return new Intl.DateTimeFormat('pt-BR', options).format(data);
}

/**
 * Obtém data/hora atual em Recife
 */
export function agoraEmRecife(): Date {
  return utcParaRecife(new Date());
}
