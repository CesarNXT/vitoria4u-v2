
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, UserX } from "lucide-react"
import type { Cliente } from "@/lib/types"
import { useMemo } from "react"

interface ClientStatsCardsProps {
  clients: Cliente[];
}

export function ClientStatsCards({ clients }: ClientStatsCardsProps) {
  
  const stats = useMemo(() => {
    return {
      totalClients: clients.length,
      activeClients: clients.filter(c => c.status === 'Ativo').length,
      inactiveClients: clients.filter(c => c.status === 'Inativo').length,
    }
  }, [clients]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes Totais</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalClients}</div>
          <p className="text-xs text-muted-foreground">Total de clientes na sua base de dados.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeClients}</div>
          <p className="text-xs text-muted-foreground">Clientes que podem receber campanhas.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes Inativos</CardTitle>
          <UserX className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.inactiveClients}</div>
          <p className="text-xs text-muted-foreground">Clientes que não recebem mais mensagens.</p>
        </CardContent>
      </Card>
    </div>
  )
}
