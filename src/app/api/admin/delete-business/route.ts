import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

/**
 * DELETE - Excluir negócio completamente
 * Remove TUDO: subcoleções, documento, autenticação
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId, adminUid } = await request.json();

    if (!businessId || !adminUid) {
      return NextResponse.json(
        { error: 'ID do negócio e admin são obrigatórios' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Iniciando exclusão total do negócio: ${businessId}`);

    // 1. Deletar todas as subcoleções
    const subCollections = [
      'agendamentos',
      'clientes',
      'servicos',
      'profissionais',
      'campanhas',
      'mensagens'
    ];

    for (const collectionName of subCollections) {
      const snapshot = await adminDb
        .collection('negocios')
        .doc(businessId)
        .collection(collectionName)
        .get();

      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      if (snapshot.docs.length > 0) {
        await batch.commit();
        console.log(`✅ ${snapshot.docs.length} documentos deletados de ${collectionName}`);
      }
    }

    // 2. Deletar documento principal do negócio
    await adminDb.collection('negocios').doc(businessId).delete();
    console.log('✅ Documento do negócio deletado');

    // 3. Deletar usuário da autenticação
    try {
      await adminAuth.deleteUser(businessId);
      console.log('✅ Usuário deletado do Firebase Auth');
    } catch (authError: any) {
      // Se o usuário não existir mais, tudo bem
      if (authError.code !== 'auth/user-not-found') {
        console.error('⚠️ Erro ao deletar usuário:', authError);
      }
    }

    console.log(`✅ Negócio ${businessId} completamente deletado`);

    return NextResponse.json({ 
      success: true, 
      message: 'Negócio deletado completamente'
    });
  } catch (error) {
    console.error('❌ Erro ao deletar negócio:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar negócio' },
      { status: 500 }
    );
  }
}
