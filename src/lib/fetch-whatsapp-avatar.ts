/**
 * Busca foto de perfil do WhatsApp usando endpoint correto /chat/details
 * Usado para auto-preencher avatar de profissionais
 */

import { adminStorage } from './firebase-admin';

const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

/**
 * Busca e salva foto de perfil do WhatsApp para um profissional
 * @param tokenInstancia - Token da instância do WhatsApp
 * @param phoneNumber - Número do profissional (ex: 5581997628611)
 * @param businessId - ID do negócio
 * @param professionalId - ID do profissional
 * @returns URL pública da foto ou undefined se falhar
 */
export async function fetchAndSaveWhatsAppAvatar(
  tokenInstancia: string,
  phoneNumber: string | number,
  businessId: string,
  professionalId: string
): Promise<string | undefined> {
  try {
    const phone = phoneNumber.toString().replace(/\D/g, '');
    
    console.log(`[FETCH-AVATAR] Buscando detalhes do chat para ${phone}`);

    // 1. Buscar detalhes do chat via API UazAPI (endpoint correto!)
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
      console.warn(`[FETCH-AVATAR] Erro ao buscar detalhes: ${chatResponse.status}`);
      return undefined;
    }

    const chatData = await chatResponse.json();
    
    // A API retorna: image (full) e imagePreview (menor)
    const profilePicUrl = chatData?.image || chatData?.imagePreview;

    if (!profilePicUrl) {
      console.warn(`[FETCH-AVATAR] Sem foto de perfil disponível para ${phone}`);
      return undefined;
    }

    console.log(`[FETCH-AVATAR] Foto encontrada: ${profilePicUrl}`);

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
        console.log(`[FETCH-AVATAR] Download OK: ${imageBuffer.length} bytes`);
      }
    } catch (err) {
      console.warn(`[FETCH-AVATAR] Erro no download:`, err);
    }

    // Se não conseguir baixar, retorna a URL original
    if (!imageBuffer || imageBuffer.length === 0) {
      console.warn(`[FETCH-AVATAR] Não foi possível baixar, retornando URL original`);
      return profilePicUrl;
    }

    // 3. Upload para Firebase Storage
    const bucket = adminStorage.bucket();
    if (!bucket) {
      console.warn(`[FETCH-AVATAR] Firebase Storage não configurado`);
      return profilePicUrl;
    }

    const fileName = `profissionais/${businessId}/${professionalId}-${Date.now()}.jpg`;
    const file = bucket.file(fileName);

    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          phoneNumber: phone,
          businessId: businessId,
          professionalId: professionalId,
          source: 'whatsapp-auto-fetch',
          originalUrl: profilePicUrl
        }
      }
    });

    // Tornar público
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    console.log(`[FETCH-AVATAR] ✅ Foto salva: ${publicUrl}`);
    return publicUrl;

  } catch (error) {
    console.error('[FETCH-AVATAR] Erro:', error);
    return undefined;
  }
}
