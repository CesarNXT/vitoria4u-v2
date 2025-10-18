import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_API_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN || '';

/**
 * GET - Buscar todas as instâncias
 * Proxy para evitar CORS no frontend
 */
export async function GET(request: NextRequest) {
  try {
    if (!ADMIN_TOKEN) {
      console.error('❌ ADMIN_TOKEN não configurado!');
      return NextResponse.json(
        { error: 'Token de administração não configurado' },
        { status: 500 }
      );
    }

    const response = await fetch(`${WHATSAPP_API_URL}/instance/all`, {
      headers: {
        'Accept': 'application/json',
        'admintoken': ADMIN_TOKEN
      }
    });

    if (!response.ok) {
      console.error(`❌ API retornou erro: ${response.status}`);
      throw new Error(`Erro ao buscar instâncias: ${response.status}`);
    }

    const instances = await response.json();

    return NextResponse.json(instances);
  } catch (error) {
    console.error('❌ Erro ao buscar instâncias:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar instâncias' },
      { status: 500 }
    );
  }
}
