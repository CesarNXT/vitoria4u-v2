/**
 * 🔐 API PARA CONFIGURAR ADMINS INICIAIS
 * 
 * ✅ Roda APENAS no servidor
 * ✅ Protegida por secret
 * ✅ Define custom claims no Firebase Auth
 * 
 * USO (uma única vez para configurar):
 * POST /api/admin/setup-admins
 * Headers: { "x-setup-secret": "seu-secret-do-env" }
 * Body: { "emails": ["admin1@email.com", "admin2@email.com"] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar secret de setup
    const setupSecret = request.headers.get('x-setup-secret')
    const expectedSecret = process.env.ADMIN_SETUP_SECRET
    
    if (!expectedSecret || setupSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Acesso negado - secret inválido' },
        { status: 401 }
      )
    }

    // 2. Pegar lista de emails do body
    const body = await request.json()
    const emails: string[] = body.emails || []
    
    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Lista de emails inválida' },
        { status: 400 }
      )
    }

    // 3. Para cada email, encontrar usuário e definir custom claim
    const results = []
    
    for (const email of emails) {
      try {
        // Buscar usuário por email
        const user = await adminAuth.getUserByEmail(email.trim().toLowerCase())
        
        // Definir custom claim admin=true
        await adminAuth.setCustomUserClaims(user.uid, { admin: true })
        
        logger.info(`✅ Admin configurado: ${email}`, { uid: user.uid })
        
        results.push({
          email,
          uid: user.uid,
          success: true
        })
      } catch (error: any) {
        logger.error(`❌ Erro ao configurar admin ${email}:`, error)
        
        results.push({
          email,
          success: false,
          error: error.code === 'auth/user-not-found' 
            ? 'Usuário não encontrado - precisa criar conta primeiro'
            : error.message
        })
      }
    }

    return NextResponse.json({
      message: 'Setup de admins processado',
      results
    })
    
  } catch (error) {
    logger.error('Erro no setup de admins:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
