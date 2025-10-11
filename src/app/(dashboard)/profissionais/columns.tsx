
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Profissional } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatPhoneNumber } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"

type ColumnsProps = {
  onEdit: (professional: Profissional) => void;
  onDelete: (professional: Profissional) => void;
}

const statusVariantMap: { [key in Profissional['status']]: 'default' | 'secondary' | 'destructive' } = {
  Ativo: 'default',
  Inativo: 'destructive',
};

const statusTraducao: { [key in Profissional['status']]: string } = {
  Ativo: 'Ativo',
  Inativo: 'Inativo',
};

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Profissional>[] => [
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
      const professional = row.original;
      const profName = String(professional.name || 'Profissional');
      const initials = profName.charAt(0).toUpperCase();
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={professional.avatarUrl || undefined} alt={profName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{profName}</span>
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = statusVariantMap[status];
      const className = status === 'Ativo' ? 'bg-accent text-accent-foreground' : '';
      return <Badge variant={variant} className={className}>{statusTraducao[status]}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const professional = row.original
 
      return (
        <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(professional)}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Editar</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(professional)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Excluir</span>
            </Button>
        </div>
      )
    },
  },
]

    