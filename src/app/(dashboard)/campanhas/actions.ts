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
          birthDate: data.birthDate,
          observacoes: data.observacoes,
          planoSaude: data.planoSaude,
          instanciaWhatsapp: data.instanciaWhatsapp,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)); // Ordena no código

    return { success: true, clientes };
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      clientes: []
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

    // Buscar configurações do WhatsApp
    const businessDoc = await adminDb.collection('negocios').doc(businessId).get();
    const businessData = businessDoc.data();

    if (!businessData?.whatsappConectado) {
      throw new Error('WhatsApp não conectado');
    }

    if (!businessData.tokenInstancia) {
      throw new Error('Token do WhatsApp não encontrado');
    }

    // Validar limite de contatos
    if (data.contatos.length === 0) {
      throw new Error('Nenhum contato selecionado');
    }

    if (data.contatos.length > 200) {
      throw new Error('Limite máximo de 200 contatos por campanha');
    }

    // Criar envios pendentes
    const envios: CampanhaEnvio[] = data.contatos.map(contato => ({
      contatoId: contato.clienteId,
      telefone: contato.telefone,
      status: 'Pendente',
    }));

    // Calcular tempo estimado de conclusão
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

    console.log(`✅ Campanha criada: ${campanhaRef.id} - ${data.nome} - ${data.contatos.length} contatos`);

    return { 
      success: true, 
      campanhaId: campanhaRef.id,
      message: 'Campanha agendada com sucesso!' 
    };
  } catch (error) {
    console.error('❌ Erro ao criar campanha:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao criar campanha' 
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
        // Converter Timestamps para strings ISO (serializável)
        dataAgendamento: data.dataAgendamento?.toDate?.() || data.dataAgendamento,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        dataInicioExecucao: data.dataInicioExecucao?.toDate?.() || data.dataInicioExecucao,
        dataConclusao: data.dataConclusao?.toDate?.() || data.dataConclusao,
      };
    });

    return { success: true, campanhas };
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      campanhas: []
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
      dataInicioExecucao: data?.dataInicioExecucao?.toDate?.() || data?.dataInicioExecucao,
      dataConclusao: data?.dataConclusao?.toDate?.() || data?.dataConclusao,
    } as Campanha;

    return { success: true, campanha };
  } catch (error) {
    console.error('Erro ao buscar campanha:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
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

    console.log(`⚠️ Campanha cancelada: ${campanhaId}`);

    return { 
      success: true, 
      message: 'Campanha cancelada com sucesso' 
    };
  } catch (error) {
    console.error('Erro ao cancelar campanha:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao cancelar campanha' 
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

    // Não pode deletar campanhas em andamento (precisa cancelar primeiro)
    if (campanhaData.status === 'Em Andamento') {
      throw new Error('Não é possível deletar uma campanha em andamento. Cancele-a primeiro.');
    }

    await campanhaRef.delete();

    // 🔥 OTIMIZAÇÃO: Remover da coleção centralizada (se ainda existir)
    await adminDb.collection('active_campaigns').doc(campanhaId).delete().catch(() => {
      // Ignora erro se já foi removida
    });

    console.log(`🗑️ Campanha deletada: ${campanhaId}`);

    return { 
      success: true, 
      message: 'Campanha deletada com sucesso' 
    };
  } catch (error) {
    console.error('Erro ao deletar campanha:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao deletar campanha' 
    };
  }
}
