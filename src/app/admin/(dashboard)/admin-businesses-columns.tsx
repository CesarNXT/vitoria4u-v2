
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { ConfiguracoesNegocio } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, AlertTriangle, LogIn, CreditCard, Trash2 } from "lucide-react"
import { format, differenceInDays, isFuture } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getAccessStatus, formatPhoneNumber } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type AdminBusinessesColumnsProps = {
    onEdit?: (business: ConfiguracoesNegocio) => void;
    onAccessPanel: (business: ConfiguracoesNegocio) => void;
    onDelete?: (business: ConfiguracoesNegocio) => void;
};


export const getAdminBusinessesColumns = ({ onEdit, onAccessPanel, onDelete }: AdminBusinessesColumnsProps): ColumnDef<ConfiguracoesNegocio>[] => [
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
                <div className="flex items-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => onAccessPanel(business)}>
                                    <span className="sr-only">Acessar Painel</span>
                                    <LogIn className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Acessar Painel do Cliente</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    {onEdit && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => onEdit(business)}>
                                        <span className="sr-only">Editar Assinatura</span>
                                        <CreditCard className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Editar Assinatura</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {onDelete && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" onClick={() => onDelete(business)}>
                                        <span className="sr-only">Excluir Negócio</span>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Excluir Negócio</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            )
        },
    },
];
