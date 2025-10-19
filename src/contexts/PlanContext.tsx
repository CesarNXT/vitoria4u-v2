'use client';

import { createContext, useContext, useMemo } from 'react';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { ConfiguracoesNegocio, Plano } from '@/lib/types';
import { usePlanFeatures } from '@/hooks/use-plan-features';

interface PlanContextValue {
  settings: ConfiguracoesNegocio | null;
  plan: Plano | null;
  isLoading: boolean;
  hasFeature: (feature: import('@/lib/types').PlanFeature) => boolean;
  canUseFeature: (feature: import('@/lib/types').PlanFeature) => { allowed: boolean; reason?: string };
  features: import('@/lib/types').PlanFeature[];
  isExpired: boolean;
  planName: string;
  planId?: string;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ 
  children, 
  businessUserId, 
  firestore 
}: { 
  children: React.ReactNode;
  businessUserId: string | undefined;
  firestore: any;
}) {
  // Carregar settings do negócio
  const settingsRef = useMemoFirebase(
    () => (businessUserId && firestore ? doc(firestore, `negocios/${businessUserId}`) : null),
    [businessUserId, firestore]
  );
  const { data: settings, isLoading: settingsLoading } = useDoc<ConfiguracoesNegocio>(settingsRef);

  // Carregar plano atual
  const planRef = useMemoFirebase(
    () => (settings?.planId && firestore ? doc(firestore, `planos/${settings.planId}`) : null),
    [settings?.planId, firestore]
  );
  const { data: plan, isLoading: planLoading } = useDoc<Plano>(planRef);

  // Hook de features
  const planFeatures = usePlanFeatures(settings || null, plan || null);

  const value = useMemo<PlanContextValue>(() => ({
    settings: settings || null,
    plan: plan || null,
    isLoading: settingsLoading || planLoading,
    ...planFeatures
  }), [settings, plan, settingsLoading, planLoading, planFeatures]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within PlanProvider');
  }
  return context;
}
