import { Lock, Gem } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FeatureLockedProps {
  reason: string;
  variant?: 'inline' | 'overlay' | 'card';
  children?: React.ReactNode;
  className?: string;
}

/**
 * Componente para mostrar feature bloqueada
 * Exibe mensagem e link para upgrade de plano
 */
export function FeatureLocked({ reason, variant = 'inline', children, className }: FeatureLockedProps) {
  
  if (variant === 'overlay') {
    return (
      <div className={cn("relative", className)}>
        {/* Conteúdo desabilitado */}
        <div className="pointer-events-none opacity-30 blur-sm">
          {children}
        </div>
        
        {/* Overlay de bloqueio */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="p-6 max-w-md text-center space-y-4 shadow-lg">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-gradient-to-r from-primary to-accent">
                <Lock className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Funcionalidade Bloqueada</h3>
              <p className="text-sm text-muted-foreground">{reason}</p>
            </div>
            <Button asChild variant="gradient" className="w-full">
              <Link href="/planos">
                <Gem className="mr-2 h-4 w-4" />
                Fazer Upgrade
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={cn("p-6 text-center space-y-4", className)}>
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-gradient-to-r from-primary to-accent">
            <Lock className="h-6 w-6 text-white" />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2">Funcionalidade Não Disponível</h3>
          <p className="text-sm text-muted-foreground">{reason}</p>
        </div>
        <Button asChild variant="gradient">
          <Link href="/planos">
            <Gem className="mr-2 h-4 w-4" />
            Ver Planos
          </Link>
        </Button>
      </Card>
    );
  }

  // variant === 'inline'
  return (
    <div className={cn("flex items-center gap-2 p-3 border border-primary/20 bg-primary/5 rounded-lg", className)}>
      <Lock className="h-4 w-4 text-primary shrink-0" />
      <p className="text-sm flex-1">{reason}</p>
      <Button asChild size="sm" variant="outline">
        <Link href="/planos">
          Upgrade
        </Link>
      </Button>
    </div>
  );
}

/**
 * Badge para mostrar feature bloqueada em componentes pequenos
 */
export function FeatureLockedBadge({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium", className)}>
      <Lock className="h-3 w-3" />
      <span>Premium</span>
    </div>
  );
}
