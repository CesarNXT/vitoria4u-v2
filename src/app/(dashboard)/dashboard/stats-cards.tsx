
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, CheckCircle, BarChart } from "lucide-react"
import type { Agendamento, Cliente } from "@/lib/types"
import { useMemo } from "react"
import { isSameDay, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'

interface StatsCardsProps {
  appointments: Agendamento[];
  clients: Cliente[];
}

export function StatsCards({ appointments, clients }: StatsCardsProps) {
  
  const stats = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Helper to safely create a Date object
    const toDate = (date: any): Date | null => {
        if (!date) return null;
        if (date.toDate) return date.toDate(); // Firestore Timestamp
        return new Date(date); // ISO string or existing Date object
    };
    
    const todaysAppointments = appointments.filter(a => {
        const apptDate = toDate(a.date);
        return apptDate && isSameDay(apptDate, today);
    });
    
    const monthlyAppointments = appointments.filter(a => {
        const apptDate = toDate(a.date);
        return apptDate && isWithinInterval(apptDate, { start: monthStart, end: monthEnd });
    });


    return {
      totalClients: clients.length,
      appointmentsToday: todaysAppointments.length,
      appointmentsThisMonth: monthlyAppointments.length,
      completedToday: todaysAppointments.filter(a => a.status === 'Finalizado').length,
    }
  }, [appointments, clients]);

  return (
    <>
      <Card className="col-span-full sm:col-span-1 lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes Totais</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
             <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {stats.totalClients}
             </span>
          </div>
          <p className="text-xs text-muted-foreground">Clientes cadastrados na sua base.</p>
        </CardContent>
      </Card>
      <Card className="col-span-full sm:col-span-1 lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {stats.appointmentsToday}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Total de agendamentos para hoje.</p>
        </CardContent>
      </Card>
       <Card className="col-span-full sm:col-span-2 lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Agendamentos no Mês</CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {stats.appointmentsThisMonth}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Total de agendamentos este mês.</p>
        </CardContent>
      </Card>
    </>
  )
}
