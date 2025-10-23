"use server";

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { 
  Campanha, 
  CampanhaContato, 
  CampanhaEnvio,
  CampanhaTipo,
  CampanhaStatus,
  Cliente 
} from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

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
  // O businessId É O PRÓPRIO userId (documento tem mesmo ID do usuário)
  // Verificar se existe
  const businessDoc = await adminDb
    .collection('negocios')
    .doc(userId)
    .get();

  if (!businessDoc.exists) {
    throw new Error('Negócio não encontrado');
  }

  return userId;
}

/**
 * Buscar todos os clientes do negócio
 */
export async function getClientesAction() {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    const clientesSnapshot = await adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('clientes')
      .where('status', 'in', ['Ativo', 'Inativo'])
      .get();

    const clientes: Cliente[] = clientesSnapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          phone: data.phone,
          status: data.status,
          avatarUrl: data.avatarUrl,
          // ✅ CRITICAL: Converter Timestamp para Date serializável
          birthDate: data.birthDate instanceof Timestamp 
            ? data.birthDate.toDate() 
            : data.birthDate,
          observacoes: data.observacoes,
          planoSaude: data.planoSaude,
          instanciaWhatsapp: data.instanciaWhatsapp,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)); // Ordena no código

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
 * Criar nova campanha
 */
export async function createCampanhaAction(data: {
  nome: string;
  tipo: CampanhaTipo;
  mensagem?: string;
  mediaUrl?: string;
  dataAgendamento: Date;
  horaInicio: string;
  contatos: CampanhaContato[];
}) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    // Validar limite de contatos PRIMEIRO (mais rápido)
    if (data.contatos.length === 0) {
      return {
        success: false,
        error: 'Você precisa selecionar pelo menos 1 contato para criar a campanha.'
      };
    }

    if (data.contatos.length > 200) {
      return {
        success: false,
        error: `Você selecionou ${data.contatos.length} contatos. O limite é de 200 contatos por campanha.`
      };
    }

    // Buscar configurações do WhatsApp
    const businessDoc = await adminDb.collection('negocios').doc(businessId).get();
    const businessData = businessDoc.data();

    if (!businessData?.whatsappConectado) {
      return {
        success: false,
        error: 'WhatsApp não conectado. Conecte seu WhatsApp em Configurações antes de criar campanhas.'
      };
    }

    if (!businessData.tokenInstancia) {
      return {
        success: false,
        error: 'Configuração do WhatsApp incompleta. Reconecte seu WhatsApp em Configurações.'
      };
    }

    // Criar envios pendentes
    const envios: CampanhaEnvio[] = data.contatos.map(contato => ({
      contatoId: contato.clienteId,
      telefone: contato.telefone,
      status: 'Pendente',
    }));

    // Calcular tempo estimado de conclusão (média 100 segundos - intervalo anti-ban 80-120s)
    const tempoMedioPorMensagem = 100; // segundos
    const totalMinutos = (data.contatos.length * tempoMedioPorMensagem) / 60;
    const horas = Math.floor(totalMinutos / 60);
    const minutos = Math.floor(totalMinutos % 60);
    const tempoEstimado = horas > 0 ? `${horas}h ${minutos}min` : `${minutos}min`;

    // Criar campanha
    const campanha: Omit<Campanha, 'id'> = {
      businessId,
      nome: data.nome,
      tipo: data.tipo,
      mensagem: data.mensagem,
      mediaUrl: data.mediaUrl,
      contatos: data.contatos,
      totalContatos: data.contatos.length,
      contatosEnviados: 0,
      status: 'Agendada',
      dataAgendamento: Timestamp.fromDate(data.dataAgendamento),
      horaInicio: data.horaInicio,
      tempoEstimadoConclusao: tempoEstimado,
      instanciaWhatsapp: businessId, // Nome da instância = businessId
      tokenInstancia: businessData.tokenInstancia,
      envios,
      createdAt: Timestamp.now(),
    };

    const campanhaRef = await adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('campanhas')
      .add(campanha);

    // 🔥 OTIMIZAÇÃO: Criar referência na coleção centralizada (para CRON eficiente)
    await adminDb.collection('active_campaigns').doc(campanhaRef.id).set({
      businessId,
      campanhaId: campanhaRef.id,
      status: 'Agendada',
      dataAgendamento: Timestamp.fromDate(data.dataAgendamento),
      horaInicio: data.horaInicio,
      totalContatos: data.contatos.length,
      createdAt: Timestamp.now(),
    });

    return { 
      success: true, 
      campanhaId: campanhaRef.id,
      message: 'Campanha agendada com sucesso!' 
    };
  } catch (error: any) {
    console.error('❌ Erro ao criar campanha:', error);
    
    let errorMessage = 'Erro ao criar campanha';
    if (error?.message?.includes('Não autenticado')) {
      errorMessage = 'Sessão expirada. Faça login novamente.';
    } else if (error?.message?.includes('Sessão inválida')) {
      errorMessage = 'Sessão inválida. Faça login novamente.';
    } else if (error?.message?.includes('Negócio não encontrado')) {
      errorMessage = 'Configuração do negócio não encontrada. Entre em contato com o suporte.';
    } else if (error?.code === 'permission-denied') {
      errorMessage = 'Você não tem permissão para criar campanhas.';
    } else if (error?.code === 'unavailable') {
      errorMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.';
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
 * Listar todas as campanhas
 */
export async function getCampanhasAction() {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    const campanhasSnapshot = await adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('campanhas')
      .orderBy('createdAt', 'desc')
      .get();

    const campanhas: Campanha[] = campanhasSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Converter Timestamps para Date objects serializáveis
        dataAgendamento: data.dataAgendamento?.toDate?.() || data.dataAgendamento,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        dataInicioExecucao: data.dataInicioExecucao?.toDate?.() || data.dataInicioExecucao,
        dataConclusao: data.dataConclusao?.toDate?.() || data.dataConclusao,
        canceledAt: data.canceledAt?.toDate?.() || data.canceledAt,
        // Serializar envios (converter Timestamps dentro do array)
        envios: data.envios?.map((envio: any) => ({
          ...envio,
          enviadoEm: envio.enviadoEm?.toDate?.() || envio.enviadoEm || null,
        })) || [],
      };
    });

    return { success: true, campanhas };
  } catch (error: any) {
    console.error('Erro ao buscar campanhas:', error);
    
    let errorMessage = 'Erro ao buscar campanhas';
    if (error?.message?.includes('Não autenticado')) {
      errorMessage = 'Sessão expirada. Faça login novamente.';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      campanhas: [], 
      error: errorMessage
    };
  }
}

