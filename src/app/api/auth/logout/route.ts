/**
 * 🚪 API Route: Logout
 * Limpa cookies de sessão e impersonation quando o usuário sai do painel
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Limpar todos os cookies relacionados à autenticação
    const cookiesToDelete = [
      'user_session',
      'impersonation',
      'session',
      'auth_token',
      '__session',
    ];
    
    cookiesToDelete.forEach(cookieName => {
      try {
        cookieStore.delete(cookieName);
      } catch (error) {
        // Cookie pode não existir, ignorar erro
      }
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Erro ao limpar cookies:', error);
    // Mesmo com erro, retornar sucesso para não bloquear o logout
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
