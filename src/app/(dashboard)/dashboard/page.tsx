
'use client';

import { useFirebase } from '@/firebase';
import { useBusinessUser } from '@/contexts/BusinessUserContext';
import { Loader2 } from 'lucide-react';
import { DashboardClientWrapper } from './dashboard-client-wrapper';

export default function DashboardPage() {
  const { businessUserId } = useBusinessUser();
  const { user, isUserLoading } = useFirebase();

  const finalUserId = businessUserId || user?.uid;

  // Redirect or show loader while user state is being determined
  if (isUserLoading || !finalUserId) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="w-full">
        <div className="mx-auto w-full max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            <DashboardClientWrapper businessUserId={finalUserId} />
        </div>
    </main>
  );
}
