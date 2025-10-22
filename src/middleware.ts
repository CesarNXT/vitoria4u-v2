import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * ⚠️ IMPORTANTE: Middleware roda no Edge Runtime
 * Não podemos usar Firebase Admin SDK aqui (precisa Node.js completo)
 * A validação REAL de token JWT acontece em:
 * - Layouts (client-side via custom claims)
 * - APIs (server-side via adminAuth)
 * 
 * Middleware apenas verifica EXISTÊNCIA de cookies
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/resetar-senha',
    '/termos-uso',
    '/politica-privacidade',
    '/admin',
  ];

  if (pathname.startsWith('/agendar/')) {
    return NextResponse.next();
  }

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // ✅ APIs admin: verificação de cookie (validação JWT completa acontece na própria API)
  if (pathname.startsWith('/api/admin/')) {
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Cookie existe - deixa API fazer validação JWT completa
    return NextResponse.next();
  }
  
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ✅ Rotas admin: verificar cookie existe (validação JWT completa no layout)
  if (pathname.startsWith('/admin/')) {
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      // 🔥 Sem cookie de sessão - limpar todos os cookies e redirecionar
      const response = NextResponse.redirect(new URL('/admin', request.url));
      response.cookies.delete('session');
      response.cookies.delete('admin-session');
      response.cookies.delete('impersonating');
      return response;
    }
    
    // Cookie existe - layout fará validação JWT completa com custom claims
    return NextResponse.next();
  }
  
  const businessRoutes = [
    '/dashboard',
    '/agendamentos',
    '/clientes',
    '/profissionais',
    '/servicos',
    '/campanhas',
    '/planos',
    '/configuracoes',
    '/billing',
    '/pagamento',
  ];

  // ✅ Rotas de negócio: verificar cookie existe (validação JWT completa no layout)
  if (businessRoutes.some(route => pathname.startsWith(route))) {
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      // 🔥 Sem cookie de sessão - limpar todos os cookies e redirecionar
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      response.cookies.delete('admin-session');
      response.cookies.delete('impersonating');
      return response;
    }
    
    // Cookie existe - layout fará validação JWT completa
    // Admin pode acessar via custom claims verificados no layout
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
