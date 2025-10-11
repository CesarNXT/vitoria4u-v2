
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Cliente } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatPhoneNumber } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from 'date-fns'

type ColumnsProps = {
  onEdit: (client: Cliente) => void;
  onDelete: (client: Cliente) => void;
}

const statusVariantMap: { [key in Cliente['status']]: 'default' | 'destructive' } = {
  Ativo: 'default',
  Inativo: 'destructive',
};

const statusTraducao: { [key in Cliente['status']]: string } = {
  Ativo: 'Ativo',
  Inativo: 'Inativo',
};

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Cliente>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nome
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const client = row.original;
      const clientName = String(client.name || 'Cliente');
      const initials = clientName.charAt(0).toUpperCase();
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={client.avatarUrl || undefined} alt={clientName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{clientName}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "phone",
    header: "Telefone",
    cell: ({ row }) => formatPhoneNumber(String(row.original.phone)),
  },
  {
    accessorKey: "birthDate",
    header: "Data de Nascimento",
    cell: ({ row }) => {
        const date = row.original.birthDate;
        try {
            if (date) {
                // Assuming date is a Firestore Timestamp or a string that can be converted to Date
                const dateObj = date.toDate ? date.toDate() : new Date(date);
                if (!isNaN(dateObj.getTime())) {
                    return format(dateObj, 'dd/MM/yyyy');
                }
            }
            return 'N/A';
        } catch (error) {
            return 'Data inválida';
        }
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = statusVariantMap[status];
      const className = status === 'Ativo' ? 'bg-green-500/20 text-green-700' : '';
      return <Badge variant={variant} className={className}>{statusTraducao[status]}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const client = row.original
 
      return (
        <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(client)}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Editar</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(client)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Excluir</span>
            </Button>
        </div>
      )
    },
  },
]
