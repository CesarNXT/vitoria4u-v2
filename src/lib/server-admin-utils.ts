"use server";

export async function isServerAdmin(email: string | null | undefined): Promise<boolean> {
    if (!email) return false;
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim());
    return adminEmails.includes(email);
}

export async function requireAdmin(email: string | null | undefined): Promise<void> {
    const isAdmin = await isServerAdmin(email);
    if (!isAdmin) {
        throw new Error('Acesso negado. Apenas administradores podem executar esta ação.');
    }
}
