"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Agendamento } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, ArrowUpDown, Pencil, Trash2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatPhoneNumber } from "@/lib/utils"
import { format, isDate } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type ColumnsProps = {
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

export const getColumns = ({ onEdit, onDelete, onFinalize }: ColumnsProps): ColumnDef<Agendamento>[] => [
  {
    accessorKey: "cliente.name",
    header: "Cliente",
    id: 'clientName',
    size: 220,
    cell: ({ row }) => {
      const cliente = row.original.cliente;
      const clientName = String(cliente.name || 'Cliente');
      const initials = clientName.charAt(0).toUpperCase();
      return (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={cliente.avatarUrl || undefined} alt={clientName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate cursor-help">{clientName}</span>
                  <span className="text-xs text-muted-foreground">{formatPhoneNumber(String(cliente.phone))}</span>
                </div>
              </TooltipTrigger>
              {clientName.length > 25 && (
                <TooltipContent>
                  <p>{clientName}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    },
    accessorFn: (row) => row.cliente.name,
  },
  {
    accessorKey: "servico",
    header: "Serviço",
    size: 180,
    cell: ({ row }) => {
      const serviceName = row.original.servico.name;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block cursor-help max-w-[200px]">{serviceName}</span>
            </TooltipTrigger>
            {serviceName.length > 30 && (
              <TooltipContent>
                <p>{serviceName}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
    },
    accessorFn: (row) => row.servico.name,
  },
  {
    accessorKey: "profissional",
    header: "Profissional",
    size: 150,
    cell: ({ row }) => {
      const professionalName = row.original.profissional.name;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block cursor-help max-w-[180px]">{professionalName}</span>
            </TooltipTrigger>
            {professionalName.length > 25 && (
              <TooltipContent>
                <p>{professionalName}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
    },
    accessorFn: (row) => row.profissional.name,
  },
  {
    accessorKey: "date",
    header: "Data",
    cell: ({ row }) => {
      const date = row.original.date;
       if (!date) return 'N/A';
      
      const dateObj = isDate(date) ? date : new Date(date);
      if (isNaN(dateObj.getTime())) {
          return 'Data inválida';
      }
      return format(dateObj, 'dd/MM/yyyy');
    },
  },
  {
    accessorKey: "startTime",
    header: "Hora",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = statusVariantMap[status];
      const className = '';
      return <Badge variant={variant} className={className}>{statusTraducao[status]}</Badge>
    }
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }) => {
      const appointment = row.original
      const isAgendado = appointment.status === 'Agendado';
 
      return (
        <TooltipProvider>
          <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => onEdit(appointment)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Editar</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50" onClick={() => onDelete(appointment)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Excluir</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Excluir</p>
                </TooltipContent>
              </Tooltip>
              {isAgendado && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-600/30"
                      onClick={() => onFinalize(appointment)}
                    >
                        <CheckCircle className="h-4 w-4" />
                        <span className="sr-only">Finalizar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Finalizar agendamento</p>
                  </TooltipContent>
                </Tooltip>
              )}
          </div>
        </TooltipProvider>
      )
    },
  },
]
