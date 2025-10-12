import { useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';

/**
 * Hook para sincronizar documento admin automaticamente
 * Cria/atualiza o documento quando admin fizer login
 */
export function useAdminSync() {
    const { user, firestore } = useFirebase();

    useEffect(() => {
        async function syncAdmin() {
            if (!user || !firestore) return;

            // Lista de emails que são admins (configure aqui)
            const ADMIN_EMAILS = [
                'admin@vitoria4u.com',
                'contato@vitoria4u.com',
                // Adicione outros emails admin aqui
            ];

            // Verificar se o email do usuário está na lista
            if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
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
