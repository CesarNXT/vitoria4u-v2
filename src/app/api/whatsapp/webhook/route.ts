import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Webhook do WhatsApp para receber todos os eventos
 * 
 * Eventos processados:
 * - connection: Status de conexão (conectado/desconectado)
 * - message: Mensagens recebidas
 * - call: Chamadas (rejeição automática)
 * - callback_button: Confirmação de agendamentos
 * - sender: Status de campanhas
 * - messages_update: Status de entrega/leitura
 * 
 * Configurar em: https://vitoria4u.uazapi.com/webhooks
 * URL: https://seu-dominio.com/api/whatsapp/webhook
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // console.warn('[WEBHOOK] Recebido da UazAPI:', JSON.stringify(body, null, 2));

    // Tipos de eventos que podemos receber:
    // WEBHOOK GLOBAL (formato novo):
    // - sender: Atualizações de campanhas (inicio, conclusão, status)
    // - messages_update: Atualizações de mensagens (entregue, lido, erro)
    //
    // WEBHOOK POR INSTÂNCIA (formato antigo):
    // - message_sent: Mensagem enviada com sucesso
    // - message_failed: Mensagem falhou
    // - message_delivered: Mensagem entregue
    // - message_read: Mensagem lida

    const { event, data } = body;

    // Processar eventos do WEBHOOK GLOBAL
    if (event === 'connection') {
      await processConnectionEvent(data);
    }

    if (event === 'call') {
      await processCallEvent(data);
    }

    if (event === 'sender') {
      await processSenderEvent(data);
    }

    if (event === 'messages_update') {
      await processMessagesUpdateEvent(data);
    }

    // Processar eventos de mensagem em massa (formato antigo)
    if (event === 'message_sent' || event === 'message_failed' || event === 'message_delivered') {
      await processBulkMessageEvent(event, data);
    }

    // Processar eventos de LEMBRETES (formato antigo)
    if (event === 'message_sent' || event === 'message_failed' || event === 'message_delivered' || event === 'message_read') {
      await processReminderEvent(event, data);
    }

    // Processar RESPOSTAS DE BOTÕES (confirmação de presença)
    if (event === 'messages' && data?.type === 'buttonsResponseMessage') {
      await processButtonResponse(data);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error('[WEBHOOK] Erro ao processar:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}

async function processBulkMessageEvent(event: string, data: any) {
  try {
    const { folder_id, message_id, number, status, timestamp } = data;

    if (!folder_id || !message_id) {
      // Evento sem folder_id ou message_id, ignorando
      return;
    }

    // Buscar campanha em massa no Firestore
    const campanhasRef = adminDb.collectionGroup('campanhasMassa');
    const snapshot = await campanhasRef
      .where('folder_id', '==', folder_id)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Campanha não encontrada
      return;
    }

    const campanhaDoc = snapshot.docs[0];
    if (!campanhaDoc) {
      return;
    }
    
    const campanhaData = campanhaDoc.data();
    const campanhaRef = campanhaDoc.ref;

    // Atualizar contador de mensagens
    const updateData: any = {
      lastUpdated: new Date(),
    };

    if (event === 'message_sent' || event === 'message_delivered') {
      // Incrementar contador de enviadas
      updateData.sent_messages = (campanhaData.sent_messages || 0) + 1;
      updateData.pending_messages = Math.max((campanhaData.pending_messages || 0) - 1, 0);
    } else if (event === 'message_failed') {
      // Incrementar contador de falhas
      updateData.failed_messages = (campanhaData.failed_messages || 0) + 1;
      updateData.pending_messages = Math.max((campanhaData.pending_messages || 0) - 1, 0);
    }

    // Atualizar status da campanha
    if (updateData.sent_messages + updateData.failed_messages >= campanhaData.total_messages) {
      updateData.status = 'done';
      updateData.completedAt = new Date();
    }

    await campanhaRef.update(updateData);

    // Salvar log do envio individual
    await campanhaRef.collection('envios').doc(message_id).set({
      number,
      status,
      event,
      timestamp: timestamp || new Date(),
      receivedAt: new Date(),
    }, { merge: true });

    // Campanha atualizada
  } catch (error) {
    console.error('[WEBHOOK] Erro ao processar evento:', error);
  }
}

/**
 * Processa eventos de LEMBRETES (reminder campaigns)
 * Atualiza status de lembretes 24h e 2h nos agendamentos
 */
async function processReminderEvent(event: string, data: any) {
  try {
    const { folder_id, message_id, number, status, timestamp, track_id } = data;

    if (!folder_id) {
      return; // Não é uma campanha agendada
    }

    // console.warn(`[WEBHOOK-REMINDER] Evento ${event} para folder ${folder_id}`);

    // Buscar agendamento que contém este folder_id
    const agendamentosRef = adminDb.collectionGroup('agendamentos');
    const snapshot = await agendamentosRef
      .where('reminderCampaigns', 'array-contains', { 
        folderId: folder_id 
      })
      .limit(10) // Pode ter múltiplos matches
      .get();

    if (snapshot.empty) {
      // Nenhum agendamento encontrado
      return;
    }

    // Processar cada agendamento encontrado
    for (const agendamentoDoc of snapshot.docs) {
      const agendamento = agendamentoDoc.data();
      const campaigns = agendamento.reminderCampaigns || [];
      
      // Encontrar qual tipo de lembrete (24h ou 2h)
      const campaign = campaigns.find((c: any) => c.folderId === folder_id);
      
      if (!campaign) {
        continue;
      }

      const reminderType = campaign.type; // '24h' ou '2h'
      const updateData: any = {};

      // Mapear eventos para campos do agendamento
      switch (event) {
        case 'message_sent':
          updateData[`lembrete${reminderType}Enviado`] = true;
          updateData[`lembrete${reminderType}EnviadoEm`] = new Date(timestamp || Date.now());
          break;

        case 'message_delivered':
          updateData[`lembrete${reminderType}Entregue`] = true;
          updateData[`lembrete${reminderType}EntregueEm`] = new Date(timestamp || Date.now());
          break;

        case 'message_read':
          updateData[`lembrete${reminderType}Lido`] = true;
          updateData[`lembrete${reminderType}LidoEm`] = new Date(timestamp || Date.now());
          break;

        case 'message_failed':
          updateData[`lembrete${reminderType}Erro`] = true;
          updateData[`lembrete${reminderType}ErroMotivo`] = status || 'unknown_error';
          updateData[`lembrete${reminderType}ErroEm`] = new Date(timestamp || Date.now());
          break;
      }

      // Atualizar agendamento
      if (Object.keys(updateData).length > 0) {
        await agendamentoDoc.ref.update(updateData);
        // Agendamento atualizado
      }

      // Se houve erro, notificar o gestor (opcional)
      if (event === 'message_failed') {
        await notifyManagerAboutReminderFailure(agendamento, reminderType, status);
      }
    }
  } catch (error) {
    console.error('[WEBHOOK-REMINDER] Erro ao processar evento de lembrete:', error);
  }
}

/**
 * Notifica gestor sobre falha no envio de lembrete
 */
async function notifyManagerAboutReminderFailure(
  agendamento: any, 
  reminderType: string, 
  errorReason: string
) {
  try {
    // Buscar configurações do negócio para pegar telefone do gestor
    const businessId = agendamento.businessId || agendamento.ref?.parent?.parent?.id;
    
    if (!businessId) {
      return;
    }

    const businessDoc = await adminDb.doc(`negocios/${businessId}`).get();
    const business = businessDoc.data();

    if (!business?.telefone || !business?.tokenInstancia) {
      return;
    }

    // Montar mensagem de alerta
    const errorMessages: Record<string, string> = {
      'phone_number_invalid': 'número de telefone inválido',
      'number_blocked': 'número bloqueou você',
      'message_not_delivered': 'mensagem não foi entregue',
      'unknown_error': 'erro desconhecido'
    };

    const errorMsg = errorMessages[errorReason] || errorReason;

    const alertMessage = `⚠️ *Alerta: Lembrete não enviado*

📅 *Agendamento:* ${agendamento.cliente?.name || 'Cliente'}
⏰ *Lembrete:* ${reminderType} antes
❌ *Motivo:* ${errorMsg}

Por favor, confirme o agendamento manualmente.`;

    // Enviar via WhatsApp do sistema (token fixo de notificações)
    const NOTIFICATION_TOKEN = 'b2e97825-2d28-4646-ae38-3357fcbf0e20';
    const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';
    
    await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': NOTIFICATION_TOKEN
      },
      body: JSON.stringify({
        number: business.telefone.toString().replace(/\D/g, ''),
        text: alertMessage
      })
    });

    // Gestor notificado
  } catch (error) {
    console.error('[WEBHOOK-REMINDER] Erro ao notificar gestor:', error);
  }
}

