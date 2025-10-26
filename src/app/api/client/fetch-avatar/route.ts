import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';
const NOTIFICATION_TOKEN = process.env.VITORIA4U_NOTIFICATION_TOKEN;

/**
 * API para buscar foto de perfil do WhatsApp de um cliente/profissional
 * Usa endpoint correto: POST /chat/details
 * Retorna URL direta do WhatsApp (mais rápido e econômico)
 * Usa token de notificações da Vitoria4U para operações de leitura
 */
export async function POST(req: NextRequest) {
  try {
    const { tokenInstancia, phoneNumber, businessId, clientId } = await req.json();

    if (!phoneNumber || !businessId || !clientId) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios faltando' },
        { status: 400 }
      );
    }

    if (!NOTIFICATION_TOKEN) {
      return NextResponse.json(
        { error: 'Token de notificações não configurado', success: false },
        { status: 500 }
      );
    }

    const phone = phoneNumber.toString().replace(/\D/g, '');

    // 1. Buscar detalhes do chat via API UazAPI usando token de notificações
    const chatResponse = await fetch(`${API_BASE}/chat/details`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': NOTIFICATION_TOKEN
      },
      body: JSON.stringify({
        number: phone,
        preview: false
      })
    });

    if (!chatResponse.ok) {
      // Falhar silenciosamente (token inválido/expirado é comum)
      return NextResponse.json(
        { error: 'Não foi possível buscar foto', success: false },
        { status: 404 }
      );
    }

    const chatData = await chatResponse.json();
    const profilePicUrl = chatData?.image || chatData?.imagePreview;

    if (!profilePicUrl) {
      return NextResponse.json(
        { error: 'Sem foto de perfil disponível', success: false },
        { status: 404 }
      );
    }

    // Retornar URL direta do WhatsApp
    return NextResponse.json({ avatarUrl: profilePicUrl, success: true });

  } catch (error: any) {
    // Falhar silenciosamente
    return NextResponse.json(
      { error: 'Erro ao buscar avatar', success: false },
      { status: 500 }
    );
  }
}
