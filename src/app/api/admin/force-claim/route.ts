/**
 * 🔧 API PARA FORÇAR CUSTOM CLAIM
 * Força aplicação do custom claim admin=true
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { isEmailAdmin } from '@/lib/admin-firestore'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Verificar secret
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.ADMIN_SECRET || process.env.ADMIN_SETUP_SECRET
    
    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const email = body.email?.trim()
    
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    // Verificar se está na lista de admins do Firestore
    const isAdmin = await isEmailAdmin(email)
    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'Email não está na lista de admins do Firestore',
        suggestion: 'Execute setup-admin-simple.ps1 primeiro'
      }, { status: 400 })
    }

    // Buscar usuário
    let user
    try {
      user = await adminAuth.getUserByEmail(email)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json({
          error: 'Usuário não encontrado no Firebase Auth',
          suggestion: 'Usuário precisa criar conta primeiro'
        }, { status: 404 })
      }
      throw error
    }

    // Forçar aplicação do custom claim
    await adminAuth.setCustomUserClaims(user.uid, { admin: true })
    
    // Verificar se aplicou
    const updatedUser = await adminAuth.getUser(user.uid)
    const hasClaimNow = updatedUser.customClaims?.admin === true

    logger.info(`✅ Custom claim forçado para: ${email}`, { 
      uid: user.uid,
      applied: hasClaimNow
    })

    return NextResponse.json({
      success: true,
      email: user.email,
      uid: user.uid,
      customClaimApplied: hasClaimNow,
      message: 'Custom claim aplicado! Faça logout e login novamente.',
      instructions: [
        '1. Limpe o cache novamente (force-logout.html)',
        '2. Faça LOGIN com este email',
        '3. Acesse /admin'
      ]
    })
    
  } catch (error: any) {
    logger.error('Erro ao forçar custom claim:', error)
    return NextResponse.json({ 
      error: 'Erro interno', 
      details: error.message 
    }, { status: 500 })
  }
}
