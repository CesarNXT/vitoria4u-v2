import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin/')) {
    const hasAdminFlag = request.cookies.get('admin-session');
    
    if (!hasAdminFlag) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
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

  if (businessRoutes.some(route => pathname.startsWith(route))) {
    const hasAdminFlag = request.cookies.get('admin-session');
    
    if (hasAdminFlag) {
      return NextResponse.next();
    }
    
    const hasSession = request.cookies.get('session');
    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
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