/**
 * Processa eventos CONNECTION do webhook global
 * Atualiza status da conexão WhatsApp no Firestore
 */
async function processConnectionEvent(data: any) {
  try {
    const { instance, state, qr } = data;

    if (!instance) {
      return;
    }

    // console.warn(`[WEBHOOK-CONNECTION] Instância ${instance} → estado: ${state}`);

    // Mapear estados
    const connectionStates: Record<string, any> = {
      'open': { conectado: true, status: 'conectado', qr: null },
      'connecting': { conectado: false, status: 'conectando', qr: qr || null },
      'close': { conectado: false, status: 'desconectado', qr: null }
    };

    const stateData = connectionStates[state] || { conectado: false, status: state };

    // Buscar negócio que usa esta instância
    const negociosRef = adminDb.collection('negocios');
    const snapshot = await negociosRef
      .where('instanciaWhatsapp', '==', instance)
      .limit(10)
      .get();

    if (snapshot.empty) {
      // Nenhum negócio encontrado
      return;
    }

    // Atualizar todos os negócios que usam esta instância
    const batch = adminDb.batch();
    
    for (const businessDoc of snapshot.docs) {
      batch.update(businessDoc.ref, {
        whatsappConectado: stateData.conectado,
        whatsappStatus: stateData.status,
        whatsappQR: stateData.qr,
        whatsappUltimaAtualizacao: new Date()
      });
    }

    await batch.commit();

    // Negócios atualizados

    // Se desconectou, notificar gestor
    if (state === 'close') {
      for (const businessDoc of snapshot.docs) {
        const business = businessDoc.data();
        if (business.telefone) {
          await notifyManagerAboutDisconnection(business);
        }
      }
    }

  } catch (error) {
    console.error('[WEBHOOK-CONNECTION] Erro ao processar evento connection:', error);
  }
}

