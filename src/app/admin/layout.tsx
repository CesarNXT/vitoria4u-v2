
'use client';

import { FirebaseClientProvider } from '@/firebase';

// This layout file is intentionally simple to act as a root for the /admin route.
// It allows the /admin/page.tsx (login page) to have its own separate layout 
// from the protected /admin/(dashboard) routes.

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <FirebaseClientProvider>
        {children}
      </FirebaseClientProvider>
  );
}
