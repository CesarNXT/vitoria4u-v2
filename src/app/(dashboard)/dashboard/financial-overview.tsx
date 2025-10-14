"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import type { Agendamento } from "@/lib/types"
import { useMemo } from "react"
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

interface FinancialOverviewProps {
  appointments: Agendamento[];
}

// Helper para formatar valores em moeda brasileira
const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export function FinancialOverview({ appointments }: FinancialOverviewProps) {
  
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
    
    const monthlyAppointments = appointments.filter(a => {
        const apptDate = toDate(a.date);
        return apptDate && isWithinInterval(apptDate, { start: monthStart, end: monthEnd });
    });

    // Faturamento realizado (agendamentos finalizados)
    const revenueRealized = monthlyAppointments
      .filter(a => a.status === 'Finalizado')
      .reduce((sum, a) => sum + (a.servico?.price || 0), 0);
    
    // Custos totais (apenas serviços finalizados que têm custo definido)
    const costsTotal = monthlyAppointments
      .filter(a => a.status === 'Finalizado')
      .reduce((sum, a) => sum + (a.servico?.custo || 0), 0);
    
    // Lucro líquido
    const netProfit = revenueRealized - costsTotal;
    
    // Margem de lucro (%)
    const profitMargin = revenueRealized > 0 
      ? ((netProfit / revenueRealized) * 100).toFixed(1)
      : '0.0';
    
    // Faturamento previsto (agendamentos confirmados)
    const revenuePending = monthlyAppointments
      .filter(a => a.status === 'Agendado')
      .reduce((sum, a) => sum + (a.servico?.price || 0), 0);

    return {
      revenueRealized,
      costsTotal,
      netProfit,
      profitMargin,
      revenuePending,
    }
  }, [appointments]);

  return (
    <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          💰 Visão Financeira do Mês
        </CardTitle>
        <p className="text-xs text-muted-foreground">Receitas, custos e lucro dos serviços finalizados</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          
          {/* Faturamento Realizado */}
          <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Faturamento</p>
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                R$ {formatCurrency(stats.revenueRealized)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">✓ Finalizados</p>
            </div>
          </div>

          {/* Custos Totais */}
          <div className="rounded-lg border bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Custos</p>
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                R$ {formatCurrency(stats.costsTotal)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">📦 Materiais</p>
            </div>
          </div>

          {/* Lucro Líquido */}
          <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Lucro Líquido</p>
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                R$ {formatCurrency(stats.netProfit)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                💚 Margem: {stats.profitMargin}%
              </p>
            </div>
          </div>

          {/* Faturamento Previsto */}
          <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">A Receber</p>
              <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                R$ {formatCurrency(stats.revenuePending)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">📅 Agendados</p>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  )
}
