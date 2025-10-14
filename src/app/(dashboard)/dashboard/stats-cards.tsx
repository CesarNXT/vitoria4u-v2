
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, BarChart, XCircle, Target } from "lucide-react"
import type { Agendamento, Cliente } from "@/lib/types"
import { useMemo } from "react"
import { isSameDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

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

    // Calcular agendamentos cancelados no mês
    const canceledAppointments = monthlyAppointments.filter(a => a.status === 'Cancelado').length;
    
    // Calcular taxa de conclusão (% de finalizados do total)
    const completionRate = monthlyAppointments.length > 0 
      ? ((monthlyAppointments.filter(a => a.status === 'Finalizado').length / monthlyAppointments.length) * 100).toFixed(0)
      : 0;

    return {
      appointmentsToday: todaysAppointments.length,
      appointmentsThisMonth: monthlyAppointments.length,
      canceledAppointments,
      completionRate,
    }
  }, [appointments, clients]);

  return (
    <>
      {/* Agendamentos Hoje */}
      <Card className="col-span-full sm:col-span-1 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-4">
          <div className="text-4xl md:text-5xl font-bold mb-2">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {stats.appointmentsToday}
            </span>
          </div>
          <p className="text-xs text-center text-muted-foreground">Total de agendamentos para hoje</p>
        </CardContent>
      </Card>
       {/* Agendamentos no Mês */}
       <Card className="col-span-full sm:col-span-1 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Agendamentos no Mês</CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-4">
          <div className="text-4xl md:text-5xl font-bold mb-2">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {stats.appointmentsThisMonth}
            </span>
          </div>
          <p className="text-xs text-center text-muted-foreground">Total de agendamentos este mês</p>
        </CardContent>
      </Card>
      
      {/* Cancelamentos & Taxa de Conclusão Combinados */}
      <Card className="col-span-full sm:col-span-1 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Desempenho</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3 py-3">
          {/* Cancelamentos */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/50">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-muted-foreground">Cancelados</span>
            </div>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.canceledAppointments}
            </span>
          </div>
          
          {/* Taxa de Conclusão */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/50">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-muted-foreground">Taxa Conclusão</span>
            </div>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.completionRate}%
            </span>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
