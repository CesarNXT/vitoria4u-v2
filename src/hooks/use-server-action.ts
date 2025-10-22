import { useCallback } from 'react';
import { isServerRestartError, handleServerRestartError } from '@/lib/server-error-handler';

/**
 * 🛡️ Hook para executar server actions com tratamento automático de erro de reinício
 * 
 * Exemplo de uso:
 * ```tsx
 * const executeServerAction = useServerAction();
 * 
 * const handleClick = async () => {
 *   const result = await executeServerAction(
 *     () => minhaServerAction(param1, param2)
 *   );
 *   if (result) {
 *     // Sucesso
 *   }
 * };
 * ```
 */
export function useServerAction() {
  return useCallback(async <T>(
    action: () => Promise<T>,
    options?: {
      onError?: (error: any) => void;
      onServerRestart?: () => void;
    }
  ): Promise<T | null> => {
    try {
      return await action();
    } catch (error) {
      console.error('Server action error:', error);
      
      // Se servidor reiniciou, redirecionar para login
      if (isServerRestartError(error)) {
        if (options?.onServerRestart) {
          options.onServerRestart();
        } else {
          await handleServerRestartError();
        }
        return null;
      }
      
      // Erro normal - chamar callback se fornecido
      if (options?.onError) {
        options.onError(error);
      } else {
        throw error;
      }
      
      return null;
    }
  }, []);
}
