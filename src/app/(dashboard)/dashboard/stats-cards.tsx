
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, CheckCircle, BarChart, DollarSign, TrendingUp, XCircle, Target } from "lucide-react"
import type { Agendamento, Cliente } from "@/lib/types"
import { useMemo } from "react"
import { isSameDay, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'

interface StatsCardsProps {
  appointments: Agendamento[];
  clients: Cliente[];
}

// Helper para formatar valores em moeda brasileira
const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

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


    // Calcular faturamento realizado (agendamentos finalizados)
    const revenueRealized = monthlyAppointments
      .filter(a => a.status === 'Finalizado')
      .reduce((sum, a) => sum + (a.servico?.price || 0), 0);
    
    // Calcular faturamento previsto (agendamentos agendados/confirmados)
    const revenuePending = monthlyAppointments
      .filter(a => a.status === 'Agendado')
      .reduce((sum, a) => sum + (a.servico?.price || 0), 0);
    
    // Calcular agendamentos cancelados no mês
    const canceledAppointments = monthlyAppointments.filter(a => a.status === 'Cancelado').length;
    
    // Calcular taxa de conclusão (% de finalizados do total)
    const completionRate = monthlyAppointments.length > 0 
      ? ((monthlyAppointments.filter(a => a.status === 'Finalizado').length / monthlyAppointments.length) * 100).toFixed(0)
      : 0;

    return {
      totalClients: clients.length,
      appointmentsToday: todaysAppointments.length,
      appointmentsThisMonth: monthlyAppointments.length,
      completedToday: todaysAppointments.filter(a => a.status === 'Finalizado').length,
      revenueRealized,
      revenuePending,
      canceledAppointments,
      completionRate,
    }
  }, [appointments, clients]);

  return (
    <>
      {/* Clientes Totais */}
      <Card className="col-span-full sm:col-span-1 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes Totais</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-4">
          <div className="text-4xl md:text-5xl font-bold mb-2">
             <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {stats.totalClients}
             </span>
          </div>
          <p className="text-xs text-center text-muted-foreground">Clientes cadastrados na sua base</p>
        </CardContent>
      </Card>
      
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
      
      {/* Faturamento Realizado */}
      <Card className="col-span-full sm:col-span-1 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Faturamento Realizado</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-4">
          <div className="text-3xl md:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              R$ {formatCurrency(stats.revenueRealized)}
            </span>
          </div>
          <p className="text-xs text-center text-muted-foreground">Agendamentos finalizados este mês</p>
        </CardContent>
      </Card>
      
      {/* Faturamento Previsto */}
      <Card className="col-span-full sm:col-span-1 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Faturamento Previsto</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-4">
          <div className="text-3xl md:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              R$ {formatCurrency(stats.revenuePending)}
            </span>
          </div>
          <p className="text-xs text-center text-muted-foreground">Agendamentos confirmados a receber</p>
        </CardContent>
      </Card>
      
      {/* Cancelamentos no Mês */}
      <Card className="col-span-full sm:col-span-1 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cancelamentos</CardTitle>
          <XCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-4">
          <div className="text-4xl md:text-5xl font-bold mb-2">
            <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
              {stats.canceledAppointments}
            </span>
          </div>
          <p className="text-xs text-center text-muted-foreground">Agendamentos cancelados este mês</p>
        </CardContent>
      </Card>
      
      {/* Taxa de Conclusão */}
      <Card className="col-span-full sm:col-span-1 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-4">
          <div className="text-4xl md:text-5xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
              {stats.completionRate}%
            </span>
          </div>
          <p className="text-xs text-center text-muted-foreground">Agendamentos finalizados do total</p>
        </CardContent>
      </Card>
    </>
  )
}
