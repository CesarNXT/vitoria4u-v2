import { MercadoPagoConfig, MerchantOrder, PreApproval } from 'mercadopago';
import { NextResponse } from 'next/server';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-server';
import crypto from 'crypto';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET!;

// Função para verificar a assinatura do webhook
function verifySignature(request: Request, rawBody: string) {
    const signature = request.headers.get('x-signature');
    const requestId = request.headers.get('x-request-id');
    if (!signature || !requestId) return false;

    const parts = signature.split(',');
    const ts = parts.find(part => part.startsWith('ts='))?.split('=')[1];
    const hash = parts.find(part => part.startsWith('v1='))?.split('=')[1];

    if (!ts || !hash) return false;

    const manifest = `id:${requestId};request-id:${requestId};ts:${ts};`;
    const signedMessage = crypto.createHmac('sha256', webhookSecret)
        .update(manifest + rawBody)
        .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signedMessage), Buffer.from(hash));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const body = JSON.parse(rawBody);

  // A verificação de assinatura está desativada temporariamente para depuração
  // if (!verifySignature(request, rawBody)) {
  //   return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 403 });
  // }

  const { type, data, action } = body;
  const userId = new URL(request.url).searchParams.get('user_id');

  console.log('Webhook recebido:', { type, action, dataId: data.id, userId });

  try {
    if (type === 'preapproval') {
        const preapproval = new PreApproval(client);
        const subscription = await preapproval.get({ id: data.id });

        const externalReference = subscription.external_reference;

        if (externalReference) {
            const userDocRef = doc(firestore, 'negocios', externalReference);
            
            // Usar o `reason` (nome do plano) diretamente como o planId
            const planId = subscription.reason; 

            // Acessamos como 'any' para contornar a tipagem incorreta do SDK
            const nextInvoiceDate = (subscription as any).next_invoice_date;
            // Garante que o valor seja null se a data não existir, para evitar erro no Firestore
            const accessExpiresAt = nextInvoiceDate ? new Date(nextInvoiceDate) : null;

            await updateDoc(userDocRef, {
                planId: planId, // Salva o nome do plano diretamente (ex: "Plano Profissional")
                mp: { // Usando um objeto para agrupar dados do MP
                    preapprovalId: subscription.id,
                    status: subscription.status,
                },
                access_expires_at: accessExpiresAt,
            });
            console.log(`Assinatura ${subscription.status} para o usuário: ${externalReference} com o plano ${planId}`);
        }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook do Mercado Pago:', error);

    // Salva o webhook falho no Firestore para análise posterior
    try {
      const erroredWebhooksRef = collection(firestore, 'errored_webhooks');
      await addDoc(erroredWebhooksRef, {
        error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        body: body,
        headers: JSON.stringify(Object.fromEntries(request.headers.entries())),
        receivedAt: serverTimestamp(),
      });
    } catch (dbError) {
      console.error('Falha ao salvar o webhook com erro no Firestore:', dbError);
    }

    return NextResponse.json({ error: 'Falha no processamento do webhook.' }, { status: 500 });
  }
}
