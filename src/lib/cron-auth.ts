/**
 * Middleware de Autenticação para Cron Jobs
 * Consolida a validação de autenticação em um único lugar
 */

/**
 * Valida se a requisição tem o token correto de autenticação de cron
 * 
 * @param request - Request do Next.js
 * @returns true se autenticado, false se não autenticado
 * 
 * @example
 * export async function GET(request: Request) {
 *   if (!validateCronAuth(request)) {
 *     return new Response('Unauthorized', { status: 401 });
 *   }
 *   // ... resto do código
 * }
 */
export function validateCronAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return false;
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  if (!token) {
    return false;
  }
  
  return token === process.env.CRON_SECRET;
}

/**
 * Retorna uma Response de erro de autenticação
 * Útil para manter consistência nas respostas de erro
 * 
 * @returns Response com status 401
 * 
 * @example
 * if (!validateCronAuth(request)) {
 *   return unauthorizedResponse();
 * }
 */
export function unauthorizedResponse(): Response {
  return new Response('Unauthorized', { 
    status: 401,
    headers: {
      'Content-Type': 'text/plain'
    }
  });
}

/**
 * Middleware completo que valida e retorna erro se necessário
 * Retorna null se autenticado, ou Response de erro se não autenticado
 * 
 * @param request - Request do Next.js
 * @returns null se OK, ou Response de erro
 * 
 * @example
 * export async function GET(request: Request) {
 *   const authError = checkCronAuth(request);
 *   if (authError) return authError;
 *   
 *   // ... resto do código
 * }
 */
export function checkCronAuth(request: Request): Response | null {
  if (!validateCronAuth(request)) {
    return unauthorizedResponse();
  }
  return null;
}
