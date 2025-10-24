
"use client";

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type {
  Agendamento,
  Cliente,
  Servico,
  Profissional,
  DataBloqueada,
  Plano,
  ConfiguracoesNegocio,
  SystemConfig,
} from './types';

// Helper to get DB instance
function getDb() {
    const { firestore } = initializeFirebase();
    return firestore;
}

// --- Generic Document Operations ---

// Função recursiva para remover undefined de objetos
function removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) {
        return null;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefined(item));
    }
    
    if (typeof obj === 'object' && obj.constructor === Object) {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = removeUndefined(value);
            }
        }
        return cleaned;
    }
    
    return obj;
}

export async function saveOrUpdateDocument(collectionName: string, docId: string, data: any, businessId?: string): Promise<void> {
    const db = getDb();
    const path = businessId ? `negocios/${businessId}/${collectionName}/${docId}` : `${collectionName}/${docId}`;
    const docRef = doc(db, path);
    
    console.log('[FIRESTORE] saveOrUpdateDocument chamado:', {
        collection: collectionName,
        docId,
        path,
        data,
        businessId
    });
    
    // Remove campos undefined recursivamente (Firestore não aceita undefined, apenas null)
    const sanitizedData = removeUndefined(data);
    
    console.log('[FIRESTORE] Dados sanitizados:', sanitizedData);
    
    await setDoc(docRef, sanitizedData, { merge: true });
    
    console.log('[FIRESTORE] Documento salvo com sucesso!');
}

export async function deleteDocument(collectionName: string, docId: string, businessId?: string): Promise<void> {
    const db = getDb();
    const path = businessId ? `negocios/${businessId}/${collectionName}/${docId}` : `${collectionName}/${docId}`;
    const docRef = doc(db, path);
    await deleteDoc(docRef);
}

export async function getBusinessConfig(businessId: string): Promise<ConfiguracoesNegocio | null> {
    const db = getDb();
    const docRef = doc(db, 'negocios', businessId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ConfiguracoesNegocio;
    }
    return null;
}


// --- Real-time Snapshot Listeners ---

const createSnapshotListener = <T>(collectionName: string, businessId: string, setData: (data: T[]) => void, q?: Query): (() => void) => {
    const db = getDb();
    const path = `negocios/${businessId}/${collectionName}`;
    const collRef = q || collection(db, path);
    
    const unsubscribe = onSnapshot(collRef as Query<DocumentData>, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setData(data);
    }, (error) => {
        console.error(`Error fetching ${collectionName}:`, error);
        // Here you might want to set an error state
    });

    return unsubscribe;
};

export const getAppointmentsOnSnapshot = (businessId: string, setData: (data: Agendamento[]) => void) => 
    createSnapshotListener<Agendamento>('agendamentos', businessId, setData, query(collection(getDb(), `negocios/${businessId}/agendamentos`), orderBy('date', 'desc')));

export const getClientsOnSnapshot = (businessId: string, setData: (data: Cliente[]) => void) => 
    createSnapshotListener<Cliente>('clientes', businessId, setData);

export const getServicesOnSnapshot = (businessId: string, setData: (data: Servico[]) => void) =>
    createSnapshotListener<Servico>('servicos', businessId, setData);

export const getProfessionalsOnSnapshot = (businessId: string, setData: (data: Profissional[]) => void) =>
    createSnapshotListener<Profissional>('profissionais', businessId, setData);

export const getBlockedDatesOnSnapshot = (businessId: string, setData: (data: DataBloqueada[]) => void) =>
    createSnapshotListener<DataBloqueada>('datasBloqueadas', businessId, setData, query(collection(getDb(), `negocios/${businessId}/datasBloqueadas`), orderBy('startDate', 'asc')));

// --- One-time Data Fetches (Client-side) ---

export async function getCollectionData<T>(path: string): Promise<T[]> {
  const db = getDb();
  const collectionRef = collection(db, path);
  const snapshot = await getDocs(collectionRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

export async function getSystemConfig(): Promise<SystemConfig> {
  const db = getDb();
  const configRef = doc(db, 'configuracoes_sistema', 'global');
  const configSnap = await getDoc(configRef);
  
  if (configSnap.exists()) {
    return configSnap.data() as SystemConfig;
  }
  
  // Retorna configuração padrão se não existir
  const defaultConfig: SystemConfig = {
    id: 'global',
    trial: {
      enabled: true,
      days: 3,
      planId: 'plano_premium'
    }
  };
  
  // Cria a configuração padrão no Firestore
  await setDoc(configRef, defaultConfig);
  return defaultConfig;
}

