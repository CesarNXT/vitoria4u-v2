import { adminAuth } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';
import { isAdminEmail } from '@/lib/admin-list';

/**
 * ✅ Valida se o usuário é administrador (usando lista estática)
 * @param uid - UID do usuário Firebase
 * @returns true se for admin, false caso contrário
 */
export async function isAdmin(uid: string): Promise<boolean> {
    if (!uid) return false;

    try {
        const user = await adminAuth.getUser(uid);
        return isAdminEmail(user.email);
    } catch (error) {
        logger.error('Erro ao verificar admin', { uid, error });
        return false;
    }
}

/**
 * ✅ Valida se o email é de um administrador (usando lista estática)
 * @param email - Email do usuário
 * @returns true se for admin, false caso contrário
 */
export async function isAdminByEmail(email: string): Promise<boolean> {
    if (!email) return false;
    return isAdminEmail(email);
}
