'use client'

import type { ColumnDef } from '@tanstack/react-table';
import type { ConfiguracoesNegocio } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ArrowUpDown, AlertTriangle, LogIn, Edit, ExternalLink } from 'lucide-react';
import { format, differenceInDays, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAccessStatus, formatPhoneNumber } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

type BusinessesColumnsProps = {
  onEdit: (business: ConfiguracoesNegocio) => void;
  onAccessPanel: (business: ConfiguracoesNegocio) => void;
};

export const getBusinessesColumns = ({ onEdit, onAccessPanel }: BusinessesColumnsProps): ColumnDef<ConfiguracoesNegocio>[] => [
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
      );
    },
    filterFn: (row, id, value) => {
      const business = row.original;
      const searchValue = value.toLowerCase();
      return (
        business.nome?.toLowerCase().includes(searchValue) ||
        business.email?.toLowerCase().includes(searchValue) ||
        false
      );
    },
  },
  {
    accessorKey: "telefone",
    header: "Telefone",
    cell: ({ row }) => {
      const business = row.original;
      return <span className="text-sm">{formatPhoneNumber(business.telefone?.toString())}</span>;
    }
  },
  {
    accessorKey: "planId",
    header: "Plano Atual",
    cell: ({ row }) => {
      const planId = row.original.planId || "N/A";
      const formattedPlan = planId.replace('plano_', '').replace(/_/g, ' ');
      
      // Cores baseadas no tipo de plano
      let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
      if (planId.includes('premium') || planId.includes('avancado')) {
        variant = "default";
      } else if (planId.includes('expirado')) {
        variant = "destructive";
      }
      
      return <Badge variant={variant} className="capitalize">{formattedPlan}</Badge>;
    }
  },
  {
    accessorKey: "access_status",
    header: "Status",
    cell: ({ row }) => {
      const status = getAccessStatus(row.original);
      return <Badge variant={status.variant}>{status.text}</Badge>;
    }
  },
  {
    accessorKey: "access_expires_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Expira em
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.original.access_expires_at;
      if (!date) return <span className="text-muted-foreground">N/A</span>;
      
      const dateObj = typeof date === 'string' ? new Date(date) : (date.toDate ? date.toDate() : date);
      
      // Valida se a data é válida
      if (isNaN(dateObj.getTime())) {
        return <span className="text-muted-foreground">Data inválida</span>;
      }
      
      const today = new Date();
      const daysUntilExpiration = differenceInDays(dateObj, today);
      const isExpiringSoon = isFuture(dateObj) && (daysUntilExpiration <= 7);
      const isExpired = !isFuture(dateObj);
      
      const formattedDate = format(dateObj, "dd/MM/yyyy", { locale: ptBR });

      if (isExpired) {
        return (
          <div className="flex items-center gap-2 text-destructive font-medium">
            <span>{formattedDate}</span>
          </div>
        );
      }

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
                <p>Expira em {daysUntilExpiration} dia(s)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return <span>{formattedDate}</span>;
    }
  },
  {
    accessorKey: "createdAt",
    header: "Cadastrado em",
    cell: ({ row }) => {
      const date = row.original.createdAt;
      if (!date) return "N/A";
      const dateObj = typeof date === 'string' ? new Date(date) : (date.toDate ? date.toDate() : date);
      return <span className="text-sm text-muted-foreground">{format(dateObj, "dd/MM/yyyy", { locale: ptBR })}</span>;
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
            <DropdownMenuItem onClick={() => onAccessPanel(business)} className="cursor-pointer">
              <LogIn className="mr-2 h-4 w-4" />
              Acessar Painel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(business)} className="cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              Editar Assinatura
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => navigator.clipboard.writeText(business.id)}
              className="cursor-pointer"
            >
              Copiar ID do Negócio
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/agendar/${business.id}`} target="_blank" className="cursor-pointer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver Página Pública
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
