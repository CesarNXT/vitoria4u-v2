
"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Gem, Loader2 } from "lucide-react"
import type { ConfiguracoesNegocio } from "@/lib/types"
import { useFirebase } from "@/firebase";
import { useState, useEffect } from "react";
import { isFuture } from "date-fns";
import Link from "next/link";
import { WhatsAppConnectButton } from "@/components/whatsapp-connect-button";
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

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

interface WhatsappStatusProps {
    settings: ConfiguracoesNegocio | null;
}

export function WhatsappStatus({ settings }: WhatsappStatusProps) {
    const { user, firestore } = useFirebase();
    const { toast } = useToast();
    
    // Se não tem settings, não renderizar o botão ainda
    if (!settings) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Status do WhatsApp</CardTitle>
                    <CardDescription className="text-xs">
                        Carregando configurações...
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    const safeSettings = settings;
    
    const isConnected = safeSettings.whatsappConectado ?? false;
    
    // Correctly handle both Timestamp and Date objects
    const dateToCompare = safeSettings?.access_expires_at?.toDate 
        ? safeSettings.access_expires_at.toDate() 
        : (safeSettings?.access_expires_at ? new Date(safeSettings.access_expires_at) : null);
        
    const hasActiveAccess = dateToCompare ? isFuture(dateToCompare) : false;
    
    return (
         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status do WhatsApp</CardTitle>
                <CardDescription className="text-xs">
                    Sua conexão para automações.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!hasActiveAccess ? (
                    <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border-2 border-dashed p-3 text-center">
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
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-3 rounded-lg border-2 border-dashed p-4 text-center">
                        <div className="w-full">
                            <WhatsAppConnectButton
                                instanceId={safeSettings.id || user?.uid || ''}
                                isConnected={safeSettings.whatsappConectado || false}
                                businessName={safeSettings.nome || 'Negócio'}
                                businessPhone={safeSettings.telefone?.toString() || ''}
                                instanceToken={safeSettings.tokenInstancia || ''}
                                onStatusChange={async (connected, instanceToken) => {
                                        try {
                                            if (!user || !firestore) return;
                                            
                                            const settingsRef = doc(firestore, 'negocios', user.uid);
                                            const updateData: any = {
                                                updatedAt: new Date()
                                            };
                                            
                                            // Se passou instanceToken, está apenas salvando o token (não altera status)
                                            if (instanceToken) {
                                                updateData.tokenInstancia = instanceToken;
                                                // NÃO atualiza whatsappConectado aqui!
                                            } else {
                                                // Se não tem instanceToken, é uma mudança de status real
                                                updateData.whatsappConectado = connected;
                                            }
                                            
                                            await updateDoc(settingsRef, updateData);
                                            
                                            if (instanceToken) {
                                                toast({
                                                    title: '🔧 Instância Criada',
                                                    description: 'Aguardando conexão...',
                                                });
                                            } else {
                                                toast({
                                                    title: connected ? '✅ WhatsApp Conectado!' : '❌ WhatsApp Desconectado',
                                                    description: connected 
                                                        ? 'Suas automações foram ativadas.' 
                                                        : 'Suas automações foram pausadas.',
                                                });
                                            }
                                        } catch (error) {
                                            console.error('Erro ao atualizar status:', error);
                                            toast({
                                                title: 'Erro',
                                                description: 'Não foi possível atualizar o status.',
                                                variant: 'destructive'
                                            });
                                        }
                                    }}
                                />
                            </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
