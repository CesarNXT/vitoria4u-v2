"use server";

/**
 * 🔒 SEGURANÇA: Validação server-side de admin
 * 
 * Esta função deve ser usada em Server Actions e API Routes
 * para validar se um usuário é admin de forma segura.
 * 
 * TODO: Migrar para Firebase Custom Claims em versão futura
 */
export async function isServerAdmin(email: string | null | undefined): Promise<boolean> {
    if (!email) return false;
    
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim());
    return adminEmails.includes(email);
}

/**
 * Valida se o email fornecido é de um admin
 * Lança erro se não for admin
 */
export async function requireAdmin(email: string | null | undefined): Promise<void> {
    const isAdmin = await isServerAdmin(email);
    if (!isAdmin) {
        throw new Error('Acesso negado. Apenas administradores podem executar esta ação.');
    }
}
