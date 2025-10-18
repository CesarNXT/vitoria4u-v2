import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

/**
 * Valida se o usuário é administrador
 * @param uid - UID do usuário Firebase
 * @returns true se for admin, false caso contrário
 */
export async function isAdmin(uid: string): Promise<boolean> {
    if (!uid) return false;

    try {
        const adminDoc = await adminDb.collection('admin').doc(uid).get();
        return adminDoc.exists && adminDoc.data()?.isAdmin === true;
    } catch (error) {
        logger.error('Erro ao verificar admin', { uid, error });
        return false;
    }
}

/**
 * Valida se o email é de um administrador
 * @param email - Email do usuário
 * @returns true se for admin, false caso contrário
 */
export async function isAdminByEmail(email: string): Promise<boolean> {
    if (!email) return false;

    try {
        const snapshot = await adminDb.collection('admin')
            .where('email', '==', email.toLowerCase())
            .where('isAdmin', '==', true)
            .limit(1)
            .get();
        
        return !snapshot.empty;
    } catch (error) {
        logger.error('Erro ao verificar admin por email', { email, error });
        return false;
    }
}
