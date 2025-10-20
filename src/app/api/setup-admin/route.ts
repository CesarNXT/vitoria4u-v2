import { NextResponse } from 'next/server';
import { setupFirstAdmin } from '@/lib/admin-firestore';

/**
 * 🔧 SETUP INICIAL - Configura o primeiro admin
 * 
 * ⚠️ IMPORTANTE:
 * - Use UMA VEZ para configurar o primeiro admin
 * - Depois, use a interface para adicionar outros
 * - Protegido por ADMIN_SETUP_SECRET
 * 
 * COMO USAR:
 * POST /api/setup-admin
 * Body: { "email": "seu@email.com", "secret": "SEU_ADMIN_SETUP_SECRET" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, secret } = body;

    // Validar secret (proteção básica)
    if (secret !== process.env.ADMIN_SETUP_SECRET) {
      return NextResponse.json(
        { error: 'Secret inválido' },
        { status: 401 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    const result = await setupFirstAdmin(email);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: `Admin ${email} configurado com sucesso!` 
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao processar' },
      { status: 500 }
    );
  }
}
