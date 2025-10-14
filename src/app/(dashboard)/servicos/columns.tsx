
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Servico } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatServicePrice } from "@/lib/utils"

type ColumnsProps = {
  onEdit: (service: Servico) => void;
  onDelete: (service: Servico) => void;
}

const statusVariantMap: { [key in Servico['status']]: 'default' | 'destructive' } = {
  Ativo: 'default',
  Inativo: 'destructive',
};

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Servico>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Nome
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const service = row.original;
      const serviceName = String(service.name || 'Serviço');
      const initials = serviceName.charAt(0).toUpperCase();
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-md">
            <AvatarImage src={service.imageUrl || undefined} alt={serviceName} className="object-cover" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{serviceName}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "price",
    header: "Preço",
    cell: ({ row }) => formatServicePrice(row.original.price, row.original.priceType),
  },
  {
    accessorKey: "duration",
    header: "Duração",
    cell: ({ row }) => `${row.original.duration} min`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = statusVariantMap[status];
      const className = status === 'Ativo' ? 'bg-accent text-accent-foreground' : '';
      return <Badge variant={variant} className={className}>{status}</Badge>
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const service = row.original
      return (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(service)}>
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Editar</span>
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(service)}>
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Excluir</span>
          </Button>
        </div>
      )
    },
  },
]
