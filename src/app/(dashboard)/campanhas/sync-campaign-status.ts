"use server";

import { adminDb } from '@/lib/firebase-admin';

/**
 * Sincronizar status de uma campanha com a UazAPI
 * Busca o progresso real e atualiza no Firestore
 */
export async function syncCampaignStatus(
  businessId: string,
  campaignId: string,
  folderId: string
) {
  try {
    console.log(`🔄 [SYNC] Sincronizando campanha ${folderId}...`);

    // Buscar config WhatsApp
    const businessDoc = await adminDb.collection('negocios').doc(businessId).get();
    const business = businessDoc.data();
    
    if (!business?.tokenInstancia) {
      throw new Error('Token não encontrado');
    }

    const token = business.tokenInstancia;
    const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

    // Buscar mensagens da campanha na UazAPI
    const response = await fetch(`${apiUrl}/sender/listmessages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify({
        folder_id: folderId,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar mensagens da UazAPI');
    }

    const data = await response.json();
    
    console.log(`📊 [SYNC] UazAPI retornou:`, data);

    // Extrair estatísticas
    const messages = data.messages || [];
    
    // Contar mensagens por status real
    // 'scheduled' = agendada/na fila de envio
    // 'sent' = enviada com sucesso
    // 'delivered' = entregue ao destinatário
    // 'failed'/'Failed'/'error' = falha no envio
    const scheduledCount = messages.filter((m: any) => 
      m.status?.toLowerCase() === 'scheduled'
    ).length;
    const sentCount = messages.filter((m: any) => {
      const status = m.status?.toLowerCase() || '';
      return status === 'sent' || status === 'delivered' || status === 'read';
    }).length;
    const failedCount = messages.filter((m: any) => {
      const status = m.status?.toLowerCase() || '';
      return status === 'failed' || status === 'error';
    }).length;
    const totalCount = messages.length;
    
    // Log detalhado de cada mensagem
    console.log(`📊 [SYNC] Detalhamento por mensagem:`);
    messages.forEach((m: any, idx: number) => {
      const phone = m.chatid?.replace('@s.whatsapp.net', '').slice(-4) || '????';
      console.log(`   ${idx + 1}. ${phone} → ${m.status}${m.error ? ' (' + m.error + ')' : ''}`);
    });
    
    console.log(`📊 [SYNC] Total: ${scheduledCount} agendadas, ${sentCount} enviadas, ${failedCount} falhas`);

    // Buscar campanha no Firestore
    const campanhaRef = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('campanhas')
      .doc(campaignId);

    const campanhaDoc = await campanhaRef.get();
    if (!campanhaDoc.exists) {
      throw new Error('Campanha não encontrada no Firestore');
    }

    const contatos = campanhaDoc.data()?.contatos || [];

    // Criar mapa de status por número de telefone
    const statusMap = new Map<string, any>();
    messages.forEach((message: any) => {
      // Extrair número do chatid (formato: 5581995207521@s.whatsapp.net)
      const chatid = message.chatid || '';
      const phoneNumber = chatid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
      
      if (phoneNumber) {
        statusMap.set(phoneNumber, message);
      }
    });
    
    // Atualizar status individual dos contatos baseado no telefone
    for (let i = 0; i < contatos.length; i++) {
      const contato = contatos[i];
      const telefone = String(contato.telefone).replace(/\D/g, '');
      const message = statusMap.get(telefone);
      
      if (!message) continue;
      
      const status = (message.status || '').toLowerCase();

      if (status === 'sent' || status === 'delivered' || status === 'read') {
        contatos[i].status = 'Enviado';
        contatos[i].sent_at = new Date(message.messageTimestamp || Date.now());
      } else if (status === 'failed' || status === 'error') {
        contatos[i].status = 'Erro';
        contatos[i].error = message.error || 'Falha no envio';
      }
      // Se ainda está 'scheduled', mantém como 'Pendente'
    }

    // Determinar status da campanha
    let campaignStatus = 'sending';
    
    // Se todas as mensagens foram processadas (enviadas ou falharam)
    if (sentCount + failedCount >= totalCount && totalCount > 0) {
      campaignStatus = 'done';
    }
    // Se ainda tem mensagens agendadas, mantém como 'sending'
    else if (scheduledCount > 0) {
      campaignStatus = 'sending';
    }

    // Atualizar no Firestore (ambos formatos para compatibilidade)
    const now = new Date();
    await campanhaRef.update({
      // Snake_case (compatibilidade)
      sent_count: sentCount,
      failed_count: failedCount,
      updated_at: now,
      // CamelCase (novo padrão)
      contatosEnviados: sentCount,
      contatosFalhados: failedCount,
      updatedAt: now,
      status: campaignStatus,
      contatos: contatos,
      ...(campaignStatus === 'done' ? { 
        completed_at: now,
        dataConclusao: now 
      } : {}),
    });

    console.log(`✅ [SYNC] Campanha atualizada: ${sentCount}/${totalCount} enviadas`);

    // 🔄 Se ainda tem mensagens agendadas, agendar nova sincronização
    if (scheduledCount > 0 && campaignStatus === 'sending') {
      console.log(`⏰ [SYNC] ${scheduledCount} mensagens ainda agendadas. Reagendando sync em 2min...`);
      
      // Salvar flag de polling ativo no Firestore
      await campanhaRef.update({
        polling_active: true,
        last_poll: new Date(),
      });
      
      // Agendar próxima sincronização (após 2 minutos = 120000ms)
      schedulePollSync(businessId, campaignId, folderId, 120000);
    } else {
      // Remover flag de polling
      await campanhaRef.update({
        polling_active: false,
      });
    }

    return {
      success: true,
      sent_count: sentCount,
      failed_count: failedCount,
      total_count: totalCount,
      scheduled_count: scheduledCount,
      status: campaignStatus,
    };

  } catch (error: any) {
    console.error('❌ [SYNC] Erro ao sincronizar:', error);
    return {
      success: false,
      error: error.message || 'Erro ao sincronizar',
    };
  }
}

/**
 * Agendar sincronização periódica em background
 */
function schedulePollSync(
  businessId: string,
  campaignId: string,
  folderId: string,
  delayMs: number = 10000
) {
  setTimeout(async () => {
    try {
      // Verificar se campanha ainda existe e precisa de sync
      const campanhaRef = adminDb
        .collection('negocios')
        .doc(businessId)
        .collection('campanhas')
        .doc(campaignId);
      
      const campanhaDoc = await campanhaRef.get();
      
      if (!campanhaDoc.exists) {
        console.log(`⏹️ [POLL-SYNC] Campanha ${campaignId} não existe mais`);
        return;
      }
      
      const campanhaData = campanhaDoc.data();
      
      // Se já está concluída, não precisa mais sincronizar
      if (campanhaData?.status === 'done') {
        console.log(`✅ [POLL-SYNC] Campanha ${campaignId} já concluída`);
        return;
      }
      
      // Verificar se não passou do timeout (7 horas = 420min)
      // Calculado para 200 mensagens com intervalo médio de 100s = ~5.5h
      const createdAt = campanhaData?.created_at?.toDate() || new Date();
      const minutesElapsed = (Date.now() - createdAt.getTime()) / 1000 / 60;
      
      if (minutesElapsed > 420) {
        console.log(`⏱️ [POLL-SYNC] Timeout: Campanha ${campaignId} excedeu 7h`);
        await campanhaRef.update({
          polling_active: false,
          status: 'done', // Marcar como concluída por timeout
        });
        return;
      }
      
      console.log(`🔄 [POLL-SYNC] Executando sync periódico para ${campaignId}...`);
      await syncCampaignStatus(businessId, campaignId, folderId);
      
    } catch (error) {
      console.error('❌ [POLL-SYNC] Erro:', error);
    }
  }, delayMs);
}
