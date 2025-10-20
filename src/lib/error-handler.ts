/**
 * ✅ TRATAMENTO CENTRALIZADO DE ERROS
 * Remove console.error para não poluir o console do navegador
 * Apenas loga erros em desenvolvimento no servidor
 */

type ErrorContext = {
  context?: string;
  userId?: string;
  businessId?: string;
  [key: string]: any;
};

/**
 * Trata erro silenciosamente (não mostra no console do navegador)
 * Apenas loga no servidor em desenvolvimento
 */
export function handleError(error: unknown, context?: ErrorContext): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Em produção, apenas retorna a mensagem
  // Em desenvolvimento, loga apenas no servidor (não no navegador)
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${context?.context || 'Unknown'}:`, {
      message: errorMessage,
      ...context
    });
  }
  
  return errorMessage;
}

/**
 * Extrai mensagem de erro amigável para mostrar ao usuário
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

/**
 * Verifica se é um erro de rede
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('fetch') || 
           error.message.includes('network') ||
           error.message.includes('Failed to fetch');
  }
  return false;
}

/**
 * Verifica se é um erro de autenticação
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('401') ||
           error.message.includes('403') ||
           error.message.includes('Unauthorized') ||
           error.message.includes('unauthenticated');
  }
  return false;
}
