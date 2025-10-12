'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function PagamentoFalhaPage() {
  const searchParams = useSearchParams();
  
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const statusDetail = searchParams.get('status_detail');

  const getErrorMessage = () => {
    if (statusDetail) {
      switch (statusDetail) {
        case 'cc_rejected_insufficient_amount':
          return 'Cartão sem saldo suficiente';
        case 'cc_rejected_bad_filled_security_code':
          return 'Código de segurança incorreto';
        case 'cc_rejected_bad_filled_date':
          return 'Data de validade incorreta';
        case 'cc_rejected_bad_filled_other':
          return 'Dados do cartão incorretos';
        case 'cc_rejected_blacklist':
          return 'Cartão bloqueado';
        case 'cc_rejected_call_for_authorize':
          return 'Pagamento não autorizado pelo banco';
        case 'cc_rejected_card_disabled':
          return 'Cartão inativo';
        case 'cc_rejected_duplicated_payment':
          return 'Pagamento duplicado';
        case 'cc_rejected_high_risk':
          return 'Pagamento recusado por segurança';
        case 'cc_rejected_invalid_installments':
          return 'Número de parcelas inválido';
        case 'cc_rejected_max_attempts':
          return 'Limite de tentativas excedido';
        default:
          return 'O pagamento foi recusado';
      }
    }
    return 'O pagamento não pôde ser processado';
  };

  const getSuggestion = () => {
    if (statusDetail) {
      switch (statusDetail) {
        case 'cc_rejected_insufficient_amount':
          return 'Tente usar outro cartão com saldo disponível ou escolha outro método de pagamento.';
        case 'cc_rejected_bad_filled_security_code':
        case 'cc_rejected_bad_filled_date':
        case 'cc_rejected_bad_filled_other':
          return 'Verifique os dados do cartão e tente novamente.';
        case 'cc_rejected_call_for_authorize':
          return 'Entre em contato com seu banco para autorizar a compra.';
        case 'cc_rejected_card_disabled':
          return 'Entre em contato com seu banco ou use outro cartão.';
        case 'cc_rejected_max_attempts':
          return 'Aguarde alguns minutos antes de tentar novamente ou use outro método de pagamento.';
        default:
          return 'Tente novamente ou escolha outro método de pagamento.';
      }
    }
    return 'Tente novamente ou entre em contato com o suporte se o problema persistir.';
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Pagamento Não Processado</CardTitle>
          <CardDescription>
            {getErrorMessage()}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>O que fazer:</strong> {getSuggestion()}
            </p>
          </div>

          {paymentId && (
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="text-muted-foreground">ID da Tentativa:</p>
              <p className="font-mono font-medium">{paymentId}</p>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
            <p className="font-medium">Métodos de Pagamento Disponíveis:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>PIX (aprovação instantânea)</li>
              <li>Cartão de Crédito</li>
              <li>Boleto Bancário</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button className="w-full" size="lg" asChild>
              <Link href="/planos">
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Link>
            </Button>

            <Button className="w-full" variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Dashboard
              </Link>
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Se precisar de ajuda, entre em contato com nosso suporte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
