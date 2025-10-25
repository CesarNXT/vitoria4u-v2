"use client"

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Trash2,
  Play,
  Pause
} from "lucide-react";

// Tipos UAZAPI
type UazapiCampanhaStatus = 'scheduled' | 'sending' | 'paused' | 'done' | 'deleting';

interface UazapiCampanha {
  id: string;
  nome: string;
  status: UazapiCampanhaStatus;
  totalContatos: number;
  contatosEnviados: number;
  criadaEm?: number;
}

// Status visual
const statusConfig: Record<UazapiCampanhaStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  "scheduled": { label: "Agendada", variant: "secondary" },
  "sending": { label: "Enviando", variant: "default" },
  "paused": { label: "Pausada", variant: "outline" },
  "done": { label: "Concluída", variant: "outline" },
  "deleting": { label: "Deletando", variant: "destructive" },
};

export const uazapiColumns: ColumnDef<UazapiCampanha>[] = [
  {
    accessorKey: "nome",
    header: "Nome",
    size: 250,
    cell: ({ row }) => {
      const nome = row.getValue("nome") as string;

      return (
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{nome}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 140,
    cell: ({ row }) => {
      const status = row.getValue("status") as UazapiCampanhaStatus;
      const config = statusConfig[status];

      return (
        <div className="flex justify-center">
          <Badge variant={config.variant} className="flex-shrink-0">
            {config.label}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "progresso",
    header: "Progresso",
    size: 200,
    cell: ({ row }) => {
      const total = row.original.totalContatos;
      const enviados = row.original.contatosEnviados;
      const percentual = total > 0 ? Math.round((enviados / total) * 100) : 0;

      return (
        <div className="space-y-1.5 min-w-[160px]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">{enviados} de {total}</span>
            <span className="font-semibold text-foreground">{percentual}%</span>
          </div>
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${percentual}%` }}
            />
          </div>
        </div>
      );
    },
  },
  {
    id: "acoes",
    header: "Ações",
    size: 150,
    cell: ({ row, table }) => {
      const campanha = row.original;
      const meta = table.options.meta as any;
      const canPause = campanha.status === 'sending' || campanha.status === 'scheduled';
      const canResume = campanha.status === 'paused';

      return (
        <div className="flex items-center justify-center gap-1">
          {/* Botão Ver Detalhes */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-blue-50"
            onClick={() => meta?.onView?.(campanha)}
            title="Ver detalhes"
          >
            <Eye className="h-4 w-4 text-blue-600" />
          </Button>

          {/* Botão Pausar */}
          {canPause && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-orange-50"
              onClick={() => meta?.onPause?.(campanha)}
              title="Pausar campanha"
            >
              <Pause className="h-4 w-4 text-orange-600" />
            </Button>
          )}

          {/* Botão Continuar */}
          {canResume && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-green-50"
              onClick={() => meta?.onContinue?.(campanha)}
              title="Continuar campanha"
            >
              <Play className="h-4 w-4 text-green-600" />
            </Button>
          )}

          {/* Botão Deletar */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-50"
            onClick={() => meta?.onDelete?.(campanha)}
            title="Deletar campanha"
            disabled={campanha.status === 'deleting'}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      );
    },
  },
];
