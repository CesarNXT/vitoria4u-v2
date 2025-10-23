import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminStorage } from '@/lib/firebase-admin';

/**
 * Upload com múltiplos provedores e fallback automático
 * Ordem de tentativa:
 * 1. Catbox.moe (rápido e gratuito)
 * 2. ImgBB (fallback 1)
 * 3. Firebase Storage (fallback 2 - sempre funciona)
 */

/**
 * Wrapper para adicionar timeout em operações assíncronas
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

// Tentar upload no Catbox.moe
async function uploadToCatbox(formData: FormData): Promise<string | null> {
  try {
    const response = await withTimeout(
      fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
      }),
      15000, // 15 segundos timeout
      'Timeout ao fazer upload no Catbox'
    );

    const responseText = await response.text();

    if (response.ok && responseText.startsWith('http')) {
      return responseText;
    }
    
    console.warn('⚠️ [UPLOAD] Catbox falhou:', responseText);
    return null;
  } catch (error) {
    console.error('❌ [UPLOAD] Erro no Catbox:', error instanceof Error ? error.message : error);
    return null;
  }
}

// Tentar upload no ImgBB (requer API key)
async function uploadToImgBB(file: File): Promise<string | null> {
  try {
    const apiKey = process.env.IMGBB_API_KEY;
    
    if (!apiKey) {
      return null;
    }

    const formData = new FormData();
    formData.append('image', file);
    
    const response = await withTimeout(
      fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      }),
      15000, // 15 segundos timeout
      'Timeout ao fazer upload no ImgBB'
    );

    const data = await response.json();

    if (data.success && data.data?.url) {
      return data.data.url;
    }
    
    console.warn('⚠️ [UPLOAD] ImgBB falhou:', data);
    return null;
  } catch (error) {
    console.error('❌ [UPLOAD] Erro no ImgBB:', error instanceof Error ? error.message : error);
    return null;
  }
}

// Upload no Firebase Storage (sempre funciona)
async function uploadToFirebase(file: File, userId: string): Promise<string> {
  const startTime = Date.now();
  
  try {
    const bucket = adminStorage.bucket();
    const fileName = `uploads/${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    const firebaseFile = bucket.file(fileName);
    
    // Upload com timeout de 30 segundos
    await withTimeout(
      firebaseFile.save(fileBuffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            uploadedBy: userId,
            uploadedAt: new Date().toISOString(),
          }
        },
      }),
      30000,
      'Timeout ao salvar arquivo no Firebase Storage'
    );
    
    // Tornar público com timeout de 10 segundos
    await withTimeout(
      firebaseFile.makePublic(),
      10000,
      'Timeout ao tornar arquivo público'
    );
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    const duration = Date.now() - startTime;
    
    return publicUrl;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [UPLOAD] Erro no Firebase Storage após ${duration}ms:`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      fileName: file.name,
      fileSize: file.size,
      userId
    });
    throw error;
  }
}

export async function POST(req: NextRequest) {
    const requestStartTime = Date.now();
    try {
        const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!authToken) {
            console.error('[UPLOAD] ❌ Token de autorização não fornecido');
            return new NextResponse('Unauthorized: No token provided', { status: 401 });
        }
        
        // 🔒 SEGURANÇA: Validar token com Firebase Admin SDK
        let userId: string;
        try {
            const decodedToken = await withTimeout(
                adminAuth.verifyIdToken(authToken),
                10000,
                'Timeout ao verificar token'
            );
            userId = decodedToken.uid;
            } catch (error) {
            console.error('❌ [UPLOAD] Token inválido:', error);
            return new NextResponse('Unauthorized: Invalid token', { status: 401 });
        }
        
        const formData = await req.formData();
        
        // Extrair arquivo do FormData
        const fileField = formData.get('fileToUpload') || formData.get('file');
        
        if (!fileField || !(fileField instanceof File)) {
            console.error('[UPLOAD] ❌ Nenhum arquivo encontrado no FormData');
            return new NextResponse('Nenhum arquivo enviado', { status: 400 });
        }
        
        const file = fileField as File;
        
        // Validação de tamanho (200MB máximo)
        if (file.size > 200 * 1024 * 1024) {
            console.error('[UPLOAD] ❌ Arquivo muito grande:', file.size);
            return new NextResponse('Arquivo muito grande. Máximo: 200MB', { status: 400 });
        }
        
        // 🎯 ESTRATÉGIA: Tentar múltiplos serviços com fallback
        let uploadUrl: string | null = null;
        
        // Tentativa 1: Catbox.moe (tenta com FormData original)
        uploadUrl = await uploadToCatbox(formData);
        
        // Tentativa 2: ImgBB (se Catbox falhou)
        if (!uploadUrl) {
            uploadUrl = await uploadToImgBB(file);
        }
        
        // Tentativa 3: Firebase Storage (garantido)
        if (!uploadUrl) {
            uploadUrl = await uploadToFirebase(file, userId);
        }
        
        if (!uploadUrl) {
            throw new Error('Falha em todos os serviços de upload');
        }

        const totalDuration = Date.now() - requestStartTime;
        return new NextResponse(uploadUrl, { 
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
            }
        });

    } catch (error) {
        const totalDuration = Date.now() - requestStartTime;
        console.error(`\n❌ [UPLOAD] ERRO GERAL após ${totalDuration}ms:`, {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined
        });
        
        if (error instanceof Error) {
            return new NextResponse(`Erro ao fazer upload: ${error.message}`, { status: 500 });
        }
        return new NextResponse('Erro ao fazer upload da imagem. Tente novamente.', { status: 500 });
    }
}
