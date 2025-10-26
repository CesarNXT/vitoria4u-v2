"use server";

import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { Cliente } from '@/lib/types';

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

async function getBusinessId(userId: string): Promise<string> {
  const userDoc = await adminDb.collection('negocios').doc(userId).get();
  if (!userDoc.exists) {
    throw new Error('Negócio não encontrado');
  }
  return userId;
}

/**
 * 📊 CONTAR total de clientes (sem carregar todos!)
 * ✅ OTIMIZADO: Conta total, ativos e inativos separadamente
 */
export async function getClientsCountAction() {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    const clientesRef = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('clientes');

    // ✅ Contar todos, ativos e inativos em paralelo
    const [totalSnapshot, activosSnapshot, inativosSnapshot] = await Promise.all([
      clientesRef.count().get(),
      clientesRef.where('status', '==', 'Ativo').count().get(),
      clientesRef.where('status', '==', 'Inativo').count().get(),
    ]);
    
    return { 
      success: true, 
      count: totalSnapshot.data().count,
      ativos: activosSnapshot.data().count,
      inativos: inativosSnapshot.data().count,
    };
  } catch (error: any) {
    console.error('❌ Erro ao contar clientes:', error);
    return { 
      success: false, 
      count: 0,
      ativos: 0,
      inativos: 0,
      error: error.message 
    };
  }
}

/**
 * 🔍 BUSCAR clientes com filtro e paginação
 * ✅ OTIMIZADO: Busca por nome OU telefone
 */
export async function searchClientsAction(options: {
  searchTerm?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    const { searchTerm = '', limit = 50, offset = 0 } = options;

    let clientes: Cliente[] = [];

    // 🔍 Verificar se é busca por telefone (só números)
    const isPhoneSearch = searchTerm && /^\d+$/.test(searchTerm);

    if (isPhoneSearch) {
      // 📱 Busca por telefone
      const phoneNumber = parseInt(searchTerm, 10);
      
      const snapshot = await adminDb
        .collection('negocios')
        .doc(businessId)
        .collection('clientes')
        .where('phone', '>=', phoneNumber)
        .where('phone', '<=', phoneNumber + 999999) // Range para pegar números que começam com
        .limit(limit)
        .get();

      clientes = snapshot.docs.map((doc) => {
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
        } as Cliente;
      });

      return { 
        success: true, 
        clientes,
        hasMore: snapshot.docs.length === limit
      };
    }

    // 📝 Busca por nome
    let query = adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('clientes')
      .orderBy('name', 'asc');

    // 🔍 Filtrar por nome (prefix match)
    if (searchTerm) {
      const searchUpper = searchTerm + '\uf8ff';
      
      query = query
        .where('name', '>=', searchTerm)
        .where('name', '<=', searchUpper);
    }

    // Paginação
    query = query.limit(limit);
    
    if (offset > 0) {
      // Para offset, precisamos pular documentos
      const skipSnapshot = await adminDb
        .collection('negocios')
        .doc(businessId)
        .collection('clientes')
        .orderBy('name', 'asc')
        .limit(offset)
        .get();
      
      if (!skipSnapshot.empty) {
        const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();

    // ✅ Reusar variável já declarada
    clientes = snapshot.docs.map((doc) => {
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
      } as Cliente;
    });

    return { 
      success: true, 
      clientes,
      hasMore: snapshot.docs.length === limit
    };
  } catch (error: any) {
    console.error('❌ Erro ao buscar clientes:', error);
    return { 
      success: false, 
      clientes: [],
      hasMore: false,
      error: error.message 
    };
  }
}

/**
 * 🔍 BUSCAR clientes por telefone (exato)
 * Para verificar duplicatas e busca específica
 */
export async function searchClientByPhoneAction(phone: number) {
  try {
    const userId = await validateSession();
    const businessId = await getBusinessId(userId);

    const snapshot = await adminDb
      .collection('negocios')
      .doc(businessId)
      .collection('clientes')
      .where('phone', '==', phone)
      .limit(1)
      .get();

    if (snapshot.empty || !snapshot.docs[0]) {
      return { success: true, cliente: null };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    
    const cliente: Cliente = {
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

    return { success: true, cliente };
  } catch (error: any) {
    console.error('❌ Erro ao buscar cliente por telefone:', error);
    return { 
      success: false, 
      cliente: null,
      error: error.message 
    };
  }
}
