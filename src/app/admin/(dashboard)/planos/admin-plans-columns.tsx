'use client'

import type { Plano } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GetAdminPlansColumnsProps {
  onEdit: (plan: Plano) => void;
}

export const getAdminPlansColumns = ({ onEdit }: GetAdminPlansColumnsProps): ColumnDef<Plano>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Nome do Plano
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'price',
    header: () => <div className="text-right">Preço</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('price'));
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const plan = row.original;
      return (
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => onEdit(plan)}>
          <span className="sr-only">Editar Plano</span>
          <Pencil className="h-4 w-4" />
        </Button>
      );
    },
  },
];
