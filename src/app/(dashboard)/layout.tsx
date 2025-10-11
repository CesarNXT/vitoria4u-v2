
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


function LayoutWithFirebase({ children }: { children: React.ReactNode }) {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
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

  const { data: settings, isLoading: isSettingsLoading } = useDoc<ConfiguracoesNegocio>(businessSettingsRef);
  
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

    // Força o redirecionamento para a configuração se o nome do negócio não estiver definido
    if (isBusinessUser && !impersonatedId && settings && !settings.nome && pathname !== '/configuracoes') {
      router.push('/configuracoes');
    }
  }, [isUserLoading, isSettingsLoading, typedUser, settings, isAdmin, impersonatedId, router, pathname]);

  const isLoading = isUserLoading || (businessUserId && isSettingsLoading);

  // Estado de loading principal
  if (isLoading || !typedUser || (isAdmin && !impersonatedId && pathname !== '/admin/dashboard')) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="size-8 animate-spin" />
        </div>
    )
  }

  // Estado de configuração forçada (sem sidebar)
  const needsSetup = typedUser && !isAdmin && !impersonatedId && settings && !settings.nome;
  if (needsSetup) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/40">
        <main className="w-full max-w-4xl p-4">
          {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                  return React.cloneElement(child, { businessUserId } as any);
              }
              return child;
          })}
        </main>
      </div>
    );
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
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton 
                    asChild 
                    tooltip={item.label}
                    isActive={pathname === item.href}
                    onClick={() => setOpenMobile && setOpenMobile(false)}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
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
