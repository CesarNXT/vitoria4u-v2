/**
 * 🔒 API Route: Revogar Todas as Sessões
 * Força logout global de todos os usuários do sistema
 * ATENÇÃO: Use com cuidado! Isso desconecta TODOS os usuários.
 */

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { adminPassword } = await request.json();
    
    // 🔐 Segurança: Requer senha especial
    const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'vitoria4u-super-admin-2025';
    
    if (adminPassword !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Senha administrativa incorreta' },
        { status: 403 }
      );
    }

    console.log('🔥 [REVOKE ALL] Iniciando revogação global de sessões...');
    
    let revokedCount = 0;
    let errorCount = 0;
    
    // 1️⃣ Listar todos os usuários
    const listUsersResult = await adminAuth.listUsers(1000);
    
    console.log(`📊 [REVOKE ALL] Encontrados ${listUsersResult.users.length} usuários`);
    
    // 2️⃣ Revogar tokens de cada usuário
    for (const user of listUsersResult.users) {
      try {
        // Revogar refresh tokens do usuário
        await adminAuth.revokeRefreshTokens(user.uid);
        revokedCount++;
        
        if (revokedCount % 10 === 0) {
          console.log(`⏳ [REVOKE ALL] Progresso: ${revokedCount}/${listUsersResult.users.length}`);
        }
      } catch (error) {
        console.error(`❌ [REVOKE ALL] Erro ao revogar tokens do usuário ${user.uid}:`, error);
        errorCount++;
      }
    }
    
    // 3️⃣ Atualizar versão de sessão no banco
    try {
      await adminDb.collection('system').doc('session-version').set({
        version: Date.now(),
        updatedAt: new Date(),
        revokedCount,
        reason: 'Global session revocation'
      });
    } catch (error) {
      console.error('❌ [REVOKE ALL] Erro ao atualizar versão de sessão:', error);
    }

    console.log(`✅ [REVOKE ALL] Concluído! ${revokedCount} sessões revogadas, ${errorCount} erros`);

    return NextResponse.json({
      success: true,
      message: `${revokedCount} sessões foram revogadas com sucesso`,
      revokedCount,
      errorCount,
      totalUsers: listUsersResult.users.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔥 [REVOKE ALL] ERRO CRÍTICO:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao revogar sessões',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
