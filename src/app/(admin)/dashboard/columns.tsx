
'use client'

import { type ColumnDef } from "@tanstack/react-table"
import type { ConfiguracoesNegocio } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ArrowUpDown, AlertTriangle, LogIn } from "lucide-react"
import { format, differenceInDays, isFuture } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getAccessStatus, formatPhoneNumber } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type AdminBusinessesColumnsProps = {
    onEdit: (business: ConfiguracoesNegocio) => void;
    onAccessPanel: (business: ConfiguracoesNegocio) => void;
};


export const getAdminBusinessesColumns = ({ onEdit, onAccessPanel }: AdminBusinessesColumnsProps): ColumnDef<ConfiguracoesNegocio>[] => [
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
                    <span className="font-medium">{business.nome || 'Não definido'}</span>
                    <span className="text-xs text-muted-foreground">{business.email}</span>
                </div>
            )
        }
    },
    {
        accessorKey: "telefone",
        header: "Telefone",
        cell: ({ row }) => {
            const business = row.original;
            return (
                <span>{formatPhoneNumber(String(business.telefone))}</span>
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
        accessorKey: "access_status",
        header: "Status do Acesso",
        cell: ({ row }) => {
            const status = getAccessStatus(row.original);
            return <Badge variant={status.variant}>{status.text}</Badge>
        }
    },
    {
        accessorKey: "access_expires_at",
        header: "Acesso Expira em",
        cell: ({ row }) => {
            const date = row.original.access_expires_at;
            if (!date) return "N/A";
            const dateObj = typeof date === 'string' ? new Date(date) : (date.toDate ? date.toDate() : date);
            
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
                        <DropdownMenuItem onClick={() => onAccessPanel(business)}>
                           <LogIn className="mr-2 h-4 w-4" />
                           Acessar Painel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(business)}>
                            Editar Assinatura
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
];
