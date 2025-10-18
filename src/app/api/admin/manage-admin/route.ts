import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { logger, sanitizeForLog } from '@/lib/logger';
import { isAdmin } from '@/lib/admin-middleware';

/**
 * POST /api/admin/manage-admin
 * 
 * Adiciona ou remove administradores do sistema.
 * Requer que o usuário logado seja admin.
 */
export async function POST(request: NextRequest) {
    try {
        // Validar autenticação via session cookie
        const sessionCookie = request.cookies.get('session')?.value;
        
        if (!sessionCookie) {
            return NextResponse.json(
                { error: 'Não autenticado' },
                { status: 401 }
            );
        }

        // Validar token e verificar se é admin
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        } catch (error) {
            return NextResponse.json(
                { error: 'Sessão inválida ou expirada' },
                { status: 401 }
            );
        }

        // Verificar se o usuário autenticado é admin
        const userIsAdmin = await isAdmin(decodedToken.uid);
        if (!userIsAdmin) {
            logger.warn('Tentativa de acesso não autorizado à API admin', { uid: decodedToken.uid });
            return NextResponse.json(
                { error: 'Acesso negado. Apenas administradores podem realizar esta ação.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { email, uid, action } = body;

        if (!action || (action !== 'add' && action !== 'remove')) {
            return NextResponse.json(
                { error: 'Action deve ser "add" ou "remove"' },
                { status: 400 }
            );
        }

        if (action === 'add') {
            if (!email) {
                return NextResponse.json(
                    { error: 'Email é obrigatório' },
                    { status: 400 }
                );
            }

            // Buscar usuário pelo email
            let user;
            try {
                user = await adminAuth.getUserByEmail(email);
            } catch (error) {
                return NextResponse.json(
                    { error: 'Usuário não encontrado. O usuário deve ter feito login pelo menos uma vez.' },
                    { status: 404 }
                );
            }

            // Verificar se já é admin
            const adminRef = adminDb.collection('admin').doc(user.uid);
            const adminDoc = await adminRef.get();

            if (adminDoc.exists && adminDoc.data()?.isAdmin) {
                return NextResponse.json(
                    { error: 'Este usuário já é administrador' },
                    { status: 400 }
                );
            }

            // Criar documento admin
            await adminRef.set({
                email: user.email,
                isAdmin: true,
                createdAt: new Date(),
            });

            logger.success('Admin adicionado', sanitizeForLog({ uid: user.uid, email: user.email }));

            return NextResponse.json({
                success: true,
                message: 'Admin adicionado com sucesso!',
                uid: user.uid,
                email: user.email,
            });
        }

        if (action === 'remove') {
            if (!uid) {
                return NextResponse.json(
                    { error: 'UID é obrigatório para remover' },
                    { status: 400 }
                );
            }

            // Verificar se não é o último admin
            const adminsSnapshot = await adminDb.collection('admin').where('isAdmin', '==', true).get();
            if (adminsSnapshot.size <= 1) {
                return NextResponse.json(
                    { error: 'Não é possível remover o último administrador' },
                    { status: 400 }
                );
            }

            // Remover documento admin
            await adminDb.collection('admin').doc(uid).delete();

            logger.success('Admin removido', sanitizeForLog({ uid }));

            return NextResponse.json({
                success: true,
                message: 'Admin removido com sucesso!',
            });
        }

    } catch (error: any) {
        logger.error('Erro ao gerenciar admin', sanitizeForLog(error));
        return NextResponse.json(
            { error: 'Erro ao processar solicitação', details: error.message },
            { status: 500 }
        );
    }
}
