
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, UserCheck, UserX } from "lucide-react"
import type { ConfiguracoesNegocio } from "@/lib/types"
import { useMemo } from "react"
import { isFuture, subDays } from "date-fns"

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
    }
  }, [businesses]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Negócios Totais</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">Total de contas na plataforma.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Novos na Semana</CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{stats.newThisWeek}</div>
          <p className="text-xs text-muted-foreground">Novas contas nos últimos 7 dias.</p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activePlans}</div>
          <p className="text-xs text-muted-foreground">Contas com assinatura ou trial válidos.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Planos Expirados</CardTitle>
          <UserX className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.expiredPlans}</div>
          <p className="text-xs text-muted-foreground">Contas que precisam de renovação.</p>
        </CardContent>
      </Card>
    </div>
  )
}
