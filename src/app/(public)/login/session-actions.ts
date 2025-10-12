"use server";

import { createSession, destroySession } from '@/lib/session';

/**
 * 🔒 Cria uma sessão segura após login bem-sucedido
 * Deve ser chamada após signInWithEmailAndPassword ou signInWithPopup
 */
export async function createUserSession(idToken: string) {
  return await createSession(idToken);
}

/**
 * 🔒 Destrói a sessão no logout
 */
export async function destroyUserSession() {
  await destroySession();
}
