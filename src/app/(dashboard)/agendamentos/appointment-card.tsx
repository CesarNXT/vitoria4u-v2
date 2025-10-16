"use client"

import type { Agendamento } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPhoneNumber } from "@/lib/utils";
import { CalendarIcon, Clock, Settings, User, Pencil, Trash2, CheckCircle } from "lucide-react";
import { format } from "date-fns";

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={cliente.avatarUrl || undefined} alt={clientName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{clientName}</p>
            <p className="text-sm text-muted-foreground">{formatPhoneNumber(String(cliente.phone))}</p>
          </div>
        </div>
         <Badge variant={variant} className={className}>{statusTraducao[status]}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm pb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
            <Settings className="h-4 w-4" />
            <span>{servico.name}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{profissional.name}</span>
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
