

"use client"

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import type { Plano, ConfiguracoesNegocio, PlanFeature } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { isFuture } from 'date-fns';
import { useBusinessUser } from '@/contexts/BusinessUserContext';

function WhatsappIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

const allFeatures: PlanFeature[] = [
    'lembrete_24h',
    'lembrete_2h',
    'feedback_pos_atendimento',
    'lembrete_aniversario',
    'lembrete_profissional',
    'disparo_de_mensagens',
    'retorno_manutencao',
    'notificacao_gestor_agendamento',
    'atendimento_whatsapp_ia',
    'atendimento_manual_ou_automatizado'
];

const featureLabels: Record<PlanFeature, string> = {
    'lembrete_24h': 'Lembrete 24h',
    'lembrete_2h': 'Lembrete 2h',
    'feedback_pos_atendimento': 'Feedback Pós-Atendimento',
    'lembrete_aniversario': 'Lembrete de Aniversário',
    'lembrete_profissional': 'Lembrete para Profissional',
    'disparo_de_mensagens': 'Disparo de Mensagens em Massa',
    'retorno_manutencao': 'Lembrete de Retorno',
    'notificacao_gestor_agendamento': 'Aviso de Agendamento/Cancelamento',
    'atendimento_whatsapp_ia': 'Atendimento com IA',
    'atendimento_manual_ou_automatizado': 'Atendimento Híbrido (IA + Manual)',
};




export default function PlanosPage() {
    const { user, firestore } = useFirebase();
    const { businessUserId } = useBusinessUser();
    const [plans, setPlans] = useState<Plano[]>([]);
    const [settings, setSettings] = useState<ConfiguracoesNegocio | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const whatsappNumber = "81979123125";
    const whatsappMessage = "Olá! Preciso de ajuda com meu plano de assinatura ou tenho uma dúvida sobre o pagamento.";
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

    const [isCreatingSession, setIsCreatingSession] = useState(false);
    
    const finalUserId = businessUserId || user?.uid;

    const handleSubscription = async (planId: string) => {
        if (!user) {
            console.error("Usuário não autenticado.");
            return;
        }

        setIsCreatingSession(true);
        try {
            // 🔒 Obter token de autenticação do Firebase
            const token = await user.getIdToken();

            const response = await fetch('/api/pagamentos/mercado-pago', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, // ✅ Token de autenticação
                },
                body: JSON.stringify({ 
                    planId: planId, // Envia apenas o ID do plano (userId/email vem do token)
                }),
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = data.checkoutUrl;
            } else {
                throw new Error(data.error || 'Falha ao criar sessão de pagamento.');
            }
        } catch (error) {
            console.error("Erro ao criar assinatura:", error);
            // Adicionar feedback para o usuário aqui, como um toast de erro
        } finally {
            setIsCreatingSession(false);
        }
    };

    useEffect(() => {
        if (!firestore) return;

        const plansRef = collection(firestore, 'planos');
        const unsubscribePlans = onSnapshot(plansRef, (snapshot) => {
            const plansData = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }) as Plano)
                .filter(plan => 
                    // ✅ Não mostrar planos internos (grátis é automático, não venda)
                    plan.id !== 'plano_gratis' && 
                    plan.status === 'Ativo' && 
                    plan.price > 0 // Só planos pagos
                )
                .sort((a, b) => a.price - b.price); // Ordena por preço
            setPlans(plansData);
        }, (error) => {
            console.error("Error fetching plans:", error);
        });

        return () => unsubscribePlans();
    }, [firestore]);

    useEffect(() => {
        if (!finalUserId || !firestore) {
            setIsLoading(false);
            return;
        };

        setIsLoading(true);

        const settingsDocRef = doc(firestore, `negocios/${finalUserId}`);
        const unsubscribe = onSnapshot(settingsDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as ConfiguracoesNegocio;
                setSettings({
                    ...data,
                    id: doc.id,
                    access_expires_at: data.access_expires_at ? (data.access_expires_at.toDate ? data.access_expires_at.toDate() : new Date(data.access_expires_at)) : null,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                });
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching settings:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [finalUserId, firestore]);

    const isCurrentPlanActive = settings?.access_expires_at ? isFuture(settings.access_expires_at) : false;
    const daysRemaining = settings?.access_expires_at ? Math.ceil((settings.access_expires_at.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Gem />
                    Planos e Assinatura
                </h1>
                <p className="text-muted-foreground">Gerencie seu plano de assinatura e explore novas funcionalidades.</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-end">
                {plans.map(plan => {
                    // Compara o ID do plano salvo no usuário com o ID do plano sendo renderizado
                    const isCurrentPlan = settings?.planId === plan.id && isCurrentPlanActive;
                    
                    return (
                        <Card 
                            key={plan.id}
                            className={cn(
                                "flex flex-col transition-all",
                                plan.isFeatured && "border-2 border-primary shadow-lg lg:scale-105",
                                isCurrentPlan && "bg-primary/5 border-primary/20"
                            )}
                        >
                            {plan.isFeatured && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-1 text-sm font-semibold text-primary-foreground">
                                Mais Popular
                            </div>
                            )}
                            <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                                    <span className="text-muted-foreground">/mês</span>
                                </div>

                                <ul className="mt-6 space-y-3">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                                            <Check className="h-5 w-5 text-green-500" />
                                            <span>{featureLabels[feature]}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                {isCurrentPlan ? (
                                    daysRemaining > 7 ? (
                                        <Button className="w-full" disabled variant="outline">
                                            <Check className="mr-2 h-4 w-4" />
                                            Plano Atual (expira em {daysRemaining} dias)
                                        </Button>
                                    ) : (
                                        <Button 
                                            className="w-full" 
                                            variant='gradient'
                                            onClick={() => handleSubscription(plan.id)}
                                            disabled={isCreatingSession}
                                        >
                                            {isCreatingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            {daysRemaining > 0 ? `Renovar Agora (expira em ${daysRemaining} dias)` : 'Renovar Plano'}
                                        </Button>
                                    )
                                ) : (
                                    <Button 
                                        className="w-full" 
                                        variant={plan.isFeatured ? 'gradient' : 'outline'}
                                        onClick={() => handleSubscription(plan.id)}
                                        disabled={isCreatingSession}
                                    >
                                        {isCreatingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Assinar Agora
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
             {/* WhatsApp Floating Button */}
            <div className="group fixed bottom-5 right-5 z-50">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="relative flex items-center justify-center">
                    <div className="absolute right-14 w-max max-w-xs -translate-y-1/2 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:right-20">
                        <div className="bg-card text-card-foreground p-3 rounded-lg shadow-lg relative">
                            <p className="text-sm">Precisa de ajuda com sua assinatura?</p>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-card transform rotate-45"></div>
                        </div>
                    </div>
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white animate-pulse-whatsapp">
                        <WhatsappIcon className="h-8 w-8" />
                    </div>
                </a>
            </div>
        </div>
    );
}
