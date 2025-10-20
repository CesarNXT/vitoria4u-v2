/**
 * 🔐 LISTA DE ADMINISTRADORES
 * 
 * ✅ SIMPLES E DIRETO
 * ✅ SEM GAMBIARRA
 * ✅ SEM Firestore desnecessário
 * ✅ SEM custom claims
 * ✅ SEM endpoints de setup
 * 
 * Para adicionar/remover admin: EDITE ESTE ARQUIVO
 */

export const ADMIN_EMAILS: string[] = [
  'italocesar.hd@gmail.com',
  'eduardosoarestonon@gmail.com',
];

/**
 * Verifica se email é admin
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === normalized);
}
