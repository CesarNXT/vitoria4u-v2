import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * API para limpar features inválidas dos planos
 * Remove 'atendimento_manual_ou_automatizado' que não existe mais
 */
export async function GET(request: Request) {
  try {
    const authToken = (request.headers.get('authorization') || '').split('Bearer ')[1];
    
    if (authToken !== process.env.CRON_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('🔧 Limpando features inválidas dos planos...');

    const planosSnapshot = await adminDb.collection('planos').get();
    
    let planosAtualizados = 0;

    for (const planoDoc of planosSnapshot.docs) {
      const plano = planoDoc.data();
      const features = plano.features || [];
      
      // Remover feature antiga
      const featuresCleaned = features.filter((f: string) => 
        f !== 'atendimento_manual_ou_automatizado'
      );

      // Se tinha a feature antiga, atualizar
      if (features.length !== featuresCleaned.length) {
        await planoDoc.ref.update({
          features: featuresCleaned
        });
        
        console.log(`✅ Plano ${plano.name} atualizado - removida feature inválida`);
        planosAtualizados++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${planosAtualizados} planos atualizados`,
      planosAtualizados
    });

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
