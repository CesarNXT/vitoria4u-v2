"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Agendamento } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, ArrowUpDown, Pencil, Trash2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatPhoneNumber } from "@/lib/utils"
import { format, isDate } from "date-fns";

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
    cell: ({ row }) => {
      const cliente = row.original.cliente;
      const clientName = String(cliente.name || 'Cliente');
      const initials = clientName.charAt(0).toUpperCase();
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={cliente.avatarUrl || undefined} alt={clientName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{clientName}</span>
            <span className="text-xs text-muted-foreground">{formatPhoneNumber(String(cliente.phone))}</span>
          </div>
        </div>
      )
    },
    accessorFn: (row) => row.cliente.name,
  },
  {
    accessorKey: "servico",
    header: "Serviço",
    cell: ({ row }) => row.original.servico.name,
    accessorFn: (row) => row.servico.name,
  },
  {
    accessorKey: "profissional",
    header: "Profissional",
    cell: ({ row }) => row.original.profissional.name,
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
        <div className="flex items-center gap-2">
            {isAgendado && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => onFinalize(appointment)}
                title="Finalizar agendamento"
              >
                  <CheckCircle className="h-4 w-4" />
                  <span className="sr-only">Finalizar</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onEdit(appointment)}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Editar</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(appointment)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Excluir</span>
            </Button>
        </div>
      )
    },
  },
]
