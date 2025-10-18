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
import { destroyUserSession, stopImpersonation } from '@/app/(public)/login/session-actions';
import { checkAndUpdateExpiration } from '@/lib/check-expiration';


function LayoutWithFirebase({ children }: { children: React.ReactNode }) {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (user && !isUserLoading) {
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
  }, [user, isUserLoading]);

  const searchParams = useSearchParams();
  const [impersonatedId, setImpersonatedId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('impersonatedBusinessId');
    }
    return null;
  });
  
  useEffect(() => {
    const urlImpersonatedId = searchParams.get('impersonate');
    if (urlImpersonatedId) {
      localStorage.setItem('impersonatedBusinessId', urlImpersonatedId);
      setImpersonatedId(urlImpersonatedId);
      router.replace(pathname);
    } else {
      const storedId = localStorage.getItem('impersonatedBusinessId');
      if (storedId) {
        setImpersonatedId(storedId);
      }
    }
  }, [searchParams, router, pathname]);

  useEffect(() => {
    const validateImpersonation = async () => {
      if (impersonatedId && user) {
        try {
          const token = await user.getIdToken();
          const response = await fetch('/api/validate-impersonation', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ businessId: impersonatedId })
          });
          
          const data = await response.json();
          
          if (!response.ok || !data.valid) {
            localStorage.removeItem('impersonatedBusinessId');
            setImpersonatedId(null);
            router.push('/admin/dashboard');
            toast({
              variant: 'destructive',
              title: 'Acesso Negado',
              description: data.error || 'Impersonação inválida.'
            });
          }
        } catch (error) {
          console.error('Erro ao validar impersonação:', error);
          localStorage.removeItem('impersonatedBusinessId');
          setImpersonatedId(null);
          router.push('/admin/dashboard');
        }
      }
    };
    
    if (impersonatedId && user) {
      validateImpersonation();
    }
  }, [impersonatedId, user, router, toast]);

  const clearImpersonation = async () => {
    await stopImpersonation();
    localStorage.removeItem('impersonatedBusinessId');
    setImpersonatedId(null);
    window.location.href = '/admin/dashboard';
  };

  const businessUserId = impersonatedId || user?.uid;
  
  const typedUser = user as User | null;
  const isAdmin = isAdminUser(typedUser?.email);
  
  const businessSettingsRef = useMemoFirebase(
    () => (businessUserId && firestore ? doc(firestore, `negocios/${businessUserId}`) : null),
    [businessUserId, firestore]
  );

  const { data: settingsRaw, isLoading: isSettingsLoading } = useDoc<ConfiguracoesNegocio>(businessSettingsRef);
  
  const settings = settingsRaw ? {
    ...settingsRaw,
    setupCompleted: settingsRaw.setupCompleted === true ? true : false
  } : null;
  
  useEffect(() => {
    if (isUserLoading || isSettingsLoading) return;

    if (!typedUser) {
      window.location.href = '/login';
      return;
    }

    // Admin SEM impersonation → não deixa acessar /dashboard
    if (isAdmin && !impersonatedId) {
      router.push('/admin/dashboard');
      return;
    }

    // Admin COM impersonation OU usuário normal → verifica setup
    if (settings) {
      const needsSetup = settings.setupCompleted !== true;
      
      if (needsSetup && pathname !== '/configuracoes') {
        router.push('/configuracoes');
        return;
      }
    }
  }, [isUserLoading, isSettingsLoading, typedUser, settings, isAdmin, impersonatedId, router, pathname]);

  // Admin impersonando = é tratado como business user
  // Usuário normal = business user
  const isBusinessUser = typedUser && (!isAdmin || impersonatedId);
  const isLoading = isUserLoading || (isBusinessUser && isSettingsLoading);
  const needsSetup = isBusinessUser && settings && settings.setupCompleted !== true;

  if (isLoading || !typedUser) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }
  
  // Admin impersonando também passa pelas mesmas validações que business user
  if (isBusinessUser && !settings) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  if (needsSetup && pathname !== '/configuracoes') {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Preparando configuração...</p>
              </div>
          </div>
      )
  }


  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await destroyUserSession();
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('impersonatedBusinessId');
        localStorage.clear();
      }
      
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
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
            {children}
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
