
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Servico } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatServicePrice } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
    size: 200,
    cell: ({ row }) => {
      const service = row.original;
      const serviceName = String(service.name || 'Serviço');
      const initials = serviceName.charAt(0).toUpperCase();
      return (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10 rounded-md flex-shrink-0">
            <AvatarImage src={service.imageUrl || undefined} alt={serviceName} className="object-cover" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-medium truncate cursor-help">{serviceName}</span>
              </TooltipTrigger>
              {serviceName.length > 30 && (
                <TooltipContent>
                  <p>{serviceName}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
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
      const className = status === 'Ativo' ? 'bg-green-500/20 text-green-700 dark:bg-green-500/20 dark:text-green-400' : '';
      return <Badge variant={variant} className={className}>{status}</Badge>
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const service = row.original
      return (
        <TooltipProvider>
          <div className="flex items-center justify-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => onEdit(service)}>
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
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50" onClick={() => onDelete(service)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Excluir</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Excluir</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )
    },
  },
]
