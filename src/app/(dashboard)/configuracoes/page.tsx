"use client";

import { useEffect, useState } from "react";
import { useFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConfiguracoesNegocio, User, DiasDaSemana } from '@/lib/types';
import BusinessSettingsForm from "@/app/(dashboard)/configuracoes/business-settings-form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { cn, isAdminUser } from '@/lib/utils';
import { useRouter } from "next/navigation";
import { getAuth, signOut } from "firebase/auth";
import { destroyUserSession } from '@/app/(public)/login/session-actions';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { addDays } from "date-fns";

function generateAddressSummary(endereco: ConfiguracoesNegocio['endereco']): string {
    if (!endereco || !endereco.logradouro) return "";
    return `${endereco.logradouro}, ${endereco.numero} - ${endereco.bairro}, ${endereco.cidade} - ${endereco.estado}, ${endereco.cep}`;
}

function generateScheduleSummary(horarios: ConfiguracoesNegocio['horariosFuncionamento']): string {
    if (!horarios) return "";
    const diasDaSemana: { key: DiasDaSemana, label: string }[] = [
        { key: 'segunda', label: 'Seg' }, { key: 'terca', label: 'Ter' }, { key: 'quarta', label: 'Qua' }, 
        { key: 'quinta', label: 'Qui' }, { key: 'sexta', label: 'Sex' }, { key: 'sabado', label: 'Sáb' }, 
        { key: 'domingo', label: 'Dom' }
    ];

    return diasDaSemana.map(dia => {
        const horarioDia = horarios[dia.key];
        if (horarioDia && horarioDia.enabled && horarioDia.slots.length > 0) {
            const slotsStr = horarioDia.slots.map(slot => `${slot.start} às ${slot.end}`).join(', ');
            return `${dia.label}: ${slotsStr}`;
        }
        return null;
    }).filter(Boolean).join('; ');
}


export default function SettingsPage() {
  const [settings, setSettings] = useState<ConfiguracoesNegocio | null>(null);
  const { user, firestore } = useFirebase();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();


 useEffect(() => {
    async function loadData() {
        if (!user || !firestore) return;

        const isAdmin = isAdminUser(user?.email);
        if (isAdmin) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            // Correctly fetch settings directly from the 'negocios' collection
            const settingsDocRef = doc(firestore, `negocios/${user.uid}`);
            const settingsDoc = await getDoc(settingsDocRef);

            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                setSettings({
                    id: settingsDoc.id,
                    ...data,
                    // Ensure timestamps are converted to Date objects if they exist
                    access_expires_at: data.access_expires_at?.toDate ? data.access_expires_at.toDate() : data.access_expires_at,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                    // CRÍTICO: Normaliza setupCompleted - se for undefined, trata como false
                    setupCompleted: data.setupCompleted === true ? true : false,
                } as ConfiguracoesNegocio);
            } else {
                // Pre-fill settings for setup mode if they don't exist
                setSettings({ id: user.uid, setupCompleted: false } as ConfiguracoesNegocio);
            }

        } catch(e) {
            console.error(e);
            toast({
              variant: 'destructive',
              title: 'Erro ao carregar dados',
              description: 'Não foi possível carregar as configurações. Tente recarregar a página.'
            })
        } finally {
            setIsLoading(false);
        }
    }
    if(user && firestore) {
      loadData();
    } else if (!user && !firestore) {
        // If there's no user or firestore after initial check, stop loading.
        setIsLoading(false);
    }
}, [user, firestore, toast]);


 const handleSave = async (updatedSettings: Partial<ConfiguracoesNegocio>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Usuário não autenticado. Por favor, faça login novamente.'
      });
      return;
    }
    
    const settingsRef = doc(firestore, 'negocios', user.uid);
    
    const wasInSetup = !settings?.setupCompleted;
    
    const finalSettings: Partial<ConfiguracoesNegocio> = { 
      ...updatedSettings,
    };
    
    // Se estava em setup mode e está salvando, marca como concluído
    if (wasInSetup) {
      finalSettings.setupCompleted = true;
    }
    
    if (updatedSettings.endereco) {
        finalSettings.resumoEndereco = generateAddressSummary(updatedSettings.endereco);
    }
    if (updatedSettings.horariosFuncionamento) {
        finalSettings.resumoHorarios = generateScheduleSummary(updatedSettings.horariosFuncionamento);
    }

    // Use the non-blocking write function which handles contextual error emitting
    // CRITICAL: Always use merge:true to avoid accidental data deletion.
    setDocumentNonBlocking(settingsRef, finalSettings, { merge: true });
    
    // Optimistically update UI
    setSettings(prev => ({...prev, ...finalSettings} as ConfiguracoesNegocio)); 
    
    if (wasInSetup) {
        toast({
          title: 'Configuração Concluída!',
          description: "Bem-vindo ao painel completo! Redirecionando...",
        });
        router.push('/dashboard');
        router.refresh(); 
    } else {
       toast({
          title: 'Sucesso!',
          description: "Configurações salvas com sucesso!",
        });
    }
  };

  const handleLogout = async () => {
    const auth = getAuth();
    // 🔒 SEGURANÇA: Destruir session cookie
    await destroyUserSession();
    await signOut(auth);
    // Usar window.location para forçar navegação completa para página principal
    window.location.href = '/';
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isAdmin = isAdminUser(user?.email);

  if (isAdmin) {
     return (
        <div className="flex-1 space-y-4 p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Acesso de Administrador</CardTitle>
                    <CardDescription>A página de configurações não se aplica ao perfil de administrador.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
  }

  // Determine if it's setup mode based on setupCompleted flag
  // Contas antigas sem o campo também entrarão em setup mode (undefined = false)
  const isSetupMode = !settings?.setupCompleted;

  return (
    <div className={cn("flex-1 space-y-4", !isSetupMode && "p-4 md:p-8")}>
        {/* This wrapper is only for the non-setup mode */}
        {!isSetupMode && (
             <Card>
                <CardHeader>
                    <CardTitle>Configurações do Negócio</CardTitle>
                    <CardDescription>
                        Gerencie as informações essenciais que alimentam a IA, o sistema de agendamento e outras funcionalidades.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     {user && <BusinessSettingsForm settings={settings} userId={user.uid} onSave={handleSave} />}
                </CardContent>
            </Card>
        )}

        {/* This is shown only in setup mode, taking the full page */}
        {isSetupMode && (
             <div className="flex flex-1 items-center justify-center p-4 md:p-8 bg-muted/40 min-h-screen">
                <Card className="w-full max-w-3xl">
                    <CardHeader>
                    <CardTitle>Bem-vindo! Vamos configurar seu negócio.</CardTitle>
                    <CardDescription>
                        Precisamos de algumas informações básicas para começar. Preencha os campos abaixo para habilitar as funcionalidades da plataforma.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {user && <BusinessSettingsForm settings={settings} userId={user.uid} onSave={handleSave} onLogout={handleLogout} isSetupMode={true} />}
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  );
}
