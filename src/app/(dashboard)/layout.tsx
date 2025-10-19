'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarFooter,
  useSidebar,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Home, Calendar, Users, Briefcase, Wrench, BarChart3, Settings, LogOut, Sun, Gem, Moon, Loader2, ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';
import type { ConfiguracoesNegocio, User } from '@/lib/types';
import { cn, isAdminUser } from '@/lib/utils';
import { useFirebase, useDoc, useMemoFirebase, FirebaseClientProvider } from '@/firebase';
import { doc } from 'firebase/firestore';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { BusinessUserProvider } from '@/contexts/BusinessUserContext';
import { PlanProvider } from '@/contexts/PlanContext';
import { destroyUserSession, stopImpersonation, getCurrentImpersonation } from '@/app/(public)/login/session-actions';
import { checkAndUpdateExpiration } from '@/lib/check-expiration';


function LayoutWithFirebase({ children }: { children: React.ReactNode }) {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  
  // ⚡ IMPERSONAÇÃO PRIMEIRO (antes de tudo)
  const [impersonatedId, setImpersonatedId] = useState<string | null>(null);
  const [impersonationChecked, setImpersonationChecked] = useState(false);
  
  useEffect(() => {
    getCurrentImpersonation().then(id => {
      setImpersonatedId(id);
      setImpersonationChecked(true);
    });
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (user && !isUserLoading && !impersonatedId) {
      checkAndUpdateExpiration().then((result) => {
        if (result.expired) {
          toast({
            title: "✨ Adquira um Plano Premium",
            description: "Continue usando o sistema gratuitamente! Para ter automações no WhatsApp e IA, escolha um plano que cabe no seu bolso.",
            variant: "default",
            duration: 8000,
          });
          router.refresh();
        }
      });
    }
  }, [user, isUserLoading, impersonatedId]);

  const clearImpersonation = async () => {
    await stopImpersonation();
    window.location.href = '/admin/dashboard';
  };
  
  // ID que será usado para carregar dados
  const businessUserId = impersonatedId || user?.uid || null;
  const typedUser = user as User | null;
  const [isAdmin, setIsAdmin] = useState(false);
  
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
  
  const businessSettingsRef = useMemoFirebase(
    () => (businessUserId && firestore ? doc(firestore, `negocios/${businessUserId}`) : null),
    [businessUserId, firestore]
  );

  const { data: settingsRaw, isLoading: isSettingsLoading } = useDoc<ConfiguracoesNegocio>(businessSettingsRef);
  
  const settings = settingsRaw;
  
  useEffect(() => {
    // Aguardar carregamentos
    if (isUserLoading || isSettingsLoading) return;
    if (!typedUser) {
      window.location.href = '/login';
      return;
    }

    // ADMIN IMPERSONANDO = sem redirects (suporte total)
    if (isAdmin && impersonatedId) {
      return; // Admin tem acesso total, vai onde quiser
    }

    // USUÁRIO NORMAL = só redireciona se REALMENTE não completou setup
    if (!settings || settings.setupCompleted !== true) {
      if (pathname !== '/configuracoes') {
        router.push('/configuracoes');
      }
    }
  }, [isUserLoading, isSettingsLoading, typedUser, settings, isAdmin, impersonatedId, router, pathname]);

  // ⏳ Loading: Aguardar tudo estar pronto
  if (isUserLoading || !typedUser || !impersonationChecked || isSettingsLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  // Admin impersonando NUNCA está em setup
  const needsSetup = (isAdmin && impersonatedId) ? false : (!settings || settings.setupCompleted !== true);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      // ✅ destroyUserSession já limpa todos os cookies incluindo impersonation
      await destroyUserSession();
      
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      window.location.href = '/';
    }
  };

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/agendamentos', label: 'Agendamentos', icon: Calendar },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/profissionais', label: 'Profissionais', icon: Briefcase },
    { href: '/servicos', label: 'Serviços', icon: Wrench },
    { href: '/campanhas', label: 'Campanhas', icon: BarChart3 },
    { href: '/planos', label: 'Planos', icon: Gem },
    { href: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (needsSetup && href !== '/configuracoes') {
      e.preventDefault();
      e.stopPropagation();
      toast({
        variant: 'destructive',
        title: 'Configuração Incompleta',
        description: 'Complete a configuração do seu negócio antes de acessar outras páginas.',
      });
      router.push('/configuracoes');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  
  // ✅ SE ESTÁ EM SETUP, NÃO MOSTRAR SIDEBAR/HEADER - APENAS CONTEÚDO
  if (needsSetup && pathname === '/configuracoes') {
    return (
      <div className="min-h-screen w-full bg-background flex justify-center items-start px-4 py-8">
        {children}
      </div>
    );
  }
  
  return (
    <>
      <Sidebar side="left" variant="sidebar" className="hidden border-r lg:block">
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Button variant="ghost" size="icon" className="shrink-0 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
               <Gem className="size-5" />
            </Button>
            <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              Vitoria IA
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {menuItems.map((item) => {
              const isDisabled = needsSetup && item.href !== '/configuracoes';
              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton 
                      asChild 
                      tooltip={isDisabled ? 'Complete a configuração primeiro' : item.label}
                      isActive={pathname === item.href && !isDisabled}
                      onClick={() => setOpenMobile && setOpenMobile(false)}
                      className={cn(
                        isDisabled && 'opacity-40 cursor-not-allowed grayscale hover:bg-transparent'
                      )}
                  >
                    <Link 
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.href)}
                      className={cn(
                        'flex items-center gap-2',
                        isDisabled && 'pointer-events-none text-muted-foreground/50'
                      )}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2">
           <div className="flex flex-col gap-1">
             <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton 
                      tooltip={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'} 
                      onClick={toggleTheme}
                      className="group-data-[collapsible=icon]:justify-center"
                    >
                      {mounted ? (
                        <>
                          {theme === 'dark' ? <Sun /> : <Moon />}
                          <span className="group-data-[collapsible=icon]:hidden">
                            {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Sun />
                          <span className="group-data-[collapsible=icon]:hidden">
                            Carregando...
                          </span>
                        </>
                      )}
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 {impersonatedId ? (
                   <SidebarMenuItem>
                      <SidebarMenuButton tooltip="Voltar ao Admin" onClick={clearImpersonation}>
                          <ArrowLeft />
                          <span>Voltar ao Admin</span>
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                 ) : (
                  <SidebarMenuItem>
                      <SidebarMenuButton tooltip="Sair" onClick={handleLogout}>
                          <LogOut />
                          <span>Sair</span>
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                 )}
             </SidebarMenu>
           </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
         {impersonatedId && (
            <div className="fixed top-0 left-0 right-0 lg:left-64 z-[60] flex items-center justify-between bg-yellow-400 px-4 py-3 text-yellow-900 shadow-md border-b-2 border-yellow-500">
                <div className='flex items-center gap-2'>
                    <Shield className="h-5 w-5" />
                    <p className="text-sm font-semibold">
                        Visualizando como: <span className="font-bold">{settings?.nome || 'Carregando...'}</span>
                    </p>
                </div>
                <Button variant="ghost" size="sm" onClick={clearImpersonation} className="hover:bg-yellow-500/30">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar ao Admin
                </Button>
            </div>
        )}
        <header className={cn("fixed left-0 right-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-lg md:hidden shadow-sm", impersonatedId ? "top-[52px]" : "top-0")}>
            <SidebarTrigger />
             <div className="flex-1 text-center">
              <span className="text-lg font-semibold">Vitoria IA</span>
            </div>
        </header>
        <main className={cn("flex flex-1 flex-col pt-14 md:pt-0", impersonatedId && "lg:pt-[52px]")}>
          <BusinessUserProvider businessUserId={businessUserId || null}>
            <PlanProvider businessUserId={businessUserId || undefined} firestore={firestore}>
              {children}
            </PlanProvider>
          </BusinessUserProvider>
        </main>
      </SidebarInset>
    </>
  );
}

function LayoutWrapper({ children }: { children: React.ReactNode }) {
    return (
        <FirebaseClientProvider>
            <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="size-8 animate-spin" /></div>}>
                <LayoutWithFirebase>{children}</LayoutWithFirebase>
            </Suspense>
        </FirebaseClientProvider>
    );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
        <LayoutWrapper>{children}</LayoutWrapper>
    </SidebarProvider>
  );
}
