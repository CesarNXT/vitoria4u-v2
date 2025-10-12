import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!authToken) {
            return new NextResponse('Unauthorized: No token provided', { status: 401 });
        }
        
        // 🔒 SEGURANÇA: Validar token com Firebase Admin SDK
        try {
            const decodedToken = await adminAuth.verifyIdToken(authToken);
            console.log(`✅ Upload autorizado para usuário: ${decodedToken.uid}`);
        } catch (error) {
            console.error('❌ Token inválido:', error);
            return new NextResponse('Unauthorized: Invalid token', { status: 401 });
        }
        
        const formData = await req.formData();
        
        const catboxResponse = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData,
        });

        const responseText = await catboxResponse.text();

        if (catboxResponse.ok && responseText.startsWith('http')) {
            return new NextResponse(responseText, { status: 200 });
        } else {
            console.error('Catbox API Error:', responseText);
            return new NextResponse(`Erro no serviço de upload: ${responseText}`, { status: catboxResponse.status });
        }

    } catch (error) {
        console.error('Proxy Upload Error:', error);
        if (error instanceof Error) {
            return new NextResponse(error.message, { status: 500 });
        }
        return new NextResponse('Ocorreu um erro interno no servidor.', { status: 500 });
    }
}
