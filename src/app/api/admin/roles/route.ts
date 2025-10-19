/**
 * API para gerenciar roles de usuários
 * POST /api/admin/roles
 */

import { NextRequest, NextResponse } from 'next/server'
import { assignRole, removeRole, listAdminUsers, deactivateUser } from '@/lib/rbac'
import { getAuth } from 'firebase-admin/auth'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
    const decodedToken = await getAuth().verifyIdToken(token)
    const currentUserUid = decodedToken.uid

    const body = await request.json()
    const { action, targetUid, role } = body

    switch (action) {
      case 'assign':
        const assignResult = await assignRole(targetUid, role, currentUserUid)
        return NextResponse.json(assignResult)

      case 'remove':
        const removeResult = await removeRole(targetUid, role, currentUserUid)
        return NextResponse.json(removeResult)

      case 'deactivate':
        const deactivateResult = await deactivateUser(targetUid, currentUserUid)
        return NextResponse.json(deactivateResult)

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Erro na API de roles:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const users = await listAdminUsers()
    return NextResponse.json({ users })
  } catch (error) {
    logger.error('Erro ao listar usuários:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
