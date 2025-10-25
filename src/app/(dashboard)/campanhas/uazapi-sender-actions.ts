"use server";

import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Cliente, CampanhaTipo } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';
import { 
  getAvailableQuota,
  splitContactsByDays,
  saveCampaign,
  updateCampaignStatus,
  incrementDailyStats,
  addCampaignToClientHistory,
  getClientsWithCampaignHistory,
  type CampaignContact 
} from '@/lib/campaign-tracking';

// 🔒 Validar sessão e retornar userId
async function validateSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  
  if (!sessionCookie) {
    throw new Error('Não autenticado');
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedClaims.uid;
  } catch (error) {
    throw new Error('Sessão inválida');
  }
}

// 🔒 Buscar businessId do usuário
async function getBusinessId(userId: string): Promise<string> {
  const businessDoc = await adminDb
    .collection('negocios')
    .doc(userId)
    .get();

  if (!businessDoc.exists) {
    throw new Error('Negócio não encontrado');
  }

  return userId;
}

// 🔒 Buscar configurações do WhatsApp
async function getWhatsAppConfig(businessId: string) {
  const businessDoc = await adminDb.collection('negocios').doc(businessId).get();
  const businessData = businessDoc.data();

  if (!businessData?.whatsappConectado) {
    throw new Error('WhatsApp não conectado. Conecte seu WhatsApp em Configurações.');
  }

  if (!businessData.tokenInstancia) {
    throw new Error('Token da instância não encontrado. Reconecte seu WhatsApp.');
  }

  return {
    token: businessData.tokenInstancia,
    instancia: businessData.instanciaWhatsapp || businessId,
  };
}

/**
 * Buscar todos os clientes do negócio com filtros opcionais
 */
export async function getClientesAction(filters?: {
  excludeWithCampaigns?: boolean;
  excludeCampaignsInDays?: number;
}) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    const clientesSnapshot = await adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('clientes')
      .where('status', 'in', ['Ativo', 'Inativo'])
      .get();

    let clientes: Cliente[] = clientesSnapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          phone: data.phone,
          status: data.status,
          avatarUrl: data.avatarUrl,
          birthDate: data.birthDate instanceof Timestamp 
            ? data.birthDate.toDate() 
            : data.birthDate,
          observacoes: data.observacoes,
          planoSaude: data.planoSaude,
          instanciaWhatsapp: data.instanciaWhatsapp,
          campanhas_recebidas: data.campanhas_recebidas || [],
          ultima_campanha: data.ultima_campanha?.toDate(),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // ✅ APLICAR FILTROS
    if (filters?.excludeWithCampaigns) {
      const clientsWithHistory = await getClientsWithCampaignHistory(
        businessId,
        filters.excludeCampaignsInDays
      );
      clientes = clientes.filter(c => !clientsWithHistory.includes(c.id));
    }

    return { success: true, clientes };
  } catch (error: any) {
    console.error('Erro ao buscar clientes:', error);
    
    let errorMessage = 'Erro ao buscar clientes';
    if (error?.message?.includes('Não autenticado')) {
      errorMessage = 'Sessão expirada. Faça login novamente.';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      clientes: [], 
      error: errorMessage
    };
  }
}

/**
 * Criar campanha usando UAZAPI Sender com controle de 200/dia
 */
