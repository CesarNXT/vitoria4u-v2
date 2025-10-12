'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Loader2, ArrowRight, Copy, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { ConfiguracoesNegocio } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function PagamentoPendentePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, firestore } = useFirebase();
  const [isChecking, setIsChecking] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);

  const paymentId = searchParams.get('payment_id');
  const paymentType = searchParams.get('payment_type');
  const status = searchParams.get('status');

  useEffect(() => {
    if (!firestore || !user) return;

    // Monitora o documento do usuário em tempo real
    const userDocRef = doc(firestore, 'negocios', user.uid);
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ConfiguracoesNegocio;
        
        // Verifica se o pagamento foi processado
        if (data.mp?.lastPaymentId === paymentId && data.mp?.lastPaymentStatus === 'approved') {
          setAccessGranted(true);
          setIsChecking(false);
        } else if (data.access_expires_at) {
          const expiresAt = data.access_expires_at.toDate ? data.access_expires_at.toDate() : new Date(data.access_expires_at);
          if (expiresAt > new Date()) {
            setAccessGranted(true);
            setIsChecking(false);
          }
        }
      }
    });

    // Para de verificar após 10 segundos (usuário pode atualizar manualmente)
    const timeout = setTimeout(() => {
      setIsChecking(false);
    }, 10000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [firestore, user, paymentId]);

  const getPaymentTypeLabel = (type: string | null) => {
    switch (type) {
      case 'bank_transfer':
        return 'PIX';
      case 'ticket':
        return 'Boleto Bancário';
      default:
        return 'Pagamento Pendente';
    }
  };

  const handleCopyPaymentId = () => {
    if (paymentId) {
      navigator.clipboard.writeText(paymentId);
      toast({
        title: 'ID Copiado!',
        description: 'O ID do pagamento foi copiado para a área de transferência.',
      });
    }
  };

  if (accessGranted) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
            <CardDescription>
              Seu pagamento foi aprovado e seu acesso foi liberado!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg" asChild>
              <Link href="/dashboard">
                Ir para o Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
            <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle className="text-2xl">Pagamento Pendente</CardTitle>
          <CardDescription>
            {getPaymentTypeLabel(paymentType)} registrado com sucesso
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {paymentType === 'bank_transfer' && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">📱 Pagamento via PIX</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Complete o pagamento pelo aplicativo do seu banco. O acesso será liberado automaticamente após a confirmação.
              </p>
            </div>
          )}

          {paymentType === 'ticket' && (
            <div className="rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 p-4">
              <h3 className="font-medium text-orange-900 dark:text-orange-100 mb-2">🎫 Boleto Bancário</h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Você receberá o boleto por email. Após o pagamento, o acesso pode levar até 2 dias úteis para ser liberado.
              </p>
            </div>
          )}

          {paymentId && (
            <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
              <p className="text-muted-foreground">ID do Pagamento:</p>
              <div className="flex items-center gap-2">
                <p className="font-mono font-medium flex-1 truncate">{paymentId}</p>
                <Button size="sm" variant="ghost" onClick={handleCopyPaymentId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
            <p className="font-medium">O que fazer agora?</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Complete o pagamento pelo método escolhido</li>
              <li>Aguarde a confirmação automática</li>
              <li>Seu acesso será liberado em instantes</li>
            </ul>
          </div>

          <div className="space-y-2">
            {isChecking ? (
              <Button className="w-full" size="lg" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando pagamento...
              </Button>
            ) : (
              <Button className="w-full" size="lg" onClick={() => window.location.reload()}>
                Verificar Status do Pagamento
              </Button>
            )}

            <Button className="w-full" variant="outline" asChild>
              <Link href="/dashboard">Voltar ao Dashboard</Link>
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Esta página atualiza automaticamente quando o pagamento é confirmado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
