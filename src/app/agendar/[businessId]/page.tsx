

import { 
    getCollectionData
} from '@/lib/firestore';
import type { Cliente, Servico, Profissional, Agendamento, ConfiguracoesNegocio, DataBloqueada } from '@/lib/types';
import { initializeFirebase } from '@/firebase';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import BookingClient from './booking-client';
import { Logo } from '@/components/logo';
import { Card, CardContent } from '@/components/ui/card';
import { Link2Off } from 'lucide-react';
import { convertTimestamps } from '@/lib/utils';


async function getBusinessData(businessId: string) {
    // This server-side firebase initialization is different from the client-side one
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');
    const { firebaseConfig } = await import('@/firebase/config');

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const firestore = getFirestore(app);

    const settingsDocRef = doc(firestore, `negocios/${businessId}`);
    const settingsDoc = await getDoc(settingsDocRef);

    if (!settingsDoc.exists()) {
        throw new Error("Link de agendamento inválido ou negócio não encontrado.");
    }
    const settingsData = { id: settingsDoc.id, ...settingsDoc.data() };

    const clientsCollection = await getDocs(collection(firestore, `negocios/${businessId}/clientes`));
    const servicesCollection = await getDocs(collection(firestore, `negocios/${businessId}/servicos`));
    const professionalsCollection = await getDocs(collection(firestore, `negocios/${businessId}/profissionais`));
    const appointmentsCollection = await getDocs(collection(firestore, `negocios/${businessId}/agendamentos`));
    const blockedDatesCollection = await getDocs(collection(firestore, `negocios/${businessId}/datasBloqueadas`));

    return {
        settings: convertTimestamps(settingsData),
        clients: convertTimestamps(clientsCollection.docs.map(d => ({id: d.id, ...d.data()}))),
        services: convertTimestamps(servicesCollection.docs.map(d => ({id: d.id, ...d.data()}))),
        professionals: convertTimestamps(professionalsCollection.docs.map(d => ({id: d.id, ...d.data()}))),
        appointments: convertTimestamps(appointmentsCollection.docs.map(d => ({id: d.id, ...d.data()}))),
        blockedDates: convertTimestamps(blockedDatesCollection.docs.map(d => ({id: d.id, ...d.data()}))),
    };
}


export default async function PublicBookingPage({ params }: { params: Promise<{ businessId: string }> }) {
    
    const { businessId } = await params;

    try {
        const initialData = await getBusinessData(businessId);

        return (
            <BookingClient
                businessId={businessId}
                initialSettings={initialData.settings as ConfiguracoesNegocio}
                initialClients={initialData.clients as Cliente[]}
                initialServices={initialData.services as Servico[]}
                initialProfessionals={initialData.professionals as Profissional[]}
                initialAppointments={initialData.appointments as Agendamento[]}
                initialBlockedDates={initialData.blockedDates as DataBloqueada[]}
            />
        );

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        return (
             <div className="flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden relative">
                <div className="animated-blob animated-blob-squash absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 h-96 w-96 transform-gpu rounded-full bg-gradient-to-tr from-primary to-accent opacity-30 blur-3xl animate-blob-move" />
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
                    <Logo />
                </div>
                <Card className="w-full max-w-2xl shadow-xl mt-20 z-10 animate-fade-in-up">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4 flex flex-col items-center p-4">
                            <Link2Off className="h-16 w-16 text-destructive" />
                            <h2 className="text-2xl font-semibold">Página Indisponível</h2>
                            <p className="text-muted-foreground max-w-sm">
                            Não foi possível carregar a página de agendamento. Verifique o link ou entre em contato com o estabelecimento.
                            </p>
                            <p className="text-xs text-muted-foreground pt-4">Detalhes: {errorMessage}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
}
