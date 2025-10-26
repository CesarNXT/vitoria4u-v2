import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

/**
 * API para buscar foto de perfil do WhatsApp de um cliente/profissional
 * Usa endpoint correto: POST /chat/details
 * Retorna URL direta do WhatsApp (mais rápido e econômico)
 * Usa token do próprio negócio para operações de leitura
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

    // Buscar token do negócio do Firestore
    const businessDoc = await adminDb.collection('negocios').doc(businessId).get();
    const businessData = businessDoc.data();
    
    const token = businessData?.tokenInstancia;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token do negócio não configurado. Conecte o WhatsApp nas Configurações.', success: false },
        { status: 500 }
      );
    }

    const phone = phoneNumber.toString().replace(/\D/g, '');

    // 1. Buscar detalhes do chat via API UazAPI usando token do negócio
    const chatResponse = await fetch(`${API_BASE}/chat/details`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': token
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
