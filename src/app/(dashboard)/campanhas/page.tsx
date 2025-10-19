"use client"

import { usePlan } from '@/contexts/PlanContext';
import { FeatureLocked } from '@/components/feature-locked';
import { Loader2 } from 'lucide-react';

export default function CampanhasPage() {
  const { canUseFeature, isLoading } = usePlan();

  // Verificar se tem permissão para usar disparos de mensagens
  const featureCheck = canUseFeature('disparo_de_mensagens');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não tem permissão, mostrar bloqueio
  if (!featureCheck.allowed) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
        <FeatureLocked 
          reason={featureCheck.reason || 'Funcionalidade não disponível no seu plano'}
          variant="card"
        />
      </div>
    );
  }

  // Se tem permissão, mostrar conteúdo
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Disparos em Massa</h1>
        <p className="text-muted-foreground max-w-md">
          Funcionalidade em manutenção. Estamos trabalhando para melhorar sua experiência.
        </p>
      </div>
    </div>
  )
}
