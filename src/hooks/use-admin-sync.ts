/**
 * ⚠️ DEPRECADO: Hook desabilitado
 * 
 * Não é necessário sincronizar documento admin no Firestore client-side.
 * A verificação de admin é feita via:
 * 1. Custom claims do Firebase Auth (token JWT)
 * 2. Collection system_admins (server-side)
 * 
 * Firestore Rules não permitem escrita client-side na collection 'admin'
 * Isso é correto por segurança!
 */
export function useAdminSync() {
    // Hook vazio - não faz nada
    // Mantido apenas para não quebrar imports existentes
}
