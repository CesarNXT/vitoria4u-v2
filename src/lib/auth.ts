"use server";

import { doc, getDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { verifySession } from './session';
import type { User } from './types';

/**
 * 🔒 SEGURANÇA CORRIGIDA: Agora usa validação server-side
 * O session cookie é verificado com Firebase Admin SDK
 */
export async function getInitialUser(): Promise<User | null> {
    try {
        // ✅ Validar session cookie com Admin SDK
        const decodedToken = await verifySession();
        
        if (!decodedToken) {
            return null;
        }

        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        if (!app) {
            throw new Error('Failed to initialize Firebase app');
        }
        const firestore = getFirestore(app);
        
        const userDocRef = doc(firestore, 'users', decodedToken.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            return {
                uid: decodedToken.uid,
                email: decodedToken.email || '',
                ...userDoc.data()
            } as User;
        }

        // Buscar em negocios se não encontrar em users
        const businessDocRef = doc(firestore, 'negocios', decodedToken.uid);
        const businessDoc = await getDoc(businessDocRef);
        
        if (businessDoc.exists()) {
            return {
                uid: decodedToken.uid,
                email: decodedToken.email || '',
                name: businessDoc.data().nome || decodedToken.email?.split('@')[0] || '',
                role: 'business'
            };
        }

        return {
            uid: decodedToken.uid,
            email: decodedToken.email || '',
            name: decodedToken.email?.split('@')[0] || 'Usuário',
            role: 'business'
        };

    } catch (error) {
        console.error("Error getting initial user:", error);
        return null;
    }
}