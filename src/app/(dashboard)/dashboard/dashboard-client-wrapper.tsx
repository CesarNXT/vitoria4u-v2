
"use client";

import type { Agendamento, Cliente, ConfiguracoesNegocio, User } from '@/lib/types';
import { StatsCards } from './stats-cards';
import { UpcomingAppointments } from './upcoming-appointments';
import { RecentClients } from './recent-clients';
import { AppointmentsChart } from './appointments-chart';
import { WhatsappStatus } from './whatsapp-status';
import { DailyPhrase } from './daily-phrase';
import { FinancialOverview } from './financial-overview';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

// Utility function to serialize Firestore Timestamps to plain objects
function serializeTimestamps<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Timestamp) {
    return obj.toDate() as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeTimestamps(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeTimestamps((obj as any)[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}


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

  // Serialize Firestore Timestamps to plain objects
  const serializedSettings = serializeTimestamps(settings);
  const serializedAppointments = serializeTimestamps(appointments || []);
  const serializedClients = serializeTimestamps(clients || []);

  return (
    <>
       <div className="flex items-center justify-between space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {serializedSettings?.nome || 'Dashboard'}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Frase Motivacional - Full Width */}
        <div className="col-span-full">
            <DailyPhrase />
        </div>

        {/* Linha 1: WhatsApp + 3 cards gerais */}
        <div className="col-span-full sm:col-span-1 lg:col-span-1">
            <WhatsappStatus settings={serializedSettings} />
        </div>

        <StatsCards appointments={serializedAppointments} clients={serializedClients} />
        
        {/* Seção Financeira - Full Width com destaque */}
        <div className="col-span-full">
            <FinancialOverview appointments={serializedAppointments} />
        </div>
        
        {/* Linha 2: Próximos Agendamentos e Clientes Recentes */}
        <div className="col-span-full lg:col-span-2">
            <UpcomingAppointments appointments={serializedAppointments} />
        </div>
        <div className="col-span-full lg:col-span-2">
            <RecentClients clients={serializedClients} />
        </div>
        
        {/* Linha 3: Gráfico de Visão Geral - Full Width */}
        <div className="col-span-full">
            <AppointmentsChart appointments={serializedAppointments} />
        </div>
      </div>
    </>
  );
}
