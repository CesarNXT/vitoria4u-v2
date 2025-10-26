"use server";

import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Cliente, CampanhaTipo } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';
import { format } from 'date-fns';
import { 
  getAvailableQuota,
  splitContactsByDays,
  saveCampaign,
  updateCampaignStatus,
  incrementDailyStats,
  decrementDailyStats,
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

  const token = businessData.tokenInstancia;
  const instancia = businessData.instanciaWhatsapp || businessId;
  
  console.log(`🔐 Token configurado: ${token.substring(0, 10)}... (${token.length} caracteres)`);
  console.log(`📱 Instância: ${instancia}`);

  return {
    token,
    instancia,
  };
}

/**
 * Buscar clientes do negócio com filtros opcionais
 * ✅ OTIMIZADO: Não carrega todos de uma vez (economia de leituras Firestore)
 */
export async function getClientesAction(filters?: {
  excludeWithCampaigns?: boolean;
  excludeCampaignsInDays?: number;
  limit?: number; // ✅ NOVO: Limite de clientes a carregar
}) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    // ✅ OTIMIZAÇÃO: Limite padrão de 1000 clientes para não travar
    const limit = filters?.limit || 1000;

    // Query simples sem filtros complexos (evita erro de índice)
    let query = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('clientes')
      .limit(limit); // ✅ CRÍTICO: Limitar leituras!

    const clientesSnapshot = await query.get();
    
    console.log(`📊 Clientes carregados do Firebase: ${clientesSnapshot.size} (limite: ${limit})`);

    // Filtrar apenas clientes ativos no código (evita necessidade de índice)
    const todosClientes = clientesSnapshot.docs.map((doc: any) => {
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
    });
    
    console.log(`📊 Total de clientes mapeados: ${todosClientes.length}`);
    console.log(`📊 Status dos clientes:`, todosClientes.map(c => c.status));
    
    let clientes: Cliente[] = todosClientes.filter((cliente: Cliente) => cliente.status === 'Ativo');
    
    console.log(`📊 Clientes ativos após filtro: ${clientes.length}`);

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
    if (data.contatos.length > 300) {
      // ✅ CRIAR EM BACKGROUND para não travar UI
      createMultipleCampaignsInBackground(businessId, data);
      
      return {
        success: true,
        message: `🚀 Criando ${data.contatos.length} envios em background! Acompanhe o progresso na lista de campanhas.`,
        background: true
      };
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
    // ✅ VERIFICAR QUOTA DIÁRIA (300/dia)
    const quota = await getAvailableQuota(businessId, data.dataAgendamento);
    
    const dataAgendamentoStr = data.dataAgendamento.toLocaleDateString('pt-BR');
    const isToday = data.dataAgendamento.toDateString() === new Date().toDateString();
    const diaReferencia = isToday ? 'hoje' : `no dia ${dataAgendamentoStr}`;
    
    console.log(`📊 Quota para ${dataAgendamentoStr}: ${quota.available} de ${quota.total} disponíveis (${quota.used} já usados)`);
    
    if (!quota.canSendToday) {
      return {
        success: false,
        error: `Limite diário atingido! Você já tem ${quota.used} mensagens agendadas para ${diaReferencia}. Escolha outra data.`
      };
    }

    if (data.contatos.length > quota.available) {
      return {
        success: false,
        error: `Você tem ${quota.available} envios disponíveis ${diaReferencia} (limite: 300/dia).`
      };
    }

    // ✅ VALIDAR HORÁRIO COMERCIAL (07:00 - 21:00)
    const [horaCheck, minutoCheck] = data.horaInicio.split(':').map(Number);
    const horaDecimal = (horaCheck || 0) + ((minutoCheck || 0) / 60);
    
    if (horaDecimal < 7 || horaDecimal >= 21) {
      return {
        success: false,
        error: 'Horário fora do expediente! Escolha um horário entre 07:00 e 21:00.'
      };
    }

    // Buscar config WhatsApp
    const { token, instancia } = await getWhatsAppConfig(businessId);

    // Preparar números no formato correto
    const numbers = data.contatos.map(c => `${c.telefone}@s.whatsapp.net`);

    // Calcular timestamp de agendamento
    const [horaAgendamento, minutoAgendamento] = data.horaInicio.split(':').map(Number);
    
    console.log(`🔹 Data recebida (data.dataAgendamento): ${data.dataAgendamento.toISOString()}`);
    console.log(`🔹 Hora recebida (data.horaInicio): ${data.horaInicio}`);
    console.log(`🔹 Hora a aplicar: ${horaAgendamento}:${minutoAgendamento}`);
    
    // ✅ IMPORTANTE: Criar nova data para evitar mutar a original
    const dataCompleta = new Date(data.dataAgendamento.getFullYear(), data.dataAgendamento.getMonth(), data.dataAgendamento.getDate(), horaAgendamento || 0, minutoAgendamento || 0, 0, 0);
    
    console.log(`🔹 Data completa FINAL: ${dataCompleta.toISOString()}`);
    console.log(`🔹 Data completa local FINAL: ${dataCompleta.toLocaleString('pt-BR')}`);
    console.log(`🔹 Hora da data completa: ${dataCompleta.getHours()}:${dataCompleta.getMinutes()}`);
    
    // ✅ Calcular MINUTOS a partir de agora (não timestamp)
    const now = new Date();
    const delayMs = dataCompleta.getTime() - now.getTime();
    
    // ✅ VALIDAÇÃO: Buffer mínimo de 10 minutos (apenas para agendamentos de hoje)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataAgendamentoSemHora = new Date(data.dataAgendamento);
    dataAgendamentoSemHora.setHours(0, 0, 0, 0);
    
    // Aplicar validação de 10 minutos apenas se for agendamento para hoje
    if (dataAgendamentoSemHora.getTime() === hoje.getTime() && delayMs < 10 * 60 * 1000) {
      return {
        success: false,
        error: 'Horário muito próximo! Selecione um horário com pelo menos 10 minutos de antecedência.'
      };
    }
    
    const delayMinutes = Math.ceil(delayMs / 60000);
    
    console.log(`⏰ Agendando campanha para: ${dataCompleta.toLocaleString('pt-BR')}`);
    console.log(`⏰ Delay: ${delayMinutes} minutos a partir de agora`);

    // Preparar payload baseado no tipo
    const payload: any = {
      numbers,
      delayMin: 80,  // Anti-ban: 80-120 segundos ENTRE mensagens
      delayMax: 120,
      scheduled_for: delayMinutes, // ✅ MINUTOS a partir de agora (não timestamp)
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
    
    console.log(`📡 Enviando para: ${apiUrl}/sender/simple`);
    console.log(`🔑 Token sendo usado: ${token.substring(0, 10)}...`);
    console.log(`📦 Payload:`, { ...payload, numbers: `[${payload.numbers.length} números]` });
    
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
      console.error(`❌ Resposta da API (${response.status}):`, errorData);
      
      // Mensagem de erro mais clara para token inválido
      if (response.status === 401 || errorData.message?.includes('Invalid token')) {
        throw new Error('Token de autenticação inválido ou expirado. Por favor, reconecte seu WhatsApp em Configurações.');
      }
      
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
    // Usar dataCompleta (com hora) para garantir consistência
    await incrementDailyStats(businessId, campaignId, data.contatos.length, dataCompleta);

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
 * Criar MÚLTIPLAS campanhas EM BACKGROUND (não bloqueia UI)
 */
async function createMultipleCampaignsInBackground(
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
  // Executa em background sem await
  createMultipleCampaigns(businessId, data)
    .then(result => {
      console.log('✅ Campanhas em background concluídas:', result);
    })
    .catch(error => {
      console.error('❌ Erro em campanhas background:', error);
    });
}

/**
 * Criar MÚLTIPLAS campanhas (divide em lotes de 300)
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

    // ✅ APLICAR HORA À DATA ANTES DE DIVIDIR EM BATCHES
    const [horaAgendamento, minutoAgendamento] = data.horaInicio.split(':').map(Number);
    const dataComHora = new Date(
      data.dataAgendamento.getFullYear(),
      data.dataAgendamento.getMonth(),
      data.dataAgendamento.getDate(),
      horaAgendamento || 0,
      minutoAgendamento || 0,
      0,
      0
    );
    
    console.log(`🔹 Data com hora aplicada: ${dataComHora.toISOString()} (${dataComHora.toLocaleString('pt-BR')})`);

    // Dividir contatos por dias usando quota disponível
    const { batches, total_days } = await splitContactsByDays(
      businessId,
      data.contatos.map(c => ({
        clienteId: c.clienteId,
        nome: c.nome,
        telefone: c.telefone,
        status: 'pending' as const,
      })),
      dataComHora // ✅ Passar data COM HORA
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
      console.log(`📅 Data do batch: ${batch.date.toISOString()} (dia: ${batch.date.getDate()}/${batch.date.getMonth() + 1})`);

      // Ajustar data de agendamento para cada lote
      // ✅ Manter a HORA original, mudar apenas o DIA
      const batchDate = new Date(data.dataAgendamento);
      batchDate.setFullYear(batch.date.getFullYear(), batch.date.getMonth(), batch.date.getDate());
      
      const batchData = {
        ...data,
        nome: `${data.nome} (${batchNumber}/${batches.length})`,
        dataAgendamento: batchDate, // ✅ Dia do batch + hora original
        contatos: batch.contacts.map(c => ({
          clienteId: c.clienteId,
          nome: c.nome,
          telefone: c.telefone as number,
        })),
      };
      
      console.log(`📅 DataAgendamento que será usada: ${batchData.dataAgendamento.toISOString()}`);

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
        totalContatos: data.totalContatos || data.total_contacts || 0,
        contatosEnviados: data.contatosEnviados || data.sent_count || 0,
        contatosFalhados: data.contatosFalhados || data.failed_count || 0,
        enviados: data.contatosEnviados || data.sent_count || 0,
        falhas: data.contatosFalhados || data.failed_count || 0,
        mensagem: data.mensagem,
        mediaUrl: data.mediaUrl,
        dataAgendamento: (data.dataAgendamento || data.scheduled_for)?.toDate(),
        createdAt: (data.createdAt || data.created_at)?.toDate(),
        dataConclusao: (data.dataConclusao || data.completed_at)?.toDate(),
        criadaEm: (data.createdAt || data.created_at)?.toDate(),
        contatos: data.contatos || [],
        envios: (data.contatos || []).map((c: any) => {
          // Mapear status (aceita inglês e português)
          let statusEnvio = 'Pendente';
          const statusLower = (c.status || '').toLowerCase();
          
          if (statusLower === 'sent' || statusLower === 'enviado') {
            statusEnvio = 'Enviado';
          } else if (statusLower === 'failed' || statusLower === 'error' || statusLower === 'erro') {
            statusEnvio = 'Erro';
          }
          
          return {
            contatoId: c.clienteId,
            telefone: c.telefone,
            status: statusEnvio,
            enviadoEm: c.sent_at?.toDate(),
            erro: c.error,
          };
        }),
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
export async function getQuotaAction(date?: Date) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);
    const targetDate = date || new Date();
    const quota = await getAvailableQuota(businessId, targetDate);
    
    return { success: true, quota };
  } catch (error: any) {
    console.error('Erro ao buscar quota:', error);
    return { 
      success: false, 
      quota: { total: 300, used: 0, available: 300, canSendToday: true } 
    };
  }
}

/**
 * 🔧 ADMIN: Resetar quota do dia (para debug)
 */
export async function resetDailyQuotaAction(date?: Date) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);
    const targetDate = date || new Date();
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    
    const docRef = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('daily_stats')
      .doc(dateStr);
    
    await docRef.delete();
    
    console.log(`✅ Quota resetada para ${dateStr}`);
    
    return { 
      success: true, 
      message: `Quota do dia ${targetDate.toLocaleDateString('pt-BR')} foi resetada.` 
    };
  } catch (error: any) {
    console.error('Erro ao resetar quota:', error);
    return { 
      success: false, 
      error: error.message || 'Erro ao resetar quota' 
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
    const totalContatos = campanha?.totalContatos || campanha?.total_contacts || 0;
    const dataAgendamento = campanha?.dataAgendamento || campanha?.scheduled_for;

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

    // 3️⃣ Decrementar quota do dia (liberar quota)
    if (totalContatos > 0 && dataAgendamento) {
      const scheduledDate = dataAgendamento.toDate ? dataAgendamento.toDate() : new Date(dataAgendamento);
      await decrementDailyStats(businessId, campaignId, totalContatos, scheduledDate);
    }

    // 4️⃣ Deletar do Firestore
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

/**
 * 🗑️ Deletar MÚLTIPLAS campanhas de uma vez
 */
export async function deleteMultipleCampanhasAction(campaignIds: string[]) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    if (campaignIds.length === 0) {
      return {
        success: false,
        error: 'Nenhuma campanha selecionada',
      };
    }

    console.log(`🗑️ Deletando ${campaignIds.length} campanhas...`);

    const { token } = await getWhatsAppConfig(businessId);
    const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://uazapi.com';

    let successCount = 0;
    let failCount = 0;

    // Deletar cada campanha
    for (const campaignId of campaignIds) {
      try {
        // Buscar campanha
        const campanhaRef = adminDb
          .collection('negocios')
          .doc(businessId)
          .collection('campanhas')
          .doc(campaignId);

        const campanhaDoc = await campanhaRef.get();

        if (!campanhaDoc.exists) {
          console.warn(`⚠️ Campanha ${campaignId} não encontrada`);
          failCount++;
          continue;
        }

        const campanha = campanhaDoc.data();
        const folderId = campanha?.folder_id;
        const totalContatos = campanha?.totalContatos || campanha?.total_contacts || 0;
        const dataAgendamento = campanha?.dataAgendamento || campanha?.scheduled_for;

        // Deletar na UazAPI (se tiver folder_id)
        if (folderId) {
          await fetch(`${apiUrl}/sender/edit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'token': token,
            },
            body: JSON.stringify({
              folder_id: folderId,
              action: 'delete',
            }),
          }).catch(() => {
            console.warn(`⚠️ Erro ao deletar ${folderId} na UazAPI`);
          });
        }

        // Decrementar quota do dia (liberar quota)
        if (totalContatos > 0 && dataAgendamento) {
          const scheduledDate = dataAgendamento.toDate ? dataAgendamento.toDate() : new Date(dataAgendamento);
          await decrementDailyStats(businessId, campaignId, totalContatos, scheduledDate);
        }

        // Deletar do Firestore
        await campanhaRef.delete();
        successCount++;
        console.log(`✅ Campanha ${campaignId} deletada`);

      } catch (error) {
        console.error(`❌ Erro ao deletar campanha ${campaignId}:`, error);
        failCount++;
      }
    }

    if (failCount > 0) {
      return {
        success: true,
        message: `${successCount} campanhas deletadas, ${failCount} falharam.`,
        successCount,
        failCount,
      };
    }

    return {
      success: true,
      message: `${successCount} campanhas deletadas com sucesso!`,
      successCount,
      failCount: 0,
    };

  } catch (error: any) {
    console.error('❌ Erro ao deletar múltiplas campanhas:', error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao deletar campanhas'
    };
  }
}
