/**
 * 🔍 API PARA VERIFICAR STATUS DE ADMIN
 * Debug endpoint para verificar se custom claims foram aplicados
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { isEmailAdmin } from '@/lib/admin-firestore'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Verificar secret
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.ADMIN_SECRET || process.env.ADMIN_SETUP_SECRET
    
    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Pegar email da query
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    // Buscar usuário no Firebase Auth
    let user
    try {
      user = await adminAuth.getUserByEmail(email)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json({
          error: 'Usuário não encontrado',
          email,
          exists: false
        })
      }
      throw error
    }

    // Verificar custom claims
    const hasCustomClaim = user.customClaims?.admin === true

    // Verificar Firestore
    const isAdminFirestore = await isEmailAdmin(email)

    return NextResponse.json({
      email: user.email,
      uid: user.uid,
      hasCustomClaim,
      isAdminFirestore,
      customClaims: user.customClaims || {},
      needsFix: isAdminFirestore && !hasCustomClaim
    })
    
  } catch (error: any) {
    logger.error('Erro ao verificar status de admin:', error)
    return NextResponse.json({ 
      error: 'Erro interno', 
      details: error.message 
    }, { status: 500 })
  }
}
