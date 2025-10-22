import { getAuth, signOut } from 'firebase/auth';

/**
 * 🔥 Detecta se o erro é causado por reinício do servidor
 * Quando o servidor reinicia, server actions falham com erros específicos
 */
export function isServerRestartError(error: any): boolean {
  if (!error) return false;
  
  const message = error?.message?.toLowerCase() || '';
  const digest = error?.digest?.toLowerCase() || '';
  
  return (
    message.includes('unexpected response') ||
    message.includes('fetch failed') ||
    message.includes('network error') ||
    digest.includes('next')
  );
}

/**
 * 🔄 Lida com erro de servidor reiniciado
 * Limpa tudo e redireciona para login
 */
export async function handleServerRestartError() {
  console.warn('🔄 Servidor reiniciado detectado. Limpando sessão e redirecionando...');
  
  // Limpar localStorage e sessionStorage
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
  }
  
  // Limpar Firebase auth
  try {
    const auth = getAuth();
    await signOut(auth).catch(() => {});
  } catch {
    // Ignorar erros ao fazer logout
  }
  
  // Limpar cookies via API
  try {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  } catch {
    // Ignorar erros na API
  }
  
  // Redirecionar para login
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

/**
 * 🛡️ Wrapper para server actions que detecta e trata erros de servidor
 * Uso: wrapServerAction(() => minhaServerAction())
 */
export async function wrapServerAction<T>(
  action: () => Promise<T>,
  onServerRestart?: () => void
): Promise<T | null> {
  try {
    return await action();
  } catch (error) {
    console.error('Server action error:', error);
    
    if (isServerRestartError(error)) {
      if (onServerRestart) {
        onServerRestart();
      } else {
        await handleServerRestartError();
      }
      return null;
    }
    
    throw error;
  }
}
