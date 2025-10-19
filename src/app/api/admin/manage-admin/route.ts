import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { logger, sanitizeForLog } from '@/lib/logger';
import { isAdmin } from '@/lib/admin-middleware';
import { addAdmin, removeAdmin, listAdmins } from '@/lib/admin-firestore';

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

            // Usar função do admin-firestore (sistema correto)
            const result = await addAdmin({
                email,
                addedBy: decodedToken.uid
            });

            if (!result.success) {
                return NextResponse.json(
                    { error: result.error },
                    { status: 400 }
                );
            }

            // Buscar UID do usuário adicionado
            const user = await adminAuth.getUserByEmail(email);

            logger.success('Admin adicionado', sanitizeForLog({ uid: user.uid, email }));

            return NextResponse.json({
                success: true,
                message: 'Admin adicionado com sucesso!',
                uid: user.uid,
                email,
            });
        }

        if (action === 'remove') {
            if (!uid) {
                return NextResponse.json(
                    { error: 'UID é obrigatório para remover' },
                    { status: 400 }
                );
            }

            // Buscar email do usuário pelo UID
            const user = await adminAuth.getUser(uid);

            // Usar função do admin-firestore (sistema correto)
            const result = await removeAdmin({
                email: user.email!,
                removedBy: decodedToken.uid
            });

            if (!result.success) {
                return NextResponse.json(
                    { error: result.error },
                    { status: 400 }
                );
            }

            logger.success('Admin removido', sanitizeForLog({ uid, email: user.email }));

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
