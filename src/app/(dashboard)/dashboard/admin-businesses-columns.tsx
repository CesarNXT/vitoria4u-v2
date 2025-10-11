
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { ConfiguracoesNegocio } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ArrowUpDown, AlertTriangle } from "lucide-react"
import { format, differenceInDays, isFuture } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getSubscriptionStatus } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type AdminBusinessesColumnsProps = {
    onEdit: (business: ConfiguracoesNegocio) => void;
    onDelete: (business: ConfiguracoesNegocio) => void;
};


export const getAdminBusinessesColumns = ({ onEdit, onDelete }: AdminBusinessesColumnsProps): ColumnDef<ConfiguracoesNegocio>[] => [
    {
        accessorKey: "nome",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Negócio
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const business = row.original;
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{business.nome}</span>
                    <span className="text-xs text-muted-foreground">{business.email}</span>
                </div>
            )
        }
    },
    {
        accessorKey: "planId",
        header: "Plano",
        cell: ({ row }) => {
            const planId = row.original.planId || "N/A";
            const formattedPlan = planId.replace('plano_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return <Badge variant="secondary">{formattedPlan}</Badge>
        }
    },
    {
        accessorKey: "mp.status",
        header: "Status Assinatura",
        cell: ({ row }) => {
            const status = getSubscriptionStatus(row.original.mp?.status || 'pending');
            return <Badge variant={status.variant}>{status.text}</Badge>
        }
    },
    {
        accessorKey: "access_expires_at",
        header: "Acesso Expira em",
        cell: ({ row }) => {
            const date = row.original.access_expires_at;
            if (!date) return "N/A";
            const dateObj = typeof date === 'string' ? new Date(date) : date.toDate();
            
            const today = new Date();
            const daysUntilExpiration = differenceInDays(dateObj, today);
            const isExpiringSoon = isFuture(dateObj) && (daysUntilExpiration <= 7);
            
            const formattedDate = format(dateObj, "dd/MM/yyyy", { locale: ptBR });

            if (isExpiringSoon) {
                 return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 text-yellow-600 font-medium">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>{formattedDate}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Expira em {daysUntilExpiration} dia(s).</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            }

            return formattedDate;
        }
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const business = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit(business)}>
                            Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(business.id)}>
                            Copiar ID
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDelete(business)}
                        >
                            Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
];
