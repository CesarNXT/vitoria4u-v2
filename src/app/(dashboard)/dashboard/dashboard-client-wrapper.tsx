
"use client";

import type { Agendamento, Cliente, ConfiguracoesNegocio, User } from '@/lib/types';
import { StatsCards } from './stats-cards';
import { UpcomingAppointments } from './upcoming-appointments';
import { RecentClients } from './recent-clients';
import { AppointmentsChart } from './appointments-chart';
import { WhatsappStatus } from './whatsapp-status';
import { DailyPhrase } from './daily-phrase';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';


interface DashboardClientWrapperProps {
  businessUserId: string;
}

export function DashboardClientWrapper({ businessUserId }: DashboardClientWrapperProps) {
  const { firestore } = useFirebase();

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, `negocios/${businessUserId}`) : null, [firestore, businessUserId]);
  const { data: settings, isLoading: isLoadingSettings } = useDoc<ConfiguracoesNegocio>(settingsRef);

  const appointmentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `negocios/${businessUserId}/agendamentos`), orderBy('date', 'desc')) : null, [firestore, businessUserId]);
  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Agendamento>(appointmentsQuery);

  const clientsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, `negocios/${businessUserId}/clientes`)) : null, [firestore, businessUserId]);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Cliente>(clientsQuery);
    
  const isLoading = isLoadingSettings || isLoadingAppointments || isLoadingClients;
  
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  // Ensure we have non-null arrays for the components
  const validAppointments = appointments || [];
  const validClients = clients || [];

  return (
    <>
       <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Frase Motivacional - Full Width */}
        <div className="col-span-full">
            <DailyPhrase />
        </div>

        {/* Linha 1: 4 cards principais - mesmo tamanho */}
        <div className="col-span-full sm:col-span-1 lg:col-span-1">
            <WhatsappStatus settings={settings} />
        </div>

        <StatsCards appointments={validAppointments} clients={validClients} />
        
        {/* Linha 2: Próximos Agendamentos e Clientes Recentes - lado a lado */}
        <div className="col-span-full lg:col-span-2">
            <UpcomingAppointments appointments={validAppointments} />
        </div>
        <div className="col-span-full lg:col-span-2">
            <RecentClients clients={validClients} />
        </div>
        
        {/* Linha 3: Visão Geral do Mês - Full Width por último */}
        <div className="col-span-full">
            <AppointmentsChart appointments={validAppointments} />
        </div>
      </div>
    </>
  );
}
