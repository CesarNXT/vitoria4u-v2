/**
 * API para buscar permissões do usuário atual
 * GET /api/user/permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
    const decodedToken = await getAuth().verifyIdToken(token)
    const uid = decodedToken.uid

    // Buscar roles do Firestore
    const userDoc = await adminDb.collection('user_roles').doc(uid).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({
        roles: [],
        permissions: []
      })
    }

    const userData = userDoc.data()
    
    return NextResponse.json({
      roles: userData?.roles || [],
      permissions: userData?.permissions || [],
      active: userData?.active || false
    })
  } catch (error) {
    console.error('Erro ao buscar permissões:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
