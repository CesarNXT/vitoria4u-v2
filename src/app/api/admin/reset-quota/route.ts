import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { format } from 'date-fns';

/**
 * POST /api/admin/reset-quota
 * Reseta a quota diária de um negócio para uma data específica
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie.value);
    const userId = decodedClaims.uid;

    // Buscar businessId do usuário
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.businessId) {
      return NextResponse.json(
        { error: 'Usuário não vinculado a um negócio' },
        { status: 400 }
      );
    }

    const businessId = userData.businessId;

    // Pegar data do body (ou usar hoje)
    const { date } = await req.json().catch(() => ({}));
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    // Deletar documento de quota do dia
    const docRef = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('daily_stats')
      .doc(dateStr);

    await docRef.delete();

    console.log(`✅ Quota resetada para ${dateStr} (businessId: ${businessId})`);

    return NextResponse.json({
      success: true,
      message: `Quota do dia ${targetDate.toLocaleDateString('pt-BR')} foi resetada com sucesso.`,
      date: dateStr
    });

  } catch (error: any) {
    console.error('Erro ao resetar quota:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao resetar quota' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/reset-quota
 * Verifica a quota atual
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie.value);
    const userId = decodedClaims.uid;

    // Buscar businessId do usuário
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.businessId) {
      return NextResponse.json(
        { error: 'Usuário não vinculado a um negócio' },
        { status: 400 }
      );
    }

    const businessId = userData.businessId;
    const dateStr = format(new Date(), 'yyyy-MM-dd');

    // Buscar quota atual
    const docRef = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('daily_stats')
      .doc(dateStr);

    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({
        exists: false,
        date: dateStr,
        sent_count: 0,
        campaign_ids: []
      });
    }

    const data = doc.data()!;

    return NextResponse.json({
      exists: true,
      date: dateStr,
      sent_count: data.sent_count || 0,
      campaign_ids: data.campaign_ids || [],
      last_updated: data.last_updated?.toDate?.()?.toISOString() || null
    });

  } catch (error: any) {
    console.error('Erro ao verificar quota:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar quota' },
      { status: 500 }
    );
  }
}
