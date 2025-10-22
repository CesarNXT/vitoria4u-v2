"use client"

import type { Agendamento } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPhoneNumber } from "@/lib/utils";
import { CalendarIcon, Clock, Settings, User, Pencil, Trash2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AppointmentCardProps {
  appointment: Agendamento;
  onEdit: (appointment: Agendamento) => void;
  onDelete: (appointment: Agendamento) => void;
  onFinalize: (appointment: Agendamento) => void;
}

const statusVariantMap: { [key in Agendamento['status']]: "info" | "success" | "danger" } = {
  Agendado: 'info',
  Finalizado: 'success',
  Cancelado: 'danger',
};

const statusTraducao: { [key in Agendamento['status']]: string } = {
  Agendado: 'Agendado',
  Finalizado: 'Finalizado',
  Cancelado: 'Cancelado',
};

export function AppointmentCard({ appointment, onEdit, onDelete, onFinalize }: AppointmentCardProps) {
  const { cliente, servico, profissional, date, startTime, status } = appointment;
  const variant = statusVariantMap[status];
  const className = '';
  const clientName = String(cliente.name || 'Cliente');
  const initials = clientName.charAt(0).toUpperCase();
  
  const formattedDate = () => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Data inválida';
    return format(dateObj, 'dd/MM/yyyy', { timeZone: 'UTC' } as any);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <Avatar className="flex-shrink-0">
            <AvatarImage src={cliente.avatarUrl || undefined} alt={clientName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="font-semibold line-clamp-2 break-all cursor-help" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{clientName}</p>
                </TooltipTrigger>
                {clientName.length > 25 && (
                  <TooltipContent>
                    <p className="break-all" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{clientName}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <p className="text-sm text-muted-foreground truncate">{formatPhoneNumber(String(cliente.phone))}</p>
          </div>
        </div>
         <Badge variant={variant} className={`${className} flex-shrink-0`}>{statusTraducao[status]}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm pb-4">
        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
            <Settings className="h-4 w-4 flex-shrink-0" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="line-clamp-1 break-all cursor-help" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{servico.name}</span>
                </TooltipTrigger>
                {servico.name.length > 30 && (
                  <TooltipContent>
                    <p className="break-all" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{servico.name}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
            <User className="h-4 w-4 flex-shrink-0" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="line-clamp-1 break-all cursor-help" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{profissional.name}</span>
                </TooltipTrigger>
                {profissional.name.length > 25 && (
                  <TooltipContent>
                    <p className="break-all" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{profissional.name}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
        </div>
        <div className="grid grid-cols-2 gap-2">
             <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>{formattedDate()}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{startTime}</span>
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 pb-4 px-4">
        <div className="flex w-full gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(appointment)}>
            <Pencil className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50" onClick={() => onDelete(appointment)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir
          </Button>
        </div>
        {status === 'Agendado' && (
          <Button 
            variant="default"
            size="sm" 
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onFinalize(appointment)}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Finalizar Agendamento
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
