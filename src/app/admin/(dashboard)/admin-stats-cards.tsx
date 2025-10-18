
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, UserCheck, UserX, AlertCircle } from "lucide-react"
import type { ConfiguracoesNegocio } from "@/lib/types"
import { useMemo } from "react"
import { isFuture, subDays, differenceInDays } from "date-fns"

interface AdminStatsCardsProps {
  businesses: ConfiguracoesNegocio[];
}

export function AdminStatsCards({ businesses }: AdminStatsCardsProps) {
  
  const stats = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);

    return {
      total: businesses.length,
      newThisWeek: businesses.filter(b => {
          const createdAt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return createdAt >= sevenDaysAgo;
      }).length,
      activePlans: businesses.filter(b => b.access_expires_at && isFuture(new Date(b.access_expires_at))).length,
      expiredPlans: businesses.filter(b => !b.access_expires_at || !isFuture(new Date(b.access_expires_at))).length,
      expiringSoon: businesses.filter(b => {
        if (!b.access_expires_at) return false;
        const expirationDate = b.access_expires_at.toDate ? b.access_expires_at.toDate() : new Date(b.access_expires_at);
        if (!isFuture(expirationDate)) return false;
        const daysUntilExpiration = differenceInDays(expirationDate, today);
        return daysUntilExpiration > 0 && daysUntilExpiration <= 15;
      }).length,
    }
  }, [businesses]);

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Negócios Totais</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">Total de contas na plataforma.</p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Novos na Semana</CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{stats.newThisWeek}</div>
          <p className="text-xs text-muted-foreground">Novas contas nos últimos 7 dias.</p>
        </CardContent>
      </Card>
       <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activePlans}</div>
          <p className="text-xs text-muted-foreground">Contas com assinatura ou trial válidos.</p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Planos Expirados</CardTitle>
          <UserX className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.expiredPlans}</div>
          <p className="text-xs text-muted-foreground">Contas que precisam de renovação.</p>
        </CardContent>
      </Card>
      <Card className="w-full border-amber-200 dark:border-amber-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expirando em 15 dias</CardTitle>
          <AlertCircle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.expiringSoon}</div>
          <p className="text-xs text-muted-foreground">Contas que precisam atenção.</p>
        </CardContent>
      </Card>
    </div>
  )
}
