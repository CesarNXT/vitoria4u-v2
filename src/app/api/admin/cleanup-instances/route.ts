import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { WhatsAppAPI } from '@/lib/whatsapp-api-simple';

/**
 * 🧹 LIMPAR INSTÂNCIAS ABANDONADAS
 * 
 * Remove instâncias que estão "connecting" há muito tempo
 * ou "disconnected" e não foram deletadas
 * 
 * Economiza recursos na UazAPI
 * 
 * GET /api/admin/cleanup-instances
 */

export async function GET(req: NextRequest) {
  try {
    const deletedInstances: string[] = [];
    const errors: Array<{ businessId: string; error: string }> = [];
    
    // Buscar negócios com WhatsApp NÃO conectado mas com token
    const snapshot = await adminDb.collection('negocios')
      .where('whatsappConectado', '==', false)
      .where('tokenInstancia', '!=', '')
      .get();
    
    console.log(`[CLEANUP] Encontradas ${snapshot.size} instâncias para verificar`);
    
    for (const doc of snapshot.docs) {
      const businessId = doc.id;
      const data = doc.data();
      const token = data.tokenInstancia;
      const status = data.whatsappStatus;
      const lastUpdate = data.whatsappUltimaAtualizacao?.toDate();
      
      // Calcular tempo desde última atualização
      const minutesSinceUpdate = lastUpdate 
        ? (Date.now() - lastUpdate.getTime()) / 1000 / 60 
        : 999;
      
      // Deletar se:
      // 1. Status "connecting" há mais de 10 minutos
      // 2. Status "desconectado" (já deveria ter sido deletado)
      // 3. Status "timeout" ou "erro"
      const shouldDelete = (
        (status === 'connecting' && minutesSinceUpdate > 10) ||
        (status === 'desconectado') ||
        (status === 'timeout') ||
        (status === 'erro') ||
        (status === 'criando' && minutesSinceUpdate > 10)
      );
      
      if (shouldDelete && token) {
        try {
          console.log(`[CLEANUP] 🗑️ Deletando instância: ${businessId} (status: ${status}, ${Math.round(minutesSinceUpdate)}min atrás)`);
          
          const api = new WhatsAppAPI(businessId, token);
          await api.deleteInstance();
          
          // Limpar dados no Firestore
          await doc.ref.update({
            tokenInstancia: '',
            whatsappQR: null,
            whatsappStatus: 'limpo',
            whatsappLimpezaEm: new Date()
          });
          
          deletedInstances.push(businessId);
          console.log(`[CLEANUP] ✅ Instância ${businessId} deletada`);
          
        } catch (error: any) {
          console.error(`[CLEANUP] ❌ Erro ao deletar ${businessId}:`, error.message);
          errors.push({
            businessId,
            error: error.message
          });
          
          // Mesmo com erro, limpar dados locais
          await doc.ref.update({
            tokenInstancia: '',
            whatsappQR: null,
            whatsappStatus: 'erro_limpeza'
          });
        }
      }
    }
    
    const result = {
      success: true,
      checked: snapshot.size,
      deleted: deletedInstances.length,
      deletedInstances,
      errors: errors.length,
      errorDetails: errors
    };
    
    console.log(`[CLEANUP] 🧹 Limpeza concluída:`, result);
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('[CLEANUP] Erro geral:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Deletar uma instância específica
 * 
 * POST /api/admin/cleanup-instances?businessId=xxx
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId é obrigatório' },
        { status: 400 }
      );
    }
    
    const doc = await adminDb.collection('negocios').doc(businessId).get();
    
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Negócio não encontrado' },
        { status: 404 }
      );
    }
    
    const data = doc.data();
    const token = data?.tokenInstancia;
    
    if (!token) {
      return NextResponse.json({
        success: true,
        message: 'Negócio não tem instância ativa'
      });
    }
    
    // Deletar instância
    const api = new WhatsAppAPI(businessId, token);
    await api.deleteInstance();
    
    // Limpar dados
    await doc.ref.update({
      tokenInstancia: '',
      whatsappConectado: false,
      whatsappStatus: 'deletado_manual',
      whatsappQR: null,
      whatsappLimpezaEm: new Date()
    });
    
    return NextResponse.json({
      success: true,
      message: `Instância ${businessId} deletada com sucesso`
    });
    
  } catch (error: any) {
    console.error('[CLEANUP] Erro ao deletar instância específica:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
