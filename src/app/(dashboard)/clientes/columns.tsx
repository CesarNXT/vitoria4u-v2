
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Cliente } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Pencil, Trash2, FileText } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatPhoneNumber } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from 'date-fns'

// Ícone do WhatsApp
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

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
    size: 250, // Largura máxima da coluna
    cell: ({ row }) => {
      const client = row.original;
      const clientName = String(client.name || 'Cliente');
      const initials = clientName.charAt(0).toUpperCase();
      return (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={client.avatarUrl || undefined} alt={clientName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-medium truncate cursor-help">{clientName}</span>
              </TooltipTrigger>
              {clientName.length > 30 && (
                <TooltipContent>
                  <p>{clientName}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
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
      const className = status === 'Ativo' ? 'bg-green-500/20 text-green-700 dark:bg-green-500/20 dark:text-green-400' : '';
      return <Badge variant={variant} className={className}>{statusTraducao[status]}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "observacoes",
    header: "Observações",
    cell: ({ row }) => {
      const observacoes = row.original.observacoes;
      if (!observacoes) {
        return <span className="text-muted-foreground text-sm">-</span>;
      }
      const truncated = observacoes.length > 50 ? `${observacoes.substring(0, 50)}...` : observacoes;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-start gap-2 max-w-[200px] cursor-help">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-sm line-clamp-2">{truncated}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="text-sm whitespace-pre-wrap">{observacoes}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const client = row.original
      
      const handleWhatsAppClick = () => {
        const phone = String(client.phone);
        // Remove caracteres não numéricos
        const cleanPhone = phone.replace(/\D/g, '');
        // Garante que tem 13 dígitos (55 + DDD + número)
        const phoneWithCountryCode = cleanPhone.length === 13 ? cleanPhone : 
                                     cleanPhone.length === 11 ? `55${cleanPhone}` :
                                     cleanPhone;
        // Abre WhatsApp Web em nova aba
        window.open(`https://wa.me/${phoneWithCountryCode}`, '_blank');
      };
 
      return (
        <div className="flex items-center justify-end gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleWhatsAppClick}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 border-green-600/30"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    <span className="sr-only">Chamar no WhatsApp</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Chamar no WhatsApp</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => onEdit(client)}>
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
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50" onClick={() => onDelete(client)}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Excluir</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Excluir</p>
              </TooltipContent>
            </Tooltip>
        </div>
      )
    },
  },
]