/**
 * Notifica gestor sobre desconexão do WhatsApp
 */
async function notifyManagerAboutDisconnection(business: any) {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';
    const NOTIFICATION_TOKEN = 'b2e97825-2d28-4646-ae38-3357fcbf0e20';

    const message = `⚠️ *WhatsApp Desconectado*\n\n` +
      `Seu WhatsApp foi desconectado.\n\n` +
      `Para continuar enviando lembretes e mensagens, ` +
      `reconecte seu WhatsApp nas configurações do sistema.\n\n` +
      `🔧 Configurações → WhatsApp`;

    await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': NOTIFICATION_TOKEN
      },
      body: JSON.stringify({
        number: business.telefone.toString().replace(/\D/g, ''),
        text: message
      })
    });

    // Gestor notificado
  } catch (error) {
    console.error('[WEBHOOK-CONNECTION] Erro ao notificar gestor:', error);
  }
}

/**
 * Processa eventos CALL do webhook global
 * Rejeita chamadas automaticamente se configurado
 */
async function processCallEvent(data: any) {
  try {
    const { from, id, status, isGroup, isVideo } = data;

    if (!from || !id) {
      return;
    }

    // Só processar chamadas recebidas (offer)
    if (status !== 'offer') {
      return;
    }

    // console.warn(`[WEBHOOK-CALL] Chamada recebida de ${from}`);

    // Extrair número limpo
    const phoneNumber = from.replace('@s.whatsapp.net', '').replace(/\D/g, '');

    // Buscar negócios que podem ter esta configuração
    const negociosRef = adminDb.collection('negocios');
    const snapshot = await negociosRef
      .where('rejeitarChamadasAutomaticamente', '==', true)
      .limit(10)
      .get();

    if (snapshot.empty) {
      // Nenhum negócio configurado
      return;
    }

    // Processar cada negócio
    for (const businessDoc of snapshot.docs) {
      const business = businessDoc.data();

      if (!business.tokenInstancia || !business.whatsappConectado) {
        continue;
      }

      // Rejeitar chamada
      const callRejected = await rejectCall(
        business.tokenInstancia,
        phoneNumber,
        id
      );

      if (callRejected) {
        // Chamada rejeitada

        // Enviar mensagem automática
        const mensagem = business.mensagemRejeicaoChamada || 
          `📱 *Olá!*\n\nNo momento não estou disponível para chamadas.\n\nPor favor, envie uma *mensagem de texto* e retornarei assim que possível!\n\nObrigado pela compreensão. 😊`;

        await sendAutoReplyMessage(
          business.tokenInstancia,
          phoneNumber,
          mensagem
        );

        // Registrar no log (opcional)
        await businessDoc.ref.collection('chamadas_rejeitadas').add({
          numero: phoneNumber,
          callId: id,
          isVideo: isVideo || false,
          isGroup: isGroup || false,
          rejeitadaEm: new Date(),
          mensagemEnviada: true
        });
      }
    }

  } catch (error) {
    console.error('[WEBHOOK-CALL] Erro ao processar evento call:', error);
  }
}

