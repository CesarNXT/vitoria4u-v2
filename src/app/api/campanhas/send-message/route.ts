import { type NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

/**
 * API interna para enviar mensagens do WhatsApp via UAZAPI
 * 
 * Suporta:
 * - Texto
 * - Imagem
 * - Áudio
 * - Vídeo
 */
export async function POST(req: NextRequest) {
  try {
    // 🔒 Validar autenticação
    const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authToken) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    try {
      await adminAuth.verifyIdToken(authToken);
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      instanciaWhatsapp, 
      tokenInstancia, 
      telefone, 
      tipo, 
      mensagem, 
      mediaUrl 
    } = body;

    // Validações
    if (!instanciaWhatsapp || !tokenInstancia || !telefone || !tipo) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios faltando' }, 
        { status: 400 }
      );
    }

    // Formatar telefone (remover caracteres especiais)
    const phoneNumber = String(telefone).replace(/\D/g, '');
    
    if (phoneNumber.length !== 13) {
      return NextResponse.json(
        { error: 'Telefone deve ter 13 dígitos (55 + DDD + número)' }, 
        { status: 400 }
      );
    }

    let response;

    // Enviar baseado no tipo
    if (tipo === 'texto') {
      // Enviar texto
      if (!mensagem) {
        return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
      }

      response = await fetch(`https://${instanciaWhatsapp}.uazapi.com/send/text`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': tokenInstancia,
        },
        body: JSON.stringify({
          number: phoneNumber,
          text: mensagem,
        }),
      });
    } else {
      // Enviar mídia (imagem, áudio ou vídeo)
      if (!mediaUrl) {
        return NextResponse.json({ error: 'URL da mídia é obrigatória' }, { status: 400 });
      }

      // Mapear tipo para o formato da API
      const typeMap: Record<string, string> = {
        'imagem': 'image',
        'audio': 'audio',
        'video': 'video',
      };

      const apiType = typeMap[tipo] || tipo;

      response = await fetch(`https://${instanciaWhatsapp}.uazapi.com/send/media`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': tokenInstancia,
        },
        body: JSON.stringify({
          number: phoneNumber,
          type: apiType,
          file: mediaUrl,
        }),
      });
    }

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao enviar mensagem via UAZAPI:', responseData);
      return NextResponse.json(
        { 
          error: 'Falha ao enviar mensagem', 
          details: responseData 
        }, 
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error('Erro na API de envio:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
