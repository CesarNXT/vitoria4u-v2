/**
 * 🔐 API ADMIN - Configurações do Sistema
 * Server-side API para gerenciar configurações (sem problemas de permissão)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { isUserAdmin } from '@/lib/admin-firestore'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const sessionCookie = request.cookies.get('session')?.value
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar token
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
    
    // Verificar se é admin
    const isAdmin = await isUserAdmin(decodedToken.uid)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar configurações do sistema
    const configRef = adminDb.collection('configuracoes_sistema').doc('global')
    const configSnap = await configRef.get()
    
    let config = configSnap.exists ? configSnap.data() : {
      id: 'global',
      trial: { enabled: true, days: 3, planId: 'plano_premium' }
    }

    // Buscar planos
    const plansSnapshot = await adminDb.collection('planos').get()
    const plans = plansSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((plan: any) => 
        plan.id !== 'plano_gratis' && 
        plan.id !== 'plano_expirado' && 
        plan.price > 0
      )
      .sort((a: any, b: any) => a.price - b.price)

    // Buscar admins
    const adminsSnapshot = await adminDb
      .collection('system_admins')
      .where('active', '==', true)
      .get()
    
    const admins = adminsSnapshot.docs.map(doc => ({
      uid: doc.data().uid,
      email: doc.data().email,
      isAdmin: true
    }))

    return NextResponse.json({
      config,
      plans,
      admins
    })
  } catch (error: any) {
    logger.error('Erro ao buscar configurações admin:', error)
    return NextResponse.json({ 
      error: 'Erro ao buscar configurações',
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const sessionCookie = request.cookies.get('session')?.value
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar token
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
    
    // Verificar se é admin
    const isAdmin = await isUserAdmin(decodedToken.uid)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { config } = body

    // Salvar configurações
    const configRef = adminDb.collection('configuracoes_sistema').doc('global')
    await configRef.set(config, { merge: true })

    logger.success('Configurações atualizadas pelo admin', { uid: decodedToken.uid })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('Erro ao salvar configurações admin:', error)
    return NextResponse.json({ 
      error: 'Erro ao salvar configurações',
      details: error.message 
    }, { status: 500 })
  }
}
