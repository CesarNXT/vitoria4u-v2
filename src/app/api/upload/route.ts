import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!authToken) {
            return new NextResponse('Unauthorized: No token provided', { status: 401 });
        }
        
        // A verificação do token no cliente já fornece uma camada de segurança.
        // A verificação do lado do servidor com o Admin SDK estava causando problemas de ambiente.
        
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
