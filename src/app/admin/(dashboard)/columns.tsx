
'use client'

import type { ColumnDef } from '@tanstack/react-table'
import type { ConfiguracoesNegocio, User } from '@/lib/types'
import { MoreHorizontal, ArrowUpDown, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { getAccessStatus, getSubscriptionStatus } from '@/lib/utils'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const getColumns = (impersonate: (userId: string) => void): ColumnDef<ConfiguracoesNegocio>[] => [
    {
        id: 'select',
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'nome',
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                Negócio
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const business = row.original
            return (
                <div className="font-medium">{business.nome}</div>
            )
        }
    },
    {
        accessorKey: 'email',
        header: 'Email',
    },
    {
        accessorKey: 'planId',
        header: 'Plano',
        cell: ({ row }) => {
            const planId = row.getValue('planId') as string;
            const formatted = planId.replace('plano_', '').replace(/_/g, ' ');
            return <div className="capitalize">{formatted}</div>
        }
    },
    {
        accessorKey: 'mp.status',
        header: 'Status Assinatura',
        cell: ({ row }) => {
            const status = row.original.mp?.status;
            if (!status) return <Badge variant="secondary">N/A</Badge>
            const { text, variant } = getSubscriptionStatus(status);
            return <Badge variant={variant}>{text}</Badge>
        }
    },
    {
        accessorKey: 'access_expires_at',
        header: 'Acesso Expira',
        cell: ({ row }) => {
            const date = row.getValue('access_expires_at') as Date | undefined;
            if (!date) return "N/A";
            return format(new Date(date), 'dd/MM/yyyy');
        }
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const business = row.original

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(business.id)}>
                            Copiar ID do Negócio
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => impersonate(business.id)}>
                            Acessar como Cliente
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link href={`/agendar/${business.id}`} target="_blank">
                                Ver Página de Agendamento <ExternalLink className="ml-2 h-4 w-4"/>
                           </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
