"use client";

import { useEffect, useState } from "react";
import { useFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConfiguracoesNegocio, User, DiasDaSemana } from '@/lib/types';
import BusinessSettingsForm from "@/app/(dashboard)/configuracoes/business-settings-form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield } from "lucide-react";
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
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Verifica se está impersonando (admin dando suporte)
  const [impersonatedId, setImpersonatedId] = useState<string | null>(null);
  
  // ✅ Verificar admin via custom claims do token JWT
  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      
      const adminStatus = await isAdminUser(user);
      setIsAdmin(adminStatus);
    }
    
    checkAdmin();
  }, [user]);
  
  // ✅ SEGURANÇA: Ler impersonação de cookie HTTP-only (não localStorage)
  useEffect(() => {
    async function loadImpersonation() {
      const { getCurrentImpersonation } = await import('@/app/(public)/login/session-actions');
      const cookieId = await getCurrentImpersonation();
      setImpersonatedId(cookieId);
    }
    
    loadImpersonation();
  }, []);


 useEffect(() => {
    async function loadData() {
        if (!user || !firestore) return;
        
        // Define qual ID usar: impersonatedId (admin dando suporte) ou user.uid (dono/admin)
        // Admin SEM impersonar = gerencia SEU PRÓPRIO negócio (como Google/AWS fazem)
        const businessId = impersonatedId || user.uid;

        setIsLoading(true);
        try {
            // Correctly fetch settings directly from the 'negocios' collection
            const settingsDocRef = doc(firestore, `negocios/${businessId}`);
            const settingsDoc = await getDoc(settingsDocRef);

            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                
                // Migração automática: Gera o link de agendamento se não existir
                let bookingLink = data.linkAgendamento;
                if (!bookingLink && data.setupCompleted === true) {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    bookingLink = `${origin}/agendar/${businessId}`;
                    
                    // Salva o link silenciosamente sem notificar o usuário
                    setDocumentNonBlocking(settingsDocRef, { linkAgendamento: bookingLink }, { merge: true });
                }
                
                const updatedSettings = {
                    ...data,
                    access_expires_at: data.access_expires_at?.toDate ? data.access_expires_at.toDate() : data.access_expires_at,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                    setupCompleted: data.setupCompleted === true ? true : false,
                    // Inclui o link de agendamento (gerado ou existente)
                    linkAgendamento: bookingLink,
                } as ConfiguracoesNegocio;
                
                setSettings(updatedSettings);
            } else {
                // ✅ CRIAR documento no Firestore se não existir (evita loop de redirecionamento)
                const initialSettings = {
                    id: businessId,
                    setupCompleted: false,
                    createdAt: new Date(),
                    nome: '',
                    email: user?.email || '',
                };
                
                // Criar documento no Firestore
                await setDocumentNonBlocking(settingsDocRef, initialSettings, { merge: true });
                
                setSettings(initialSettings as ConfiguracoesNegocio);
            }

        } catch(e) {
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
}, [user, firestore, toast, impersonatedId, isAdmin]);


 const handleSave = async (updatedSettings: Partial<ConfiguracoesNegocio>) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Usuário não autenticado. Por favor, faça login novamente.'
      });
      return;
    }
    
    // Define qual ID usar: impersonatedId (admin dando suporte) ou user.uid (dono)
    const businessId = impersonatedId || user.uid;
    const settingsRef = doc(firestore, 'negocios', businessId);
    
    const wasInSetup = !settings?.setupCompleted;
    
    const finalSettings: Partial<ConfiguracoesNegocio> = { 
      ...updatedSettings,
    };
    
    // Se estava em setup mode e está salvando, marca como concluído
    if (wasInSetup) {
      finalSettings.setupCompleted = true;
    }
    
    // Gera o link de agendamento se não existir (para contas novas e antigas)
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const bookingLink = `${origin}/agendar/${businessId}`;
    
    if (!settings?.linkAgendamento || settings.linkAgendamento !== bookingLink) {
      finalSettings.linkAgendamento = bookingLink;
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
    
    // ✅ NOVO: Redireciona TODOS após setup (admin e usuário comum)
    // EXCETO admin impersonando (que está dando suporte)
    if (wasInSetup && !impersonatedId) {
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

  // ✅ NOVO: Admin pode ter seu próprio negócio!
  // Determine if it's setup mode based on setupCompleted flag
  // Se tem nome e telefone, considera setup completo (contas antigas)
  const isSetupMode = !settings?.setupCompleted && !(settings?.nome && settings?.telefone);

  return (
    <div className={cn(
      isSetupMode 
        ? "" 
        : "w-full flex-1 space-y-4 p-4 md:p-8"
    )}>
      <Card className={cn(
        "shadow-xl border-2",
        isSetupMode 
          ? "w-full max-w-6xl mx-auto" 
          : "w-full max-w-5xl mx-auto"
      )}>
        <CardHeader className="space-y-3 px-6 md:px-8 pt-6 pb-4">
          <CardTitle className={cn(
            "text-2xl md:text-3xl font-bold",
            isSetupMode && "text-center"
          )}>
            {isSetupMode ? '🎯 Configuração Inicial' : 'Configurações do Negócio'}
          </CardTitle>
          <CardDescription className={cn(
            "text-sm md:text-base",
            isSetupMode && "text-center"
          )}>
            {isSetupMode ? (
              'Preencha as informações básicas do seu negócio para começar.'
            ) : impersonatedId ? (
              <span className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                <Shield className="h-4 w-4" />
                Modo Suporte: Editando configurações do cliente
              </span>
            ) : (
              'Gerencie as informações essenciais que alimentam a IA, o sistema de agendamento e outras funcionalidades.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 md:px-8 pb-8">
          {user && <BusinessSettingsForm 
            settings={settings} 
            userId={impersonatedId || user.uid} 
            onSave={handleSave} 
            onLogout={isSetupMode ? handleLogout : undefined}
            isSetupMode={isSetupMode} 
          />}
        </CardContent>
      </Card>
    </div>
  );
}
