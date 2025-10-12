'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { ConfiguracoesNegocio } from '@/lib/types';

export default function PagamentoSucessoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, firestore } = useFirebase();
  const [isProcessing, setIsProcessing] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);

  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const externalReference = searchParams.get('external_reference');

  useEffect(() => {
    if (!firestore || !user) return;

    // Monitora o documento do usuário em tempo real
    const userDocRef = doc(firestore, 'negocios', user.uid);
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ConfiguracoesNegocio;
        
        // Verifica se o pagamento foi processado pela webhook
        if (data.mp?.lastPaymentId === paymentId && data.mp?.lastPaymentStatus === 'approved') {
          setAccessGranted(true);
          setIsProcessing(false);
        } else if (data.access_expires_at) {
          // Ou se já tem uma data de expiração válida
          const expiresAt = data.access_expires_at.toDate ? data.access_expires_at.toDate() : new Date(data.access_expires_at);
          if (expiresAt > new Date()) {
            setAccessGranted(true);
            setIsProcessing(false);
          }
        }
      }
    });

    // Timeout de 30 segundos para parar de aguardar
    const timeout = setTimeout(() => {
      setIsProcessing(false);
    }, 30000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [firestore, user, paymentId]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isProcessing ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl">Processando seu pagamento</CardTitle>
              <CardDescription>
                Aguarde enquanto confirmamos seu pagamento com o Mercado Pago...
              </CardDescription>
            </>
          ) : accessGranted ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
              <CardDescription>
                Seu acesso foi liberado com sucesso. Aproveite todas as funcionalidades do seu plano!
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                <CheckCircle2 className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <CardTitle className="text-2xl">Pagamento Recebido!</CardTitle>
              <CardDescription>
                Estamos processando seu pagamento. Você receberá acesso em alguns instantes.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {paymentId && (
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="text-muted-foreground">ID do Pagamento:</p>
              <p className="font-mono font-medium">{paymentId}</p>
            </div>
          )}

          <div className="space-y-2">
            {accessGranted ? (
              <Button className="w-full" size="lg" asChild>
                <Link href="/dashboard">
                  Ir para o Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : isProcessing ? (
              <Button className="w-full" size="lg" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aguardando confirmação...
              </Button>
            ) : (
              <>
                <Button className="w-full" size="lg" asChild>
                  <Link href="/dashboard">
                    Ir para o Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button className="w-full" variant="outline" onClick={() => window.location.reload()}>
                  Verificar Novamente
                </Button>
              </>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Se o acesso não for liberado em alguns minutos, entre em contato com o suporte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
