'use server'

import { isServerAdmin } from '@/lib/server-admin-utils';

/**
 * ✅ SEGURANÇA CORRIGIDA: Usa isServerAdmin (server-only)
 */
export async function verifyAdmin(email: string): Promise<{ isAdmin: boolean }> {
  const isAdmin = await isServerAdmin(email);
  return { isAdmin };
}
