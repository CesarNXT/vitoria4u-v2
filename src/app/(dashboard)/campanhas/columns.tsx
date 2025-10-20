"use client"

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Campanha, CampanhaStatus } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Eye, 
  Trash2,
  MessageSquare,
  Image,
  Mic,
  Video
} from "lucide-react";

// Status visual
const statusConfig: Record<CampanhaStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  "Agendada": { label: "Agendada", variant: "secondary" },
  "Em Andamento": { label: "Em Andamento", variant: "default" },
  "Concluída": { label: "Concluída", variant: "outline" },
  "Cancelada": { label: "Cancelada", variant: "destructive" },
  "Erro": { label: "Erro", variant: "destructive" },
};

export const columns: ColumnDef<Campanha>[] = [
  {
    accessorKey: "nome",
    header: "Nome",
    size: 250,
    cell: ({ row }) => {
      const nome = row.getValue("nome") as string;
      const tipo = row.original.tipo;

      // Ícone baseado no tipo
      const getIcon = () => {
        switch (tipo) {
          case 'texto':
            return <MessageSquare className="h-4 w-4 text-blue-500" />;
          case 'imagem':
            return <Image className="h-4 w-4 text-green-500" />;
          case 'audio':
            return <Mic className="h-4 w-4 text-purple-500" />;
          case 'video':
            return <Video className="h-4 w-4 text-red-500" />;
        }
      };

      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <span className="font-medium truncate">{nome}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "dataAgendamento",
    header: "Data/Hora",
    size: 150,
    cell: ({ row }) => {
      const data = row.getValue("dataAgendamento") as any;
      const hora = row.original.horaInicio;

      if (!data) return "-";

      const dataObj = data.toDate ? data.toDate() : new Date(data);

      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {format(dataObj, "dd/MM/yyyy", { locale: ptBR })}
          </span>
          <span className="text-sm text-muted-foreground">{hora}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 120,
    cell: ({ row }) => {
      const status = row.getValue("status") as CampanhaStatus;
      const config = statusConfig[status];

      return (
        <Badge variant={config.variant} className="flex-shrink-0">
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "progresso",
    header: "Progresso",
    size: 150,
    cell: ({ row }) => {
      const total = row.original.totalContatos;
      const enviados = row.original.contatosEnviados;
      const percentual = total > 0 ? Math.round((enviados / total) * 100) : 0;

      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{enviados} / {total}</span>
            <span className="font-medium">{percentual}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${percentual}%` }}
            />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "tempoEstimadoConclusao",
    header: "Tempo Est.",
    size: 100,
    cell: ({ row }) => {
      const tempo = row.getValue("tempoEstimadoConclusao") as string;
      return <span className="text-sm text-muted-foreground">{tempo || "-"}</span>;
    },
  },
  {
    id: "acoes",
    header: "Ações",
    size: 100,
    cell: ({ row, table }) => {
      const campanha = row.original;
      const meta = table.options.meta as any;

      return (
        <div className="flex items-center gap-2">
          {/* Botão Ver Detalhes */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => meta?.onView?.(campanha)}
            title="Ver detalhes"
          >
            <Eye className="h-4 w-4 text-blue-600" />
          </Button>

          {/* Botão Deletar - sempre visível */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-destructive/10"
            onClick={() => {
              if (campanha.status === 'Em Andamento') {
                meta?.onCancel?.(campanha);
              } else {
                meta?.onDelete?.(campanha);
              }
            }}
            title={campanha.status === 'Em Andamento' ? 'Cancelar campanha' : 'Deletar campanha'}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      );
    },
  },
];