export async function createCampanhaAction(data: {
  nome: string;
  tipo: CampanhaTipo;
  mensagem?: string;
  mediaUrl?: string;
  dataAgendamento: Date;
  horaInicio: string;
  contatos: Array<{
    clienteId: string;
    nome: string;
    telefone: number;
  }>;
}) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    // Validar contatos
    if (data.contatos.length === 0) {
      return {
        success: false,
        error: 'Selecione pelo menos 1 contato para a campanha.'
      };
    }

    // 🔄 DIVISÃO AUTOMÁTICA EM MÚLTIPLAS CAMPANHAS
    if (data.contatos.length > 200) {
      return await createMultipleCampaigns(businessId, data);
    }

    // Para campanhas de até 200, criar normalmente
    return await createSingleCampaign(businessId, data);

    // Esta função agora é um wrapper, a lógica foi dividida
  } catch (error: any) {
    console.error('❌ Erro ao criar campanha:', error);
    
    let errorMessage = 'Erro ao criar campanha';
    if (error?.message?.includes('Não autenticado')) {
      errorMessage = 'Sessão expirada. Faça login novamente.';
    } else if (error?.message?.includes('WhatsApp não conectado')) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

/**
 * Criar uma Única campanha (até 200 contatos)
 */
async function createSingleCampaign(
  businessId: string,
  data: {
    nome: string;
    tipo: CampanhaTipo;
    mensagem?: string;
    mediaUrl?: string;
    dataAgendamento: Date;
    horaInicio: string;
    contatos: Array<{
      clienteId: string;
      nome: string;
      telefone: number;
    }>;
  }
) {
  try {
    // ✅ VERIFICAR QUOTA DIÁRIA (200/dia)
    const quota = await getAvailableQuota(businessId, data.dataAgendamento);
    
    if (!quota.canSendToday) {
      return {
        success: false,
        error: `Limite diário atingido! Você já enviou ${quota.used} mensagens hoje. Tente amanhã ou agende para outra data.`
      };
    }

    if (data.contatos.length > quota.available) {
      return {
        success: false,
        error: `Você tem ${quota.available} envios disponíveis hoje (limite: 200/dia).`
      };
    }

    // Buscar config WhatsApp
    const { token, instancia } = await getWhatsAppConfig(businessId);

    // Preparar números no formato correto
    const numbers = data.contatos.map(c => `${c.telefone}@s.whatsapp.net`);

    // Calcular timestamp de agendamento
    const [horaStr, minutoStr] = data.horaInicio.split(':');
    const hora = parseInt(horaStr || '0', 10);
    const minuto = parseInt(minutoStr || '0', 10);
    const dataCompleta = new Date(data.dataAgendamento);
    dataCompleta.setHours(hora, minuto, 0, 0);
    const scheduledFor = dataCompleta.getTime();

    // Preparar payload baseado no tipo
    const payload: any = {
      numbers,
      delayMin: 80,  // Anti-ban: 80-120 segundos
      delayMax: 120,
      scheduled_for: scheduledFor,
      info: data.nome,
    };

    // Configurar mensagem baseado no tipo
    if (data.tipo === 'texto') {
      payload.type = 'text';
      payload.text = data.mensagem || '';
    } else if (data.tipo === 'imagem') {
      payload.type = 'image';
      payload.file = data.mediaUrl || '';
    } else if (data.tipo === 'audio') {
      payload.type = 'audio';
      payload.file = data.mediaUrl || '';
    } else if (data.tipo === 'video') {
      payload.type = 'video';
      payload.file = data.mediaUrl || '';
    }

    // Chamar UAZAPI Sender
    const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://uazapi.com';
    const response = await fetch(`${apiUrl}/sender/simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao criar campanha na UAZAPI');
    }

    const result = await response.json();
    const folderId = result.folder_id || result.folderId || result.id;

    // ✅ SALVAR CAMPANHA COM RASTREAMENTO COMPLETO
    const contatosCampanha: CampaignContact[] = data.contatos.map(c => ({
      clienteId: c.clienteId,
      nome: c.nome,
      telefone: c.telefone,
      status: 'pending' as const,
    }));

    const campaignId = await saveCampaign({
      businessId,
      folder_id: folderId,
      nome: data.nome,
      tipo: data.tipo,
      mensagem: data.mensagem,
      mediaUrl: data.mediaUrl,
      status: 'scheduled',
      total_contacts: data.contatos.length,
      sent_count: 0,
      failed_count: 0,
      contatos: contatosCampanha,
      scheduled_for: dataCompleta,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // ✅ INCREMENTAR CONTADOR DIÁRIO (reserva a quota)
    await incrementDailyStats(businessId, campaignId, data.contatos.length, data.dataAgendamento);

    // ✅ REGISTRAR NO HISTÓRICO DOS CLIENTES
    for (const contato of data.contatos) {
      await addCampaignToClientHistory(businessId, contato.clienteId, campaignId);
    }

    return {
      success: true,
      folderId,
      campaignId,
      message: `Campanha criada! ${data.contatos.length} contatos agendados para ${dataCompleta.toLocaleDateString('pt-BR')} às ${data.horaInicio}.`,
    };

  } catch (error: any) {
    console.error('❌ Erro ao criar campanha única:', error);
    
    let errorMessage = 'Erro ao criar campanha';
    if (error?.message?.includes('Não autenticado')) {
      errorMessage = 'Sessão expirada. Faça login novamente.';
    } else if (error?.message?.includes('WhatsApp não conectado')) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

/**
 * Criar MÚLTIPLAS campanhas (divide em lotes de 200)
 */
async function createMultipleCampaigns(
  businessId: string,
  data: {
    nome: string;
    tipo: CampanhaTipo;
    mensagem?: string;
    mediaUrl?: string;
    dataAgendamento: Date;
    horaInicio: string;
    contatos: Array<{
      clienteId: string;
      nome: string;
      telefone: number;
    }>;
  }
) {
  try {
    console.log(`🔄 Dividindo ${data.contatos.length} contatos em múltiplas campanhas...`);

    // Dividir contatos por dias usando quota disponível
    const { batches, total_days } = await splitContactsByDays(
      businessId,
      data.contatos.map(c => ({
        clienteId: c.clienteId,
        nome: c.nome,
        telefone: c.telefone,
        status: 'pending' as const,
      })),
      data.dataAgendamento
    );

    console.log(`📋 Criando ${batches.length} campanhas distribuídas em ${total_days} dias`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Criar cada campanha
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (!batch) continue; // Skip if undefined
      
      const batchNumber = i + 1;
      
      console.log(`📤 Campanha ${batchNumber}/${batches.length}: ${batch.contacts.length} contatos para ${batch.date.toLocaleDateString('pt-BR')}`);

      // Ajustar data de agendamento para cada lote
      const batchData = {
        ...data,
        nome: `${data.nome} (${batchNumber}/${batches.length})`,
        dataAgendamento: batch.date,
        contatos: batch.contacts.map(c => ({
          clienteId: c.clienteId,
          nome: c.nome,
          telefone: c.telefone as number,
        })),
      };

      const result = await createSingleCampaign(businessId, batchData);
      
      if (result.success) {
        successCount++;
        console.log(`✅ Campanha ${batchNumber} criada com sucesso`);
      } else {
        failCount++;
        console.error(`❌ Campanha ${batchNumber} falhou: ${result.error}`);
      }

      results.push({
        batch: batchNumber,
        date: batch.date,
        contacts: batch.contacts.length,
        ...result,
      });

      // Pequeno delay entre criações para não sobrecarregar
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (failCount > 0) {
      return {
        success: false,
        error: `${failCount} de ${batches.length} campanhas falharam. Verifique os detalhes.`,
        details: results,
      };
    }

    return {
      success: true,
      message: `🎉 ${successCount} campanhas criadas com sucesso! Total: ${data.contatos.length} contatos em ${total_days} dias.`,
      campaignCount: successCount,
      totalDays: total_days,
      details: results,
    };

  } catch (error: any) {
    console.error('❌ Erro ao criar múltiplas campanhas:', error);
    
    let errorMessage = 'Erro ao criar múltiplas campanhas';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

/**
 * Listar campanhas do Firestore (com sincronização UazAPI)
 */
export async function getCampanhasAction() {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    // Buscar campanhas do Firestore
    const snapshot = await adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('campanhas')
      .orderBy('created_at', 'desc')
      .limit(100)
      .get();

    const campanhas = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        folder_id: data.folder_id,
        nome: data.nome,
        tipo: data.tipo,
        status: data.status,
        totalContatos: data.total_contacts || 0,
        contatosEnviados: data.sent_count || 0,
        contatosFalhados: data.failed_count || 0,
        mensagem: data.mensagem,
        mediaUrl: data.mediaUrl,
        dataAgendamento: data.scheduled_for?.toDate(),
        criadaEm: data.created_at?.toDate(),
        contatos: data.contatos || [],
        envios: (data.contatos || []).map((c: any) => ({
          contatoId: c.clienteId,
          telefone: c.telefone,
          status: c.status === 'sent' ? 'Enviado' : c.status === 'failed' ? 'Erro' : 'Pendente',
          enviadoEm: c.sent_at?.toDate(),
        })),
      };
    });

    return {
      success: true,
      campanhas,
    };

  } catch (error: any) {
    console.error('Erro ao buscar campanhas:', error);
    
    return { 
      success: false, 
      campanhas: [], 
      error: error instanceof Error ? error.message : 'Erro ao buscar campanhas'
    };
  }
}

/**
 * Buscar quota disponível para campanhas
 */
export async function getQuotaAction() {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    const quota = await getAvailableQuota(businessId);

    return {
      success: true,
      quota,
    };
  } catch (error: any) {
    console.error('Erro ao buscar quota:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar quota',
      quota: { total: 200, used: 0, available: 200, canSendToday: true },
    };
  }
}

/**
 * Obter detalhes de uma campanha
 */
export async function getCampanhaDetailsAction(folderId: string) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);
    const { token } = await getWhatsAppConfig(businessId);

    const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://uazapi.com';
    const response = await fetch(`${apiUrl}/sender/listmessages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify({
        folder_id: folderId,
        page: 1,
        pageSize: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar detalhes da campanha');
    }

    const data = await response.json();

    return {
      success: true,
      campanha: {
        id: folderId,
        mensagens: data.messages || [],
        total: data.total || 0,
      },
    };

  } catch (error: any) {
    console.error('Erro ao buscar detalhes:', error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao buscar detalhes'
    };
  }
}

/**
 * Pausar campanha
 */
export async function pauseCampanhaAction(campaignId: string) {
  console.log(`⏸️ [PAUSE] Tentando pausar campanha: ${campaignId}`);
  
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    console.log(`⏸️ [PAUSE] BusinessId: ${businessId}, CampaignId: ${campaignId}`);

    // Buscar folder_id no Firestore
    const campanhaDoc = await adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('campanhas')
      .doc(campaignId)
      .get();

    if (!campanhaDoc.exists) {
      console.error(`❌ [PAUSE] Campanha não encontrada no Firestore: ${campaignId}`);
      return {
        success: false,
        error: 'Campanha não encontrada',
      };
    }

    const campanhaData = campanhaDoc.data();
    const folderId = campanhaData?.folder_id;
    const status = campanhaData?.status;

    console.log(`⏸️ [PAUSE] Campanha encontrada - Status: ${status}, FolderId: ${folderId}`);

    if (!folderId) {
      console.error(`❌ [PAUSE] Campanha sem folder_id`);
      return {
        success: false,
        error: 'Campanha ainda não foi criada na UazAPI. Aguarde o processamento.',
      };
    }

    // Verificar se pode pausar
    if (status === 'done') {
      console.error(`❌ [PAUSE] Campanha já foi concluída`);
      return {
        success: false,
        error: 'Não é possível pausar uma campanha concluída.',
      };
    }

    if (status === 'paused') {
      console.warn(`⚠️ [PAUSE] Campanha já está pausada`);
      return {
        success: false,
        error: 'Campanha já está pausada.',
      };
    }

    const { token } = await getWhatsAppConfig(businessId);
    const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://uazapi.com';
    
    console.log(`⏸️ [PAUSE] Enviando requisição para UazAPI...`);
    
    const response = await fetch(`${apiUrl}/sender/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify({
        folder_id: folderId,
        action: 'stop',
      }),
    });

    const responseText = await response.text();
    console.log(`⏸️ [PAUSE] Resposta UazAPI [${response.status}]: ${responseText}`);

    if (!response.ok) {
      let errorMsg = 'Erro ao pausar campanha na UazAPI';
      try {
        const errorData = JSON.parse(responseText);
        errorMsg = errorData.message || errorData.error || errorMsg;
      } catch (e) {
        errorMsg = responseText || errorMsg;
      }
      
      console.error(`❌ [PAUSE] Erro da UazAPI: ${errorMsg}`);
      
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Atualizar status no Firestore
    console.log(`⏸️ [PAUSE] Atualizando status no Firestore...`);
    await campanhaDoc.ref.update({
      status: 'paused',
      updated_at: new Date(),
    });

    console.log(`✅ [PAUSE] Campanha pausada com sucesso!`);

    return {
      success: true,
      message: 'Campanha pausada com sucesso',
    };

  } catch (error: any) {
    console.error('❌ [PAUSE] Erro inesperado ao pausar campanha:', error);
    console.error('❌ [PAUSE] Stack trace:', error.stack);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido ao pausar campanha'
    };
  }
}

/**
 * Continuar campanha pausada
 */
export async function continueCampanhaAction(campaignId: string) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    // Buscar folder_id no Firestore
    const campanhaDoc = await adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('campanhas')
      .doc(campaignId)
      .get();

    if (!campanhaDoc.exists) {
      return {
        success: false,
        error: 'Campanha não encontrada',
      };
    }

    const folderId = campanhaDoc.data()?.folder_id;

    if (!folderId) {
      return {
        success: false,
        error: 'Campanha sem folder_id (não foi enviada para UazAPI)',
      };
    }

    const { token } = await getWhatsAppConfig(businessId);
    const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://uazapi.com';
    const response = await fetch(`${apiUrl}/sender/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify({
        folder_id: folderId,
        action: 'continue',
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao continuar campanha');
    }

    // Atualizar status no Firestore
    await campanhaDoc.ref.update({
      status: 'sending',
      updated_at: new Date(),
    });

    return {
      success: true,
      message: 'Campanha retomada com sucesso',
    };

  } catch (error: any) {
    console.error('Erro ao continuar campanha:', error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao continuar campanha'
    };
  }
}

/**
 * Deletar campanha
 */
export async function deleteCampanhaAction(campaignId: string) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    // 1️⃣ Buscar campanha no Firestore
    const campanhaRef = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('campanhas')
      .doc(campaignId);

    const campanhaDoc = await campanhaRef.get();

    if (!campanhaDoc.exists) {
      return {
        success: false,
        error: 'Campanha não encontrada',
      };
    }

    const campanha = campanhaDoc.data();
    const folderId = campanha?.folder_id;

    // 2️⃣ Deletar na UazAPI (se tiver folder_id)
    if (folderId) {
      const { token } = await getWhatsAppConfig(businessId);
      const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://uazapi.com';
      
      const response = await fetch(`${apiUrl}/sender/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': token,
        },
        body: JSON.stringify({
          folder_id: folderId,
          action: 'delete',
        }),
      });

      // Não falhar se UazAPI retornar erro (campanha pode já ter sido deletada)
      if (!response.ok) {
        console.warn(`Aviso: Erro ao deletar campanha ${folderId} na UazAPI, mas continuando...`);
      }
    }

    // 3️⃣ Deletar do Firestore
    await campanhaRef.delete();

    return {
      success: true,
      message: 'Campanha deletada com sucesso',
    };

  } catch (error: any) {
    console.error('Erro ao deletar campanha:', error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao deletar campanha'
    };
  }
}