/**
 * Buscar detalhes de uma campanha
 */
export async function getCampanhaDetailsAction(campanhaId: string) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    const campanhaDoc = await adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('campanhas')
      .doc(campanhaId)
      .get();

    if (!campanhaDoc.exists) {
      throw new Error('Campanha não encontrada');
    }

    const data = campanhaDoc.data();
    const campanha: Campanha = {
      id: campanhaDoc.id,
      ...data,
      // Converter Timestamps para Date objects serializáveis
      dataAgendamento: data?.dataAgendamento?.toDate?.() || data?.dataAgendamento,
      createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
      updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt,
      dataInicioExecucao: data?.dataInicioExecucao?.toDate?.() || data?.dataInicioExecucao,
      dataConclusao: data?.dataConclusao?.toDate?.() || data?.dataConclusao,
      canceledAt: data?.canceledAt?.toDate?.() || data?.canceledAt,
      // Serializar envios (converter Timestamps dentro do array)
      envios: data?.envios?.map((envio: any) => ({
        ...envio,
        enviadoEm: envio.enviadoEm?.toDate?.() || envio.enviadoEm || null,
      })) || [],
    } as Campanha;

    return { success: true, campanha };
  } catch (error: any) {
    console.error('Erro ao buscar campanha:', error);
    
    let errorMessage = 'Erro ao buscar campanha';
    if (error?.message?.includes('Não autenticado')) {
      errorMessage = 'Sessão expirada. Faça login novamente.';
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
 * Cancelar campanha
 */
export async function cancelCampanhaAction(campanhaId: string) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    const campanhaRef = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('campanhas')
      .doc(campanhaId);

    const campanhaDoc = await campanhaRef.get();

    if (!campanhaDoc.exists) {
      throw new Error('Campanha não encontrada');
    }

    const campanhaData = campanhaDoc.data() as Campanha;

    // Só pode cancelar campanhas agendadas ou em andamento
    if (campanhaData.status !== 'Agendada' && campanhaData.status !== 'Em Andamento') {
      throw new Error('Apenas campanhas agendadas ou em andamento podem ser canceladas');
    }

    await campanhaRef.update({
      status: 'Cancelada',
      canceledAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // 🔥 OTIMIZAÇÃO: Remover da coleção centralizada
    await adminDb.collection('active_campaigns').doc(campanhaId).delete();

    return { 
      success: true, 
      message: 'Campanha cancelada com sucesso' 
    };
  } catch (error: any) {
    console.error('Erro ao cancelar campanha:', error);
    
    let errorMessage = 'Erro ao cancelar campanha';
    if (error?.message?.includes('Não autenticado')) {
      errorMessage = 'Sessão expirada. Faça login novamente.';
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
 * Deletar campanha (apenas canceladas ou concluídas)
 */
export async function deleteCampanhaAction(campanhaId: string) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    const campanhaRef = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('campanhas')
      .doc(campanhaId);

    const campanhaDoc = await campanhaRef.get();

    if (!campanhaDoc.exists) {
      throw new Error('Campanha não encontrada');
    }

    const campanhaData = campanhaDoc.data() as Campanha;

    // Se estiver em andamento, cancelar automaticamente antes de deletar
    if (campanhaData.status === 'Em Andamento') {
      await campanhaRef.update({
        status: 'Cancelada',
        canceledAt: Timestamp.now(),
      });
    }

    await campanhaRef.delete();

    // 🔥 OTIMIZAÇÃO: Remover da coleção centralizada (se ainda existir)
    await adminDb.collection('active_campaigns').doc(campanhaId).delete().catch(() => {
      // Ignora erro se já foi removida
    });

    return { 
      success: true, 
      message: 'Campanha deletada com sucesso' 
    };
  } catch (error: any) {
    console.error('Erro ao deletar campanha:', error);
    
    let errorMessage = 'Erro ao deletar campanha';
    if (error?.message?.includes('Não autenticado')) {
      errorMessage = 'Sessão expirada. Faça login novamente.';
    } else if (error?.code === 'permission-denied') {
      errorMessage = 'Você não tem permissão para deletar esta campanha.';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}
