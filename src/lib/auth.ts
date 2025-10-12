
import { cookies } from 'next/headers';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { User } from './types';

export async function getInitialUser(): Promise<User | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
        return null;
    }
    
    try {
        // In a real app, you would verify the session cookie with Firebase Admin SDK
        // For this mock, we will assume the cookie is a JSON representation of the user
        const decodedToken = JSON.parse(sessionCookie);

        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        const firestore = getFirestore(app);
        
        const userDocRef = doc(firestore, 'users', decodedToken.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            return {
                uid: decodedToken.uid,
                email: decodedToken.email,
                ...userDoc.data()
            } as User;
        }

        return {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name || decodedToken.email.split('@')[0],
            role: 'business'
        };

    } catch (error) {
        console.error("Error decoding session cookie:", error);
        return null;
    }
}

    