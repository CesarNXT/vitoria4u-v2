"use server";

import { isEmailAdmin } from './admin-firestore';

/**
 * ✅ CORREÇÃO: Usa Firestore ao invés de .env
 */
export async function isServerAdmin(email: string | null | undefined): Promise<boolean> {
    if (!email) return false;
    
    // Usar Firestore (enterprise-grade)
    return await isEmailAdmin(email);
}

export async function requireAdmin(email: string | null | undefined): Promise<void> {
    const isAdmin = await isServerAdmin(email);
    if (!isAdmin) {
        throw new Error('Acesso negado. Apenas administradores podem executar esta ação.');
    }
}
