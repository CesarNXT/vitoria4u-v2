'use client'

import type { ColumnDef } from '@tanstack/react-table';
import type { ConfiguracoesNegocio } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ArrowUpDown, AlertTriangle, Edit, Trash2, LogIn } from 'lucide-react';
import { format, differenceInDays, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAccessStatus, formatPhoneNumber } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

type BusinessesColumnsProps = {
  onEdit: (business: ConfiguracoesNegocio) => void;
  onDelete: (business: ConfiguracoesNegocio) => void;
};

// Função helper para copiar texto com fallback
const copyToClipboard = async (text: string, toast: any) => {
  try {
    // Método 1: Clipboard API moderna (funciona em HTTPS e localhost com permissão)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: "✅ ID Copiado!",
          description: `${text}`,
          duration: 3000,
        });
        return;
      } catch (clipboardError) {
        // Tentar fallback
      }
    }
    
    // Método 2: Fallback com textarea e selection
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Posicionar fora da tela mas ainda visível
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    
    document.body.appendChild(textArea);
    
    // Selecionar o texto
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      // iOS específico
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      textArea.setSelectionRange(0, 999999);
    } else {
      textArea.select();
    }
    
    // Tentar copiar
    let successful = false;
    try {
      successful = document.execCommand('copy');
    } catch (err) {
      // Falhou
    }
    
    document.body.removeChild(textArea);
    
    if (successful) {
      toast({
        title: "✅ ID Copiado!",
        description: `${text}`,
        duration: 3000,
      });
    } else {
      // Se tudo falhar, mostrar prompt para copiar manualmente
      // Criar modal visual para copiar manualmente
      const copyText = prompt('Copie o ID abaixo:', text);
      
      toast({
        title: "⚠️ Copie Manualmente",
        description: `ID: ${text}`,
        duration: 5000,
      });
    }
  } catch (error) {
    // Último recurso: mostrar em prompt
    prompt('Erro ao copiar automaticamente. Copie o ID:', text);
    
    toast({
      title: "❌ Erro ao copiar",
      description: "Use o prompt para copiar",
      variant: "destructive",
      duration: 5000,
    });
  }
};

export const getBusinessesColumns = ({ onEdit, onDelete }: BusinessesColumnsProps): ColumnDef<ConfiguracoesNegocio>[] => [
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
      return <BusinessActionsCell business={business} onEdit={onEdit} onDelete={onDelete} />;
    },
  },
];

// Componente separado para usar hooks
function BusinessActionsCell({ 
  business, 
  onEdit, 
  onDelete
}: { 
  business: ConfiguracoesNegocio; 
  onEdit: (business: ConfiguracoesNegocio) => void; 
  onDelete: (business: ConfiguracoesNegocio) => void;
}) {
  const { toast } = useToast();

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
        <DropdownMenuItem 
          onClick={async () => {
            try {
              const { startImpersonation } = await import('@/app/(public)/login/session-actions');
              await startImpersonation(business.id);
              
              toast({
                title: "✅ Acesso Concedido!",
                description: `Você está acessando como: ${business.nome}`,
              });
              
              // Redirecionar para o dashboard do usuário
              window.location.href = '/dashboard';
            } catch (error) {
              toast({
                title: "❌ Erro ao Acessar",
                description: "Não foi possível acessar como este usuário.",
                variant: "destructive",
              });
            }
          }}
          className="cursor-pointer text-primary font-medium"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Acessar como Usuário
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onEdit(business)} className="cursor-pointer">
          <Edit className="mr-2 h-4 w-4" />
          Editar Assinatura
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => copyToClipboard(business.id, toast)}
          className="cursor-pointer"
        >
          Copiar ID do Negócio
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onDelete(business)} 
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir Negócio
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
