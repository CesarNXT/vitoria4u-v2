/**
 * Busca foto de perfil do WhatsApp usando endpoint correto /chat/details
 * Usado para auto-preencher avatar de profissionais
 * Retorna URL direta do WhatsApp (mais rápido e econômico)
 */

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

    // 1. Buscar detalhes do chat via API UazAPI
    const chatResponse = await fetch(`${API_BASE}/chat/details`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': tokenInstancia
      },
      body: JSON.stringify({
        number: phone,
        preview: false
      })
    });

    if (!chatResponse.ok) {
      return undefined;
    }

    const chatData = await chatResponse.json();
    const profilePicUrl = chatData?.image || chatData?.imagePreview;

    if (!profilePicUrl) {
      return undefined;
    }

    return profilePicUrl;

  } catch (error) {
    return undefined;
  }
}
