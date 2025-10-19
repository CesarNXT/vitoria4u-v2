import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';
import { isUserAdmin } from '@/lib/admin-firestore';

/**
 * ✅ Valida se o usuário é administrador (ATUALIZADO para usar system_admins)
 * @param uid - UID do usuário Firebase
 * @returns true se for admin, false caso contrário
 */
export async function isAdmin(uid: string): Promise<boolean> {
    if (!uid) return false;

    try {
        // Usar função do admin-firestore (sistema correto)
        return await isUserAdmin(uid);
    } catch (error) {
        logger.error('Erro ao verificar admin', { uid, error });
        return false;
    }
}

/**
 * ✅ Valida se o email é de um administrador (ATUALIZADO para usar system_admins)
 * @param email - Email do usuário
 * @returns true se for admin, false caso contrário
 */
export async function isAdminByEmail(email: string): Promise<boolean> {
    if (!email) return false;

    try {
        const snapshot = await adminDb.collection('system_admins')
            .where('email', '==', email.toLowerCase())
            .where('active', '==', true)
            .limit(1)
            .get();
        
        return !snapshot.empty;
    } catch (error) {
        logger.error('Erro ao verificar admin por email', { email, error });
        return false;
    }
}
