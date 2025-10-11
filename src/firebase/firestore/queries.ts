
import { doc, getDoc, getDocs, collection, query, where, limit, setDoc, deleteDoc, Firestore } from 'firebase/firestore';
import type { ConfiguracoesNegocio } from '@/lib/types';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { initializeFirebase } from '@/firebase';

// Helper to get DB instance reliably
async function getDb(): Promise<Firestore> {
    const { firestore } = initializeFirebase();
    return firestore;
}

export async function getBusinessSettings(db: Firestore, userId: string): Promise<ConfiguracoesNegocio | null> {
    const docRef = doc(db, `negocios/${userId}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ConfiguracoesNegocio;
    }
    return null;
}

export async function saveOrUpdateDocument(collectionName: string, docId: string, data: any, businessId?: string): Promise<void> {
  const db = await getDb();
  const path = businessId ? `negocios/${businessId}/${collectionName}/${docId}` : `${collectionName}/${docId}`;
  const docRef = doc(db, path);
  // Using await here for server-side actions, but can be used with non-blocking on client
  await setDoc(docRef, data, { merge: true });
}

export async function deleteDocumentByPath(db: Firestore, path: string): Promise<void> {
  const docRef = doc(db, path);
  // Non-blocking is fine for client-side initiated deletes
  deleteDocumentNonBlocking(docRef);
}

    