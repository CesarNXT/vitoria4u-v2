
'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Users, Gem, LogOut, Sun, Moon, Loader2, Home, Settings, Building2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useFirebase, FirebaseClientProvider } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { getAuth, signOut, type User as FirebaseUser } from 'firebase/auth';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import type { User } from '@/lib/types';
import { destroyUserSession } from '@/app/(public)/login/session-actions';
import { useAdminSync } from '@/hooks/use-admin-sync';

// Layout específico para o painel do Super Admin
function AdminLayoutWithFirebase({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { setOpenMobile } = useSidebar();
  const [adminVerified, setAdminVerified] = useState(false);
  
  // ⚠️ REMOVIDO: beforeunload estava desconectando no F5
  // O Firebase mantém a sessão automaticamente via tokens
  // Logout deve ser apenas via botão de logout explícito
  
  // 🔥 Sincronizar documento admin automaticamente
  useAdminSync();
  
  // ❌ REMOVIDO: Sincronização automática de planos
  // Os planos agora são totalmente editáveis via Firestore sem interferência do código
  // Para criar planos do zero, use: /api/admin/seed-plans (chamada manual)

  useEffect(() => {
    setMounted(true);
  }, []);

  const typedUser = user as User | null;

  // ✅ VERIFICAÇÃO SEM GAMBIARRA - Apenas verifica se está logado
  useEffect(() => {
    // Aguardar user carregar
    if (isUserLoading) return;
    
    // ✅ CRITICAL: Se está fazendo logout, NÃO redirecionar
    if (typeof window !== 'undefined' && sessionStorage.getItem('logging_out') === 'true') {
      return;
    }
    
    // Se não tem usuário, redirecionar para login
    if (!typedUser) {
      window.location.href = '/admin';
      return;
    }

    // Se tem usuário logado, permitir acesso
    // (A verificação de admin já foi feita no login)
    setAdminVerified(true);
  }, [typedUser, isUserLoading]);

  // Mostrar loading até verificação completar
  if (!adminVerified || isUserLoading || !typedUser) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      
      // ✅ CRITICAL: Set flag ANTES de qualquer operação async
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('logging_out', 'true');
        localStorage.clear();
      }
      
      // ✅ destroyUserSession já limpa todos os cookies incluindo impersonation
      await destroyUserSession();
      await signOut(auth);
      
      // Usar replace ao invés de href para evitar histórico
      window.location.replace('/');
    } catch (error) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('logging_out', 'true');
      }
      window.location.replace('/');
    }
  };

  const menuItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
    { href: '/admin/negocios', label: 'Negócios', icon: Building2 },
    { href: '/admin/planos', label: 'Planos', icon: Gem },
    { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
  ];

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  
  return (
    <>
      <Sidebar side="left" variant="sidebar" className="hidden border-r lg:block">
        <SidebarHeader className="p-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
             <Button variant="ghost" size="icon" className="shrink-0 bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90">
               <Gem className="size-5" />
            </Button>
            <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              Admin Panel
            </span>
          </Link>
          <div className="mt-2 group-data-[collapsible=icon]:hidden">
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <ShieldCheck className="h-3 w-3" />
              {typedUser?.email}
            </Badge>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton 
                    asChild 
                    tooltip={item.label}
                    isActive={pathname.startsWith(item.href)}
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
                  <SidebarMenuItem>
                      <SidebarMenuButton tooltip="Sair" onClick={handleLogout}>
                          <LogOut />
                          <span className="group-data-[collapsible=icon]:hidden">Sair</span>
                      </SidebarMenuButton>
                  </SidebarMenuItem>
             </SidebarMenu>
           </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-lg md:hidden">
            <SidebarTrigger />
             <div className="flex-1 flex flex-col items-center">
              <span className="text-lg font-semibold">Admin Panel</span>
              <Badge variant="secondary" className="flex items-center gap-1 text-[10px] h-5">
                <ShieldCheck className="h-2.5 w-2.5" />
                {typedUser?.email}
              </Badge>
            </div>
        </header>
        <main className="flex flex-1 flex-col">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}


export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <FirebaseClientProvider>
        <AdminLayoutWithFirebase>{children}</AdminLayoutWithFirebase>
      </FirebaseClientProvider>
    </SidebarProvider>
  );
}
