
"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Gem } from "lucide-react"
import type { ConfiguracoesNegocio } from "@/lib/types"
import { useFirebase } from "@/firebase";
import { useState, useEffect } from "react";
import { isFuture } from "date-fns";
import Link from "next/link";
import { WhatsAppTutorial } from "@/app/(dashboard)/configuracoes/whatsapp-tutorial";

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
    )
}

const INSTANCE_CONNECTION_WEBHOOK_URL = "https://n8n.vitoria4u.site/webhook/7e403c23-f6bc-43bc-98d0-3376dbae6eba";
const COOLDOWN_SECONDS = 90;

interface WhatsappStatusProps {
    settings: ConfiguracoesNegocio | null;
}

export function WhatsappStatus({ settings }: WhatsappStatusProps) {
    const { user } = useFirebase();
    const isConnected = settings?.whatsappConectado ?? false;
    
    // Correctly handle both Timestamp and Date objects
    const dateToCompare = settings?.access_expires_at?.toDate 
        ? settings.access_expires_at.toDate() 
        : (settings?.access_expires_at ? new Date(settings.access_expires_at) : null);
        
    const hasActiveAccess = dateToCompare ? isFuture(dateToCompare) : false;
    
    const [isLoading, setIsLoading] = useState(false);
    const [cooldownTime, setCooldownTime] = useState(0);
    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => {
        if (!user) return; // Wait for user to be available

        const cooldownEnd = localStorage.getItem(`whatsappConnectCooldown_${user.uid}`);
        let interval: NodeJS.Timeout | undefined;

        if (cooldownEnd) {
            const remaining = Math.ceil((parseInt(cooldownEnd) - Date.now()) / 1000);
            if (remaining > 0) {
                setCooldownTime(remaining);
            } else {
                localStorage.removeItem(`whatsappConnectCooldown_${user.uid}`);
            }
        }
        
        if (cooldownTime > 0) {
            interval = setInterval(() => {
                setCooldownTime(prevTime => {
                    const newTime = prevTime - 1;
                    if (newTime <= 0) {
                        clearInterval(interval);
                        localStorage.removeItem(`whatsappConnectCooldown_${user.uid}`);
                        return 0;
                    }
                    return newTime;
                });
            }, 1000);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [user, cooldownTime]);


    const handleConnectClick = () => {
        // Abre o tutorial antes de conectar
        setShowTutorial(true);
    }

    const handleTutorialComplete = async () => {
        setShowTutorial(false);
        // Usuário assistiu o tutorial e quer conectar
        await sendConnectionWebhook();
    }

    const handleTutorialSkip = async () => {
        setShowTutorial(false);
        // Usuário pulou tutorial mas QUER CONECTAR
        await sendConnectionWebhook();
    }

    const handleTutorialCancel = () => {
        setShowTutorial(false);
        // Usuário NÃO quer conectar agora - apenas fecha sem enviar webhook
    }

    const sendConnectionWebhook = async () => {
        if (!user || !settings || cooldownTime > 0 || isLoading) {
            if(cooldownTime > 0) alert("Aguarde o tempo de espera para solicitar novamente.")
            return;
        }

        setIsLoading(true);

        // Remover o 5º dígito do telefone (índice 4)
        let phoneNumber = String(settings.telefone);
        if (phoneNumber.length >= 5) {
            phoneNumber = phoneNumber.slice(0, 4) + phoneNumber.slice(5);
        }

        const payload = {
            businessId: user.uid,
            instanciaWhatsapp: settings.id, 
            businessPhone: phoneNumber,
            whatsappConectado: false
        };

        try {
            const response = await fetch(INSTANCE_CONNECTION_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert("Vá para o seu celular, pois lá vamos enviar instruções de como conectar ao WhatsApp.");
                const cooldownEnd = Date.now() + COOLDOWN_SECONDS * 1000;
                localStorage.setItem(`whatsappConnectCooldown_${user.uid}`, cooldownEnd.toString());
                setCooldownTime(COOLDOWN_SECONDS);
            } else {
                throw new Error("Falha ao iniciar conexão com o WhatsApp.");
            }
        } catch (error) {
            console.error(error);
            alert("Ocorreu um erro ao tentar conectar com o WhatsApp.");
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status do WhatsApp</CardTitle>
                <CardDescription className="text-xs">
                    Sua conexão para automações.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border-2 border-dashed p-3 text-center">
                    {!hasActiveAccess ? (
                         <>
                            <div className="p-2 rounded-full bg-amber-500/20">
                                <Gem className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Plano Necessário</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Requer plano ativo.</p>
                            </div>
                            <Button asChild size="sm" className="w-full">
                                <Link href="/planos">Ver Planos</Link>
                            </Button>
                        </>
                    ) : isConnected ? (
                        <>
                            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
                                <WhatsappIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Conectado</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Automação ativa.</p>
                            </div>
                        </>
                    ) : (
                        <>
                             <div className="p-2 rounded-full bg-destructive/10">
                                <WhatsappIcon className="h-5 w-5 text-destructive" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Desconectado</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Conecte para ativar.</p>
                            </div>
                             <Button onClick={handleConnectClick} size="sm" disabled={isLoading || cooldownTime > 0} className="w-full">
                                 {(isLoading || cooldownTime > 0) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                 {isLoading ? 'Solicitando...' : cooldownTime > 0 ? `${cooldownTime}s` : 'Conectar'}
                             </Button>
                        </>
                    )}
                </div>
            </CardContent>
            
            {/* Tutorial Modal */}
            <WhatsAppTutorial
                open={showTutorial}
                onComplete={handleTutorialComplete}
                onSkip={handleTutorialSkip}
                onCancel={handleTutorialCancel}
            />
        </Card>
    )
}
