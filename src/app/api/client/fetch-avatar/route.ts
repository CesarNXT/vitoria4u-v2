import { NextRequest, NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase-admin';

const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

/**
 * API para buscar foto de perfil do WhatsApp de um cliente
 * Usa endpoint correto: POST /chat/details
 */
export async function POST(req: NextRequest) {
  try {
    const { tokenInstancia, phoneNumber, businessId, clientId } = await req.json();

    if (!tokenInstancia || !phoneNumber || !businessId || !clientId) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios faltando' },
        { status: 400 }
      );
    }

    const phone = phoneNumber.toString().replace(/\D/g, '');
    
    console.log(`[FETCH-AVATAR-CLIENT] Buscando detalhes do chat para ${phone}`);

    // 1. Buscar detalhes do chat via API UazAPI
    const chatResponse = await fetch(`${API_BASE}/chat/details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': tokenInstancia
      },
      body: JSON.stringify({
        number: phone,
        preview: false // false = imagem full (alta qualidade)
      })
    });

    if (!chatResponse.ok) {
      console.warn(`[FETCH-AVATAR-CLIENT] Erro ao buscar detalhes: ${chatResponse.status}`);
      return NextResponse.json(
        { error: 'Não foi possível buscar detalhes do chat', success: false },
        { status: chatResponse.status }
      );
    }

    const chatData = await chatResponse.json();
    
    const profilePicUrl = chatData?.image || chatData?.imagePreview;

    if (!profilePicUrl) {
      console.warn(`[FETCH-AVATAR-CLIENT] Sem foto de perfil disponível`);
      return NextResponse.json(
        { error: 'Sem foto de perfil disponível', success: false },
        { status: 404 }
      );
    }

    console.log(`[FETCH-AVATAR-CLIENT] Foto encontrada: ${profilePicUrl}`);

    // 2. Download da foto
    let imageBuffer: Buffer | undefined;
    
    try {
      const imageResponse = await fetch(profilePicUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'WhatsApp/2.23.0',
        },
        redirect: 'follow'
      });

      if (imageResponse.ok) {
        imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        console.log(`[FETCH-AVATAR-CLIENT] Download OK: ${imageBuffer.length} bytes`);
      }
    } catch (err) {
      console.warn(`[FETCH-AVATAR-CLIENT] Erro no download:`, err);
    }

    // Se não conseguir baixar, retorna a URL original
    if (!imageBuffer || imageBuffer.length === 0) {
      console.warn(`[FETCH-AVATAR-CLIENT] Não foi possível baixar, retornando URL original`);
      return NextResponse.json({ avatarUrl: profilePicUrl, success: true });
    }

    // 3. Upload para Firebase Storage
    const bucket = adminStorage.bucket();
    if (!bucket) {
      console.warn(`[FETCH-AVATAR-CLIENT] Firebase Storage não configurado`);
      return NextResponse.json({ avatarUrl: profilePicUrl, success: true });
    }

    const fileName = `clientes/${businessId}/${clientId}-${Date.now()}.jpg`;
    const file = bucket.file(fileName);

    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          phoneNumber: phone,
          businessId: businessId,
          clientId: clientId,
          source: 'whatsapp-auto-fetch',
          originalUrl: profilePicUrl
        }
      }
    });

    // Tornar público
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    console.log(`[FETCH-AVATAR-CLIENT] ✅ Foto salva: ${publicUrl}`);
    
    return NextResponse.json({ avatarUrl: publicUrl, success: true });

  } catch (error: any) {
    console.error('[FETCH-AVATAR-CLIENT] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar avatar', success: false },
      { status: 500 }
    );
  }
}
