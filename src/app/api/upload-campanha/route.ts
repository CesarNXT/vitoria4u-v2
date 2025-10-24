import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Upload para Campanhas (temporário)
 * Usa apenas Catbox.moe pois as imagens são temporárias
 */

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

// Upload no Catbox.moe (para campanhas temporárias)
async function uploadToCatbox(file: File): Promise<string | null> {
  try {
    // Criar FormData específico para Catbox
    const catboxFormData = new FormData();
    catboxFormData.append('reqtype', 'fileupload');
    catboxFormData.append('fileToUpload', file);

    const response = await withTimeout(
      fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: catboxFormData,
      }),
      15000,
      'Timeout ao fazer upload no Catbox'
    );

    const responseText = await response.text();

    if (response.ok && responseText.startsWith('http')) {
      return responseText;
    }
    
    console.warn('⚠️ [UPLOAD-CAMPANHA] Catbox falhou:', responseText);
    return null;
  } catch (error) {
    console.error('❌ [UPLOAD-CAMPANHA] Erro no Catbox:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function POST(req: NextRequest) {
    const requestStartTime = Date.now();
    try {
        const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!authToken) {
            console.error('[UPLOAD-CAMPANHA] ❌ Token de autorização não fornecido');
            return new NextResponse('Unauthorized: No token provided', { status: 401 });
        }
        
        // Validar token
        let userId: string;
        try {
            const decodedToken = await withTimeout(
                adminAuth.verifyIdToken(authToken),
                10000,
                'Timeout ao verificar token'
            );
            userId = decodedToken.uid;
        } catch (error) {
            console.error('❌ [UPLOAD-CAMPANHA] Token inválido:', error);
            return new NextResponse('Unauthorized: Invalid token', { status: 401 });
        }
        
        const formData = await req.formData();
        const fileField = formData.get('fileToUpload') || formData.get('file');
        
        if (!fileField || !(fileField instanceof File)) {
            console.error('[UPLOAD-CAMPANHA] ❌ Nenhum arquivo encontrado');
            return new NextResponse('Nenhum arquivo enviado', { status: 400 });
        }
        
        const file = fileField as File;
        
        // Validação de tamanho (200MB máximo)
        if (file.size > 200 * 1024 * 1024) {
            console.error('[UPLOAD-CAMPANHA] ❌ Arquivo muito grande:', file.size);
            return new NextResponse('Arquivo muito grande. Máximo: 200MB', { status: 400 });
        }
        
        // Upload para Catbox (campanhas temporárias)
        const uploadUrl = await uploadToCatbox(file);
        
        if (!uploadUrl) {
            throw new Error('Falha no upload para Catbox');
        }

        // Upload bem-sucedido
        
        const totalDuration = Date.now() - requestStartTime;
        return new NextResponse(uploadUrl, { 
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            }
        });

    } catch (error) {
        const totalDuration = Date.now() - requestStartTime;
        console.error(`❌ [UPLOAD-CAMPANHA] ERRO após ${totalDuration}ms:`, {
            error: error instanceof Error ? error.message : error,
        });
        
        if (error instanceof Error) {
            return new NextResponse(`Erro ao fazer upload: ${error.message}`, { status: 500 });
        }
        return new NextResponse('Erro ao fazer upload da imagem. Tente novamente.', { status: 500 });
    }
}
