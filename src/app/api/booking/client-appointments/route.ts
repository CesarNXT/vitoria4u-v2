import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET /api/booking/client-appointments
 * Busca agendamentos ativos de um cliente específico
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const phone = searchParams.get('phone');

    if (!businessId || !phone) {
      return NextResponse.json(
        { error: 'businessId e phone são obrigatórios' },
        { status: 400 }
      );
    }

    const phoneAsNumber = parseInt(phone, 10);
    if (isNaN(phoneAsNumber)) {
      return NextResponse.json(
        { error: 'Telefone inválido' },
        { status: 400 }
      );
    }

    // Buscar agendamentos do cliente (sem índice composto)
    const appointmentsSnapshot = await adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('agendamentos')
      .where('cliente.phone', '==', phoneAsNumber)
      .get();
    
    // Filtrar apenas agendados e ordenar por data no código
    const activeAppointments = appointmentsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((apt: any) => apt.status === 'Agendado')
      .sort((a: any, b: any) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });

    // Verificar se há agendamentos ativos
    if (activeAppointments.length === 0) {
      return NextResponse.json({
        hasActiveAppointment: false,
        appointment: null
      });
    }

    // Pegar o primeiro (mais próximo)
    const appointmentData: any = activeAppointments[0];
    
    if (!appointmentData) {
      return NextResponse.json({
        hasActiveAppointment: false,
        appointment: null
      });
    }

    // Converter Timestamp para formato serializável
    const appointment = {
      ...appointmentData,
      date: appointmentData.date?.toDate ? appointmentData.date.toDate().toISOString() : appointmentData.date,
      createdAt: appointmentData.createdAt?.toDate ? appointmentData.createdAt.toDate().toISOString() : appointmentData.createdAt,
      updatedAt: appointmentData.updatedAt?.toDate ? appointmentData.updatedAt.toDate().toISOString() : appointmentData.updatedAt,
    };

    return NextResponse.json({
      hasActiveAppointment: true,
      appointment
    });

  } catch (error: any) {
    console.error('Erro ao buscar agendamentos do cliente:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar agendamentos' },
      { status: 500 }
    );
  }
}