/**
 * Rejeita uma chamada do WhatsApp
 */
async function rejectCall(
  tokenInstancia: string,
  phoneNumber: string,
  callId: string
): Promise<boolean> {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

    const response = await fetch(`${API_BASE}/call/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': tokenInstancia
      },
      body: JSON.stringify({
        number: phoneNumber,
        id: callId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WEBHOOK-CALL] Erro ao rejeitar chamada:', response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[WEBHOOK-CALL] Erro ao rejeitar chamada:', error);
    return false;
  }
}

/**
 * Envia mensagem automática após rejeitar chamada
 */
async function sendAutoReplyMessage(
  tokenInstancia: string,
  phoneNumber: string,
  mensagem: string
): Promise<void> {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';

    await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': tokenInstancia
      },
      body: JSON.stringify({
        number: phoneNumber,
        text: mensagem,
        delay: 1000 // Aguarda 1s antes de enviar
      })
    });

    // Mensagem automática enviada
  } catch (error) {
    console.error('[WEBHOOK-CALL] Erro ao enviar mensagem automática:', error);
  }
}

/**
 * Processa eventos SENDER do webhook global
 * Atualiza status das campanhas de lembrete
 */
async function processSenderEvent(data: any) {
  try {
    const { folder_id, status, sent_count, failed_count, total_messages } = data;

    if (!folder_id) {
      return;
    }

    // console.warn(`[WEBHOOK-SENDER] Campanha ${folder_id} → status: ${status}, enviadas: ${sent_count}/${total_messages}`);

    // Buscar agendamentos com esta campanha
    const agendamentosRef = adminDb.collectionGroup('agendamentos');
    const snapshot = await agendamentosRef
      .where('reminderCampaigns', 'array-contains', { 
        folderId: folder_id 
      })
      .limit(10)
      .get();

    if (snapshot.empty) {
      // Nenhum agendamento encontrado
      return;
    }

    // Atualizar status das campanhas
    for (const agendamentoDoc of snapshot.docs) {
      const agendamento = agendamentoDoc.data();
      const campaigns = agendamento.reminderCampaigns || [];
      
      const campaign = campaigns.find((c: any) => c.folderId === folder_id);
      if (!campaign) continue;

      const reminderType = campaign.type;
      const updateData: any = {};

      // Status da campanha
      if (status === 'sending') {
        updateData[`lembrete${reminderType}CampanhaIniciada`] = true;
        updateData[`lembrete${reminderType}CampanhaIniciadaEm`] = new Date();
      }

      if (status === 'completed') {
        updateData[`lembrete${reminderType}CampanhaConcluida`] = true;
        updateData[`lembrete${reminderType}CampanhaConcluidaEm`] = new Date();
      }

      // Atualizar
      if (Object.keys(updateData).length > 0) {
        await agendamentoDoc.ref.update(updateData);
        // Agendamento atualizado
      }
    }
  } catch (error) {
    console.error('[WEBHOOK-SENDER] Erro ao processar evento sender:', error);
  }
}

/**
 * Processa eventos MESSAGES_UPDATE do webhook global
 * Atualiza status de entrega/leitura das mensagens
 */
async function processMessagesUpdateEvent(data: any) {
  try {
    const { id: messageId, ack, from, timestamp } = data;

    if (!messageId || ack === undefined) {
      return;
    }

    // console.warn(`[WEBHOOK-MSG-UPDATE] Mensagem ${messageId} → ack: ${ack}`);

    // ACK codes:
    // 1 = enviado
    // 2 = entregue (✓✓)
    // 3 = lido (✓✓ azul)
    // -1 = erro

    // Buscar agendamentos que podem estar relacionados
    // (usaremos o número do destinatário para filtrar)
    const phoneNumber = from?.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    
    if (!phoneNumber) {
      return;
    }

    // Buscar agendamentos recentes deste cliente
    const agendamentosRef = adminDb.collectionGroup('agendamentos');
    const snapshot = await agendamentosRef
      .where('cliente.phone', '==', phoneNumber)
      .where('status', '==', 'Agendado')
      .orderBy('date', 'desc')
      .limit(5)
      .get();

    if (snapshot.empty) {
      return;
    }

    // Processar cada agendamento
    for (const agendamentoDoc of snapshot.docs) {
      const agendamento = agendamentoDoc.data();
      const updateData: any = {};

      // Tentar identificar se é lembrete 24h ou 2h
      // (verificaremos se tem campanhas ativas)
      const campaigns = agendamento.reminderCampaigns || [];
      
      for (const campaign of campaigns) {
        const reminderType = campaign.type;

        // Atualizar baseado no ACK
        if (ack === 1) {
          // Enviado
          updateData[`lembrete${reminderType}Enviado`] = true;
          updateData[`lembrete${reminderType}EnviadoEm`] = new Date(timestamp * 1000);
        } else if (ack === 2) {
          // Entregue
          updateData[`lembrete${reminderType}Entregue`] = true;
          updateData[`lembrete${reminderType}EntregueEm`] = new Date(timestamp * 1000);
        } else if (ack === 3) {
          // Lido
          updateData[`lembrete${reminderType}Lido`] = true;
          updateData[`lembrete${reminderType}LidoEm`] = new Date(timestamp * 1000);
        } else if (ack === -1) {
          // Erro
          updateData[`lembrete${reminderType}Erro`] = true;
          updateData[`lembrete${reminderType}ErroEm`] = new Date(timestamp * 1000);
        }
      }

      // Atualizar
      if (Object.keys(updateData).length > 0) {
        await agendamentoDoc.ref.update(updateData);
        // Agendamento atualizado
      }
    }
  } catch (error) {
    console.error('[WEBHOOK-MSG-UPDATE] Erro ao processar evento messages_update:', error);
  }
}

/**
 * Processa RESPOSTAS DE BOTÕES de confirmação de presença
 * Atualiza status do agendamento baseado na escolha do cliente
 */
async function processButtonResponse(data: any) {
  try {
    const { from, buttonOrListid, track_id, text } = data;

    if (!buttonOrListid || !from) {
      return;
    }

    // console.warn(`[WEBHOOK-BUTTON] Cliente ${from} clicou: ${buttonOrListid}`);

    // Extrair agendamento ID do track_id (formato: reminder_24h_appt-123)
    if (!track_id || !track_id.startsWith('reminder_')) {
      return;
    }

    const parts = track_id.split('_');
    const agendamentoId = parts.length >= 3 ? parts.slice(2).join('_') : null;

    if (!agendamentoId) {
      console.warn('[WEBHOOK-BUTTON] track_id inválido:', track_id);
      return;
    }

    // Buscar agendamento
    const agendamentosRef = adminDb.collectionGroup('agendamentos');
    const snapshot = await agendamentosRef
      .where('id', '==', agendamentoId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Agendamento não encontrado
      return;
    }

    const agendamentoDoc = snapshot.docs[0];
    if (!agendamentoDoc) {
      return;
    }
    
    const agendamento = agendamentoDoc.data();
    const updateData: any = {};
    let notifyManager = false;
    let managerMessage = '';

    // Processar ação do botão
    switch (buttonOrListid) {
      case 'confirm':
        // Cliente confirmou presença
        updateData.presencaConfirmada = true;
        updateData.presencaConfirmadaEm = new Date();
        updateData.presencaConfirmadaPor = 'cliente';
        updateData.status = 'Confirmado';
        
        // Cliente confirmou presença
        
        // Enviar confirmação ao cliente
        await sendConfirmationMessage(from, agendamento, 'confirmed');
        break;

      case 'reschedule':
        // Cliente quer remarcar
        updateData.solicitouRemarcacao = true;
        updateData.solicitouRemarcacaoEm = new Date();
        
        notifyManager = true;
        managerMessage = `📅 *Solicitação de Remarcação*\n\n` +
          `Cliente: ${agendamento.cliente?.name}\n` +
          `Agendamento: ${agendamento.servico?.name}\n` +
          `Data original: ${formatDate(agendamento.date)}\n\n` +
          `Entre em contato para reagendar.`;
        
        // Cliente solicitou remarcação
        
        // Enviar mensagem ao cliente
        await sendConfirmationMessage(from, agendamento, 'reschedule');
        break;

      case 'cancel':
        // Cliente cancelou
        updateData.status = 'Cancelado';
        updateData.canceledAt = new Date();
        updateData.canceledBy = 'cliente';
        updateData.presencaConfirmada = false;
        
        notifyManager = true;
        managerMessage = `❌ *Cancelamento de Agendamento*\n\n` +
          `Cliente: ${agendamento.cliente?.name}\n` +
          `Serviço: ${agendamento.servico?.name}\n` +
          `Data: ${formatDate(agendamento.date)}\n\n` +
          `Horário agora disponível.`;
        
        // Cliente cancelou
        
        // Enviar confirmação ao cliente
        await sendConfirmationMessage(from, agendamento, 'cancelled');
        break;
    }

    // Atualizar agendamento
    if (Object.keys(updateData).length > 0) {
      await agendamentoDoc.ref.update(updateData);
      // Agendamento atualizado
    }

    // Notificar gestor se necessário
    if (notifyManager) {
      await notifyManagerAboutClientAction(agendamento, managerMessage);
    }

  } catch (error) {
    console.error('[WEBHOOK-BUTTON] Erro ao processar resposta de botão:', error);
  }
}

/**
 * Envia mensagem de confirmação ao cliente após ação
 */
async function sendConfirmationMessage(
  phoneNumber: string,
  agendamento: any,
  action: 'confirmed' | 'reschedule' | 'cancelled'
) {
  try {
    const messages = {
      confirmed: `✅ *Presença Confirmada!*\n\nObrigado por confirmar! Te esperamos no horário agendado.\n\n_Caso precise cancelar ou remarcar, nos avise com antecedência._`,
      reschedule: `📅 *Solicitação Recebida!*\n\nRecebemos sua solicitação de remarcação.\n\nEntraremos em contato em breve para encontrar um novo horário.\n\nObrigado!`,
      cancelled: `❌ *Agendamento Cancelado*\n\nSeu agendamento foi cancelado com sucesso.\n\nQuando precisar, estamos à disposição para agendar novamente!\n\nObrigado.`
    };

    const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';
    const NOTIFICATION_TOKEN = 'b2e97825-2d28-4646-ae38-3357fcbf0e20';

    const cleanPhone = phoneNumber.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    
    await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': NOTIFICATION_TOKEN
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: messages[action]
      })
    });

    // Confirmação enviada ao cliente
  } catch (error) {
    console.error('[WEBHOOK-BUTTON] Erro ao enviar confirmação:', error);
  }
}

/**
 * Notifica gestor sobre ação do cliente (remarcação ou cancelamento)
 */
async function notifyManagerAboutClientAction(
  agendamento: any,
  message: string
) {
  try {
    const businessId = agendamento.businessId || agendamento.ref?.parent?.parent?.id;
    if (!businessId) return;

    const businessDoc = await adminDb.doc(`negocios/${businessId}`).get();
    const business = businessDoc.data();

    if (!business?.telefone) return;

    const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';
    const NOTIFICATION_TOKEN = 'b2e97825-2d28-4646-ae38-3357fcbf0e20';

    await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': NOTIFICATION_TOKEN
      },
      body: JSON.stringify({
        number: business.telefone.toString().replace(/\D/g, ''),
        text: message
      })
    });

    // Gestor notificado
  } catch (error) {
    console.error('[WEBHOOK-BUTTON] Erro ao notificar gestor:', error);
  }
}

/**
 * Formata data para exibição
 */
function formatDate(date: any): string {
  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Data não disponível';
  }
}
