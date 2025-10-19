import { useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { isAdminUser } from '@/lib/utils';

/**
 * Hook para sincronizar documento admin automaticamente
 * Cria/atualiza o documento quando admin fizer login
 */
export function useAdminSync() {
    const { user, firestore } = useFirebase();

    useEffect(() => {
        async function syncAdmin() {
            if (!user || !firestore || !user.email) return;

            // Usa a mesma função de verificação do sistema
            const isAdmin = isAdminUser(user.email);

            // Verificar se o email do usuário é admin
            if (isAdmin) {
                try {
                    const adminRef = doc(firestore, 'admin', user.uid);
                    const adminDoc = await getDoc(adminRef);

                    // Se não existe ou não tem isAdmin, criar/atualizar
                    if (!adminDoc.exists() || !adminDoc.data()?.isAdmin) {
                        await setDoc(adminRef, {
                            email: user.email,
                            isAdmin: true,
                            lastLoginAt: new Date(),
                            updatedAt: new Date(),
                        }, { merge: true });

                        console.log('Documento admin criado/atualizado para:', user.email);
                    }
                } catch (error) {
                    console.error('Erro ao sincronizar admin:', error);
                }
            }
        }

        syncAdmin();
    }, [user, firestore]);
}
