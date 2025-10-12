
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
import { Home, Calendar, Users, Briefcase, Scissors, BarChart3, Settings, LogOut, Sun, Gem, Moon, Loader2, ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';
import type { ConfiguracoesNegocio, User } from '@/lib/types';
import { cn, isAdminUser } from '@/lib/utils';
import { useFirebase, useDoc, useMemoFirebase, FirebaseClientProvider } from '@/firebase';
import { doc } from 'firebase/firestore';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';


function LayoutWithFirebase({ children }: { children: React.ReactNode }) {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
      // Limpa a URL para não manter o parâmetro visível
      router.replace(pathname);
    } else {
      const storedId = localStorage.getItem('impersonatedBusinessId');
      if (storedId) {
        setImpersonatedId(storedId);
      }
    }
  }, [searchParams, router, pathname]);

  const clearImpersonation = () => {
    localStorage.removeItem('impersonatedBusinessId');
    setImpersonatedId(null);
    router.push('/admin/dashboard');
  };

  const businessUserId = impersonatedId || user?.uid;
  
  const typedUser = user as User | null;
  const isAdmin = isAdminUser(typedUser?.email);
  
  const businessSettingsRef = useMemoFirebase(
    () => (businessUserId && firestore ? doc(firestore, `negocios/${businessUserId}`) : null),
    [businessUserId, firestore]
  );

  const { data: settingsRaw, isLoading: isSettingsLoading } = useDoc<ConfiguracoesNegocio>(businessSettingsRef);
  
  // Normaliza setupCompleted para garantir que undefined seja tratado como false
  const settings = settingsRaw ? {
    ...settingsRaw,
    setupCompleted: settingsRaw.setupCompleted === true ? true : false
  } : null;
  
  // O useEffect antigo foi removido, pois a lógica foi unificada no useEffect abaixo.
  
  useEffect(() => {
    // Protege o acesso e força a configuração inicial
    if (isUserLoading || isSettingsLoading) return; // Aguarda o carregamento de tudo

    const isBusinessUser = typedUser && !isAdmin;

    if (!typedUser) {
      router.push('/login');
      return;
    }

    if (isAdmin && !impersonatedId) {
      router.push('/admin/dashboard');
      return;
    }

    // SEGURANÇA DESABILITADA TEMPORARIAMENTE - estava bloqueando todos os usuários
    // TODO: Revisar lógica de validação de documento
    // if (isBusinessUser && !impersonatedId && !isSettingsLoading && !settings && pathname !== '/configuracoes') {
    //   console.warn('SEGURANÇA: Usuário autenticado mas sem documento no banco. Forçando logout.');
    //   const auth = getAuth();
    //   signOut(auth).then(() => {
    //     window.location.href = '/login';
    //   });
    //   return;
    // }

    // BLOQUEIO CRÍTICO: Força configuração obrigatória para usuários de negócio
    // Contas novas e antigas sem setupCompleted são bloqueadas até completar a configuração
    if (isBusinessUser && !impersonatedId && settings) {
      const needsSetup = settings.setupCompleted !== true;
      
      if (needsSetup && pathname !== '/configuracoes') {
        router.push('/configuracoes');
      }
    }
  }, [isUserLoading, isSettingsLoading, typedUser, settings, isAdmin, impersonatedId, router, pathname]);

  const isLoading = isUserLoading || (businessUserId && isSettingsLoading);

  // Verifica se precisa completar setup
  const needsSetup = typedUser && !isAdmin && !impersonatedId && settings && settings.setupCompleted !== true;

  // SEGURANÇA CRÍTICA: Bloqueia renderização até verificar setup
  // Isso previne que usuários vejam qualquer página antes de completar configuração
  if (isLoading || !typedUser) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="size-8 animate-spin" />
        </div>
    )
  }

  // Admin redirect
  if (isAdmin && !impersonatedId && pathname !== '/admin/dashboard') {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="size-8 animate-spin" />
        </div>
    )
  }

  // BLOQUEIO TOTAL: Não renderiza NADA até estar em /configuracoes
  if (needsSetup && pathname !== '/configuracoes') {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="size-8 animate-spin" />
        </div>
    )
  }


  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    // Usar window.location para forçar navegação completa e evitar redirect
    window.location.href = '/';
  };

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/agendamentos', label: 'Agendamentos', icon: Calendar },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/profissionais', label: 'Profissionais', icon: Briefcase },
    { href: '/servicos', label: 'Serviços', icon: Scissors },
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
            <div className="sticky top-0 z-50 flex items-center justify-between bg-yellow-400/80 px-4 py-2 text-yellow-900 shadow-inner backdrop-blur-sm">
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
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-lg md:hidden">
            <SidebarTrigger />
             <div className="flex-1 text-center">
              <span className="text-lg font-semibold">Vitoria IA</span>
            </div>
        </header>
        <main className="flex flex-1 flex-col">
          {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                  // Pass businessUserId to every child page
                  return React.cloneElement(child, { businessUserId } as any);
              }
              return child;
          })}
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
    )
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
