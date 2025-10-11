
"use client"

import type { ConfiguracoesNegocio } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSubscriptionStatus } from "@/lib/utils";
import { format, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SubscriptionCardProps {
    settings: ConfiguracoesNegocio;
}

export function SubscriptionCard({ settings }: SubscriptionCardProps) {
    
    const subscription = getSubscriptionStatus(settings.mp?.status ?? 'pending');
    const expiryDate = settings.access_expires_at;
    const isPlanActive = expiryDate && isFuture(new Date(expiryDate));
    
    return (
         <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
            <CardHeader>
                <CardTitle>Sua Assinatura</CardTitle>
                <CardDescription>Resumo do seu plano e status de pagamento.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border p-4">
                    <div className="space-y-1">
                        <p className="text-lg font-semibold">{settings.planId?.replace('plano_', '').replace('_', ' ').split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '').join(' ') || 'Sem Plano'}</p>
                        <p className="text-sm text-muted-foreground">
                            {isPlanActive 
                                ? `Seu acesso expira em ${format(new Date(expiryDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.`
                                : "Seu acesso expirou. Renove para continuar."
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge variant={subscription.variant}>{subscription.text}</Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
