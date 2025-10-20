
"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Cliente } from "@/lib/types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatPhoneNumber } from "@/lib/utils"

interface RecentClientsProps {
  clients: Cliente[];
}

export function RecentClients({ clients }: RecentClientsProps) {
  const recentClients = clients.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes Recentes</CardTitle>
        <CardDescription>
          Os últimos 5 clientes cadastrados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {recentClients.length > 0 ? recentClients.map((client) => {
            const clientName = String(client.name || 'Cliente');
            const initials = clientName.charAt(0).toUpperCase();
            
            return (
              <div key={client.id} className="flex items-center gap-2 min-w-0">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={client.avatarUrl || undefined} alt="Avatar" />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="ml-2 space-y-1 min-w-0 flex-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm font-medium leading-none truncate cursor-help">{clientName}</p>
                      </TooltipTrigger>
                      {clientName.length > 25 && (
                        <TooltipContent>
                          <p>{clientName}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <p className="text-sm text-muted-foreground">{formatPhoneNumber(String(client.phone))}</p>
                </div>
              </div>
            );
          }) : (
            <p className="text-sm text-muted-foreground text-center pt-4">Nenhum cliente cadastrado ainda.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
