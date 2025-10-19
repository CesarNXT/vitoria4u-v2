/**
 * 🧪 ENDPOINT DE TESTE - Verificar admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { isEmailAdmin } from '@/lib/admin-firestore'
import { isServerAdmin } from '@/lib/server-admin-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') || 'italocesar.hd@gmail.com'

    console.log('[TEST] Testando email:', email)

    // Teste 1: Firestore direto
    const firestoreResult = await isEmailAdmin(email)
    console.log('[TEST] isEmailAdmin (Firestore):', firestoreResult)

    // Teste 2: Server util
    const serverResult = await isServerAdmin(email)
    console.log('[TEST] isServerAdmin (Util):', serverResult)

    // Teste 3: Listar admins do Firestore
    const { adminDb } = await import('@/lib/firebase-admin')
    const adminsSnapshot = await adminDb
      .collection('system_admins')
      .where('active', '==', true)
      .get()

    const adminsList = adminsSnapshot.docs.map(doc => ({
      email: doc.data().email,
      uid: doc.data().uid,
      addedAt: doc.data().addedAt
    }))

    console.log('[TEST] Lista de admins:', adminsList)

    return NextResponse.json({
      testEmail: email,
      results: {
        isEmailAdmin: firestoreResult,
        isServerAdmin: serverResult,
        adminsList
      },
      conclusion: firestoreResult && serverResult ? 'APROVADO' : 'REPROVADO'
    })
  } catch (error: any) {
    console.error('[TEST] Erro:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
