import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { isServerAdmin } from '@/lib/server-admin-utils';

/**
 * 🔒 SEGURANÇA: Validar impersonação de admin
 * 
 * Esta API valida se um usuário autenticado é realmente admin
 * e se tem permissão para visualizar os dados de um negócio.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido.' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }
    
    let decodedToken;
    
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    // Verificar se é admin
    const isAdmin = await isServerAdmin(decodedToken.email);
    if (!isAdmin) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Apenas administradores podem visualizar outros negócios.' 
      }, { status: 403 });
    }

    // Pegar o businessId que está tentando impersonar
    const body = await request.json();
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'businessId é obrigatório.' }, { status: 400 });
    }

    // Verificar se o negócio existe
    const businessDoc = await adminDb.collection('negocios').doc(businessId).get();
    if (!businessDoc.exists) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Negócio não encontrado.' 
      }, { status: 404 });
    }

    // Tudo ok, admin pode visualizar este negócio
    return NextResponse.json({ 
      valid: true, 
      adminUid: decodedToken.uid,
      adminEmail: decodedToken.email,
      businessId,
    });

  } catch (error) {
    console.error('Erro ao validar impersonação:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
