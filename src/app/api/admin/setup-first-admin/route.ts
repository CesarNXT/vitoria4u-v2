/**
 * 🔐 API PARA CONFIGURAR PRIMEIRO ADMIN (Setup Inicial)
 * 
 * ✅ Usa Firestore (não .env)
 * ✅ Roda APENAS UMA VEZ
 * ✅ Depois use a interface para adicionar mais admins
 * 
 * USO:
 * POST /api/admin/setup-first-admin
 * Headers: { "x-setup-secret": "seu-secret-do-env" }
 * Body: { "email": "seu@email.com" }
 */

import { NextRequest, NextResponse } from 'next/server'
import { setupFirstAdmin } from '@/lib/admin-firestore'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar secret de setup (proteção inicial)
    const setupSecret = request.headers.get('x-setup-secret')
    // Aceita ADMIN_SETUP_SECRET ou ADMIN_SECRET (fallback)
    const expectedSecret = process.env.ADMIN_SETUP_SECRET || process.env.ADMIN_SECRET
    
    if (!expectedSecret || setupSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Acesso negado - secret inválido' },
        { status: 401 }
      )
    }

    // 2. Pegar email do body
    const body = await request.json()
    const email = body.email?.trim()
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // 3. Configurar primeiro admin
    const result = await setupFirstAdmin(email)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Primeiro admin configurado com sucesso!',
      email,
      instructions: [
        '1. Faça LOGOUT do sistema',
        '2. Faça LOGIN novamente',
        '3. Acesse /admin',
        '4. Use a interface para adicionar outros admins'
      ]
    })
    
  } catch (error) {
    logger.error('Erro no setup do primeiro admin:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
