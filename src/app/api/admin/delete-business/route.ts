import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { logger } from '@/lib/logger';
import { isServerAdmin } from '@/lib/server-admin-utils';


/**
 * DELETE - Excluir negócio completamente
 * Remove TUDO: subcoleções, documento, autenticação
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, adminUid } = body;

    // Segurança: Verificar se quem está requisitando é admin
    const user = await adminAuth.getUser(adminUid);
    const isAdmin = await isServerAdmin(user.email);

    if (!isAdmin) {
      logger.warn('Tentativa não autorizada de exclusão', { adminUid, businessId });
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (!businessId || !adminUid) {
      return NextResponse.json(
        { error: 'ID do negócio e admin são obrigatórios' },
        { status: 400 }
      );
    }

    logger.info(`🗑️ Iniciando exclusão total do negócio: ${businessId}`);

    // 1. Deletar todas as subcoleções
    const subCollections = [
      'agendamentos',
      'clientes',
      'servicos',
      'profissionais',
      'campanhas',
      'mensagens',
      'datasBloqueadas'
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
        logger.debug(`✅ ${snapshot.docs.length} documentos deletados de ${collectionName}`);
      }
    }

    // 2. Deletar documento principal do negócio
    await adminDb.collection('negocios').doc(businessId).delete();
    logger.debug('✅ Documento do negócio deletado');

    // 3. Deletar usuário da autenticação
    try {
      await adminAuth.deleteUser(businessId);
      logger.debug('✅ Usuário deletado do Firebase Auth');
    } catch (authError: any) {
      // Se o usuário não existir mais, tudo bem
      if (authError.code !== 'auth/user-not-found') {
        logger.error('⚠️ Erro ao deletar usuário:', authError);
      }
    }

    logger.success(`✅ Negócio ${businessId} completamente deletado por ${user.email}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Negócio deletado completamente'
    });
  } catch (error) {
    logger.error('❌ Erro ao deletar negócio:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar negócio' },
      { status: 500 }
    );
  }
}
