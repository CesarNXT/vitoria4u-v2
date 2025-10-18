"use server";

import { 
  createSession, 
  destroySession, 
  setAdminFlag,
  setImpersonationFlag,
  clearImpersonationFlag 
} from '@/lib/session';

export async function createUserSession(idToken: string) {
  return await createSession(idToken);
}

export async function createAdminSession(idToken: string) {
  const result = await createSession(idToken);
  if (result.success) {
    await setAdminFlag();
  }
  return result;
}

export async function startImpersonation(businessId: string) {
  await setImpersonationFlag(businessId);
}

export async function stopImpersonation() {
  await clearImpersonationFlag();
}

export async function destroyUserSession() {
  await destroySession();
}
