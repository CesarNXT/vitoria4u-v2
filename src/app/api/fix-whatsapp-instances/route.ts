import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Rota temporária para corrigir negócios que têm WhatsApp conectado
 * mas estão sem o campo instanciaWhatsapp
 */
export async function GET() {
  try {
    console.log('🔧 Iniciando correção de instâncias do WhatsApp...');

    // Buscar todos os negócios com WhatsApp conectado
    const negociosSnapshot = await adminDb
      .collection('negocios')
      .where('whatsappConectado', '==', true)
      .get();

    if (negociosSnapshot.empty) {
      return NextResponse.json({
        message: 'Nenhum negócio com WhatsApp conectado encontrado',
        fixed: 0
      });
    }

    let fixed = 0;
    const updates: Promise<any>[] = [];

    negociosSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      
      // Se não tem instanciaWhatsapp, adicionar
      if (!data.instanciaWhatsapp && data.whatsappConectado) {
        console.log(`✅ Corrigindo negócio: ${doc.id}`);
        
        updates.push(
          doc.ref.update({
            instanciaWhatsapp: doc.id // O ID da instância é o próprio businessId
          })
        );
        
        fixed++;
      }
    });

    // Executar todas as atualizações
    await Promise.all(updates);

    console.log(`✅ Correção concluída: ${fixed} negócios corrigidos`);

    return NextResponse.json({
      success: true,
      message: `Correção concluída com sucesso`,
      totalChecked: negociosSnapshot.size,
      fixed
    });

  } catch (error) {
    console.error('❌ Erro ao corrigir instâncias:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }, 
      { status: 500 }
    );
  }
}
