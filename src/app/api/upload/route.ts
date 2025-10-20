import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminStorage } from '@/lib/firebase-admin';

/**
 * Upload com múltiplos provedores e fallback automático
 * Ordem de tentativa:
 * 1. Catbox.moe (rápido e gratuito)
 * 2. ImgBB (fallback 1)
 * 3. Firebase Storage (fallback 2 - sempre funciona)
 */

// Tentar upload no Catbox.moe
async function uploadToCatbox(formData: FormData): Promise<string | null> {
  try {
    console.log('📤 [UPLOAD] Tentando Catbox.moe...');
    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    });

    const responseText = await response.text();

    if (response.ok && responseText.startsWith('http')) {
      console.log('✅ [UPLOAD] Sucesso no Catbox.moe');
      return responseText;
    }
    
    console.warn('⚠️ [UPLOAD] Catbox falhou:', responseText);
    return null;
  } catch (error) {
    console.error('❌ [UPLOAD] Erro no Catbox:', error);
    return null;
  }
}

// Tentar upload no ImgBB (requer API key)
async function uploadToImgBB(file: File): Promise<string | null> {
  try {
    const apiKey = process.env.IMGBB_API_KEY;
    
    if (!apiKey) {
      console.log('⏭️ [UPLOAD] ImgBB desabilitado (sem API key)');
      return null;
    }

    console.log('📤 [UPLOAD] Tentando ImgBB...');
    
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.success && data.data?.url) {
      console.log('✅ [UPLOAD] Sucesso no ImgBB');
      return data.data.url;
    }
    
    console.warn('⚠️ [UPLOAD] ImgBB falhou:', data);
    return null;
  } catch (error) {
    console.error('❌ [UPLOAD] Erro no ImgBB:', error);
    return null;
  }
}

// Upload no Firebase Storage (sempre funciona)
async function uploadToFirebase(file: File, userId: string): Promise<string> {
  console.log('📤 [UPLOAD] Usando Firebase Storage...');
  
  const bucket = adminStorage.bucket();
  const fileName = `uploads/${userId}/${Date.now()}-${file.name}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  
  const firebaseFile = bucket.file(fileName);
  
  await firebaseFile.save(fileBuffer, {
    metadata: {
      contentType: file.type,
    },
  });
  
  await firebaseFile.makePublic();
  
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  console.log('✅ [UPLOAD] Sucesso no Firebase Storage');
  
  return publicUrl;
}

export async function POST(req: NextRequest) {
    try {
        const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!authToken) {
            return new NextResponse('Unauthorized: No token provided', { status: 401 });
        }
        
        // 🔒 SEGURANÇA: Validar token com Firebase Admin SDK
        let userId: string;
        try {
            const decodedToken = await adminAuth.verifyIdToken(authToken);
            userId = decodedToken.uid;
            console.log(`✅ Upload autorizado para usuário: ${userId}`);
        } catch (error) {
            console.error('❌ Token inválido:', error);
            return new NextResponse('Unauthorized: Invalid token', { status: 401 });
        }
        
        const formData = await req.formData();
        
        // Extrair arquivo do FormData
        const fileField = formData.get('fileToUpload') || formData.get('file');
        
        if (!fileField || !(fileField instanceof File)) {
            return new NextResponse('Nenhum arquivo enviado', { status: 400 });
        }
        
        const file = fileField as File;
        
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

        return new NextResponse(uploadUrl, { status: 200 });

    } catch (error) {
        console.error('❌ [UPLOAD] Erro geral:', error);
        if (error instanceof Error) {
            return new NextResponse(`Erro ao fazer upload: ${error.message}`, { status: 500 });
        }
        return new NextResponse('Erro ao fazer upload da imagem. Tente novamente.', { status: 500 });
    }
}
