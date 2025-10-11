'use client'

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gem } from 'lucide-react';

export default function BillingPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const status = searchParams.get('status');
    const externalReference = searchParams.get('external_reference');

    if (status === 'success' || status === 'approved') {
      toast({
        title: 'Pagamento Aprovado!',
        description: 'Seu plano foi ativado com sucesso. Bem-vindo!',
        variant: 'success',
      });
    } else if (status === 'failure' || status === 'rejected') {
      toast({
        title: 'Pagamento Recusado',
        description: 'Houve um problema com seu pagamento. Por favor, tente novamente ou contate o suporte.',
        variant: 'destructive',
      });
    } else if (status === 'pending') {
      toast({
        title: 'Pagamento Pendente',
        description: 'Estamos aguardando a confirmação do seu pagamento.',
        variant: 'default',
      });
    }
  }, [searchParams, toast]);

  // Link para o portal de assinaturas do Mercado Pago (genérico)
  const manageSubscriptionUrl = 'https://www.mercadopago.com.br/subscriptions';

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Gem />
          Assinatura e Cobrança
        </h1>
        <p className="text-muted-foreground">Gerencie seu plano e histórico de pagamentos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Assinatura</CardTitle>
          <CardDescription>
            Para visualizar faturas, alterar o método de pagamento ou cancelar sua assinatura, acesse o portal seguro do Mercado Pago.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href={manageSubscriptionUrl} target="_blank" rel="noopener noreferrer">
            <Button>Acessar Portal de Assinaturas</Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
