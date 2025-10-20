"use server";

import { isAdminEmail } from './admin-list';

/**
 * ✅ SOLUÇÃO DEFINITIVA: Lista de admins no código
 * SEM GAMBIARRA - SEM Firestore - SEM custom claims
 */
export async function isServerAdmin(email: string | null | undefined): Promise<boolean> {
    return isAdminEmail(email);
}

export async function requireAdmin(email: string | null | undefined): Promise<void> {
    const isAdmin = await isServerAdmin(email);
    if (!isAdmin) {
        throw new Error('Acesso negado. Apenas administradores podem executar esta ação.');
    }
}
