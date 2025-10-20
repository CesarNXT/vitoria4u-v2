/**
 * 🔐 API ADMIN - Atualizar Planos
 * Server-side API para editar planos (bypass Firestore rules)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { isAdminEmail } from '@/lib/admin-list'
import { logger } from '@/lib/logger'
import type { Plano } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const sessionCookie = request.cookies.get('session')?.value
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar token
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
    
    // Verificar se é admin (usando lista estática)
    if (!isAdminEmail(decodedToken.email)) {
      return NextResponse.json({ error: 'Acesso negado - apenas administradores' }, { status: 403 })
    }

    const body = await request.json()
    const { planId, updates } = body

    if (!planId || !updates) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Atualizar plano usando Admin SDK (bypass security rules)
    const planRef = adminDb.collection('planos').doc(planId)
    await planRef.update(updates)

    logger.success('Plano atualizado pelo admin', { 
      planId, 
      adminEmail: decodedToken.email,
      updates: Object.keys(updates)
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('Erro ao atualizar plano:', error)
    return NextResponse.json({ 
      error: 'Erro ao atualizar plano',
      details: error.message 
    }, { status: 500 })
  }
}
