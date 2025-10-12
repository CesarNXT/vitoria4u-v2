"use server";

import { cookies } from 'next/headers';
import { adminAuth } from './firebase-admin';

const SESSION_COOKIE_NAME = 'session';
const SESSION_DURATION = 60 * 60 * 24 * 5 * 1000; // 5 dias

/**
 * 🔒 Cria um session cookie seguro a partir de um ID token
 * Este cookie é httpOnly e não pode ser modificado pelo cliente
 */
export async function createSession(idToken: string) {
  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION
    });
    
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_DURATION / 1000,
      httpOnly: true, // Não acessível via JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS apenas em produção
      sameSite: 'lax', // Proteção CSRF
      path: '/'
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error creating session:', error);
    return { success: false, error: 'Failed to create session' };
  }
}

/**
 * 🔒 Verifica e decodifica o session cookie
 * Valida com Firebase Admin SDK - impossível de falsificar
 */
export async function verifySession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionCookie) {
      return null;
    }
    
    // ✅ Validação server-side - segura
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true // checkRevoked - verifica se token foi revogado
    );
    
    return decodedClaims;
  } catch (error) {
    console.error('🚨 COOKIE INVÁLIDO DETECTADO! Removendo...', error);
    // Se o cookie for inválido, removê-lo para forçar novo login
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }
}

/**
 * 🔒 Destrói o session cookie (logout)
 */
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
