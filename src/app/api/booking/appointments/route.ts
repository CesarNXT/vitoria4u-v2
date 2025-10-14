import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET /api/booking/appointments
 * 
 * Retorna agendamentos atualizados para evitar conflitos em tempo real.
 * Usado para atualizar a lista de horários disponíveis na página pública.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('businessId');
        const professionalId = searchParams.get('professionalId');
        const dateParam = searchParams.get('date');

        if (!businessId || !professionalId || !dateParam) {
            return NextResponse.json(
                { error: 'Parâmetros obrigatórios: businessId, professionalId, date' },
                { status: 400 }
            );
        }

        const selectedDate = new Date(dateParam);
        
        // Buscar agendamentos do profissional para a data específica
        const appointmentsRef = adminDb
            .collection('negocios')
            .doc(businessId)
            .collection('agendamentos');
        
        const snapshot = await appointmentsRef
            .where('profissional.id', '==', professionalId)
            .where('status', '==', 'Agendado')
            .get();
        
        // Filtrar apenas agendamentos da data selecionada
        const appointments = snapshot.docs
            .map(doc => {
                const data = doc.data();
                let apptDate: Date;
                
                // Converter Firestore Timestamp para Date
                if (data.date && typeof data.date.toDate === 'function') {
                    apptDate = data.date.toDate();
                } else if (data.date instanceof Date) {
                    apptDate = data.date;
                } else {
                    apptDate = new Date(data.date);
                }
                
                return {
                    id: doc.id,
                    ...data,
                    date: apptDate.toISOString(),
                };
            })
            .filter(appt => {
                const apptDate = new Date(appt.date);
                return apptDate.toDateString() === selectedDate.toDateString();
            });

        return NextResponse.json({ 
            success: true,
            appointments,
            count: appointments.length
        });

    } catch (error: any) {
        console.error('Erro ao buscar agendamentos:', error);
        return NextResponse.json(
            { error: 'Erro ao processar solicitação', details: error.message },
            { status: 500 }
        );
    }
}
