
"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Agendamento } from "@/lib/types"
import { isAfter, isToday, startOfToday, format } from "date-fns"
import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface UpcomingAppointmentsProps {
  appointments: Agendamento[];
}

export function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
  
  const upcomingAppointments = useMemo(() => {
    const today = startOfToday()
    return appointments
      .filter(appt => {
        if (appt.status !== 'Agendado') return false;
        // Handle both Timestamps and Date objects/strings
        const apptDate = appt.date?.toDate ? appt.date.toDate() : new Date(appt.date);
        return isToday(apptDate) || isAfter(apptDate, today);
      })
      .sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        const timeA = a.startTime;
        const timeB = b.startTime;

        if (dateA.getTime() !== dateB.getTime()) {
           return dateA.getTime() - dateB.getTime();
        }
        return timeA.localeCompare(timeB);
      })
      .slice(0, 5)
  }, [appointments])

  const getFormattedDate = (date: any) => {
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      if (isNaN(dateObj.getTime())) return "Data Inválida";
      return format(dateObj, 'dd/MM');
    } catch {
      return "Data Inválida";
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximos Agendamentos</CardTitle>
        <CardDescription>
          Seus próximos 5 agendamentos confirmados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {upcomingAppointments.length > 0 ? upcomingAppointments.map((appt) => {
            const clientName = String(appt.cliente.name || 'Cliente');
            const initials = clientName.charAt(0).toUpperCase();
            return (
            <div key={appt.id} className="flex items-center gap-2 min-w-0">
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarImage src={appt.cliente.avatarUrl || undefined} alt={clientName} />
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm text-muted-foreground truncate cursor-help">{appt.servico.name}</p>
                    </TooltipTrigger>
                    {appt.servico.name.length > 25 && (
                      <TooltipContent>
                        <p>{appt.servico.name}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="ml-auto text-right flex-shrink-0">
                 <Badge variant="secondary" className="font-medium whitespace-nowrap">{getFormattedDate(appt.date)}</Badge>
                 <p className="text-sm font-medium">{appt.startTime}</p>
              </div>
            </div>
            );
          }) : (
             <p className="text-sm text-muted-foreground text-center pt-4">Nenhum agendamento futuro encontrado.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
