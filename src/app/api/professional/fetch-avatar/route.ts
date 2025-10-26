import { NextRequest, NextResponse } from 'next/server';
import { fetchAndSaveWhatsAppAvatar } from '@/lib/fetch-whatsapp-avatar';

/**
 * API para buscar foto de perfil do WhatsApp de um profissional
 * Usa endpoint correto: POST /chat/details
 */
export async function POST(req: NextRequest) {
  try {
    const { tokenInstancia, phoneNumber, businessId, professionalId } = await req.json();

    if (!tokenInstancia || !phoneNumber || !businessId || !professionalId) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios faltando' },
        { status: 400 }
      );
    }

    const avatarUrl = await fetchAndSaveWhatsAppAvatar(
      tokenInstancia,
      phoneNumber,
      businessId,
      professionalId
    );

    if (avatarUrl) {
      return NextResponse.json({ avatarUrl, success: true });
    } else {
      return NextResponse.json(
        { error: 'Não foi possível buscar foto do WhatsApp', success: false },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('[API-FETCH-AVATAR] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar avatar', success: false },
      { status: 500 }
    );
  }
}
