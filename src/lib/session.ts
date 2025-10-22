"use server";

import { cookies } from 'next/headers';
import { adminAuth } from './firebase-admin';

const SESSION_COOKIE_NAME = 'session';
const ADMIN_FLAG_COOKIE = 'admin-session';
const IMPERSONATION_COOKIE = 'impersonating';
const SESSION_DURATION = 60 * 60 * 24 * 5 * 1000;

/**
 * Wrapper para adicionar timeout em operações assíncronas
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Cria uma sessão com retry e timeout
 */
export async function createSession(idToken: string) {
  const startTime = Date.now();
  console.log('[createSession] Iniciando criação de sessão');
  
  try {
    // Validação de entrada
    if (!idToken) {
      throw new Error('idToken é obrigatório');
    }

    // Criar session cookie com timeout de 10 segundos
    console.log('[createSession] Criando session cookie...');
    const sessionCookie = await withTimeout(
      adminAuth.createSessionCookie(idToken, {
        expiresIn: SESSION_DURATION
      }),
      10000,
      'Timeout ao criar session cookie'
    );
    
    console.log('[createSession] Session cookie criado, configurando cookies...');
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_DURATION / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    const duration = Date.now() - startTime;
    console.log(`[createSession] Sucesso! Duração: ${duration}ms`);
    
    return { success: true };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
    
    console.error(`[createSession] ERRO após ${duration}ms:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return { success: false, error: errorMessage };
  }
}

export async function verifySession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionCookie) {
      return null;
    }
    
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    console.error('Cookie inválido detectado, removendo...', error);
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }
}
export async function setAdminFlag() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_FLAG_COOKIE, 'true', {
    maxAge: SESSION_DURATION / 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

export async function setImpersonationFlag(businessId: string) {
  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, businessId, {
    maxAge: SESSION_DURATION / 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

export async function getImpersonationId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const impersonationId = cookieStore.get(IMPERSONATION_COOKIE)?.value;
    return impersonationId || null;
  } catch (error) {
    console.error('[getImpersonationId] Error:', error);
    return null;
  }
}

export async function clearImpersonationFlag() {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE);
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(ADMIN_FLAG_COOKIE);
  cookieStore.delete(IMPERSONATION_COOKIE);
}
