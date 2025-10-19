"use server";

import { cookies } from 'next/headers';
import { adminAuth } from './firebase-admin';

const SESSION_COOKIE_NAME = 'session';
const ADMIN_FLAG_COOKIE = 'admin-session';
const IMPERSONATION_COOKIE = 'impersonating';
const SESSION_DURATION = 60 * 60 * 24 * 5 * 1000;
export async function createSession(idToken: string) {
  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION
    });
    
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_DURATION / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error creating session:', error);
    return { success: false, error: 'Failed to create session' };
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
  } catch {
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
