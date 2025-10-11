'use server'

export async function verifyAdmin(email: string): Promise<{ isAdmin: boolean }> {
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim());
  const isAdmin = adminEmails.includes(email);
  return { isAdmin };
}
