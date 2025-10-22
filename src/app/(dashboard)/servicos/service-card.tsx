
"use client"

import type { Servico } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Clock, Tag, Repeat } from "lucide-react";
import { formatServicePrice } from "@/lib/utils";

interface ServiceCardProps {
  service: Servico;
  onEdit: (service: Servico) => void;
  onDelete: (service: Servico) => void;
}

const statusVariantMap: { [key in Servico['status']]: 'default' | 'destructive' } = {
  Ativo: 'default',
  Inativo: 'destructive',
};

const statusTraducao: { [key in Servico['status']]: string } = {
  Ativo: 'Ativo',
  Inativo: 'Inativo',
};

export function ServiceCard({ service, onEdit, onDelete }: ServiceCardProps) {
  const { name, price, priceType, duration, status, imageUrl, returnInDays } = service;
  const serviceName = String(name || 'Serviço');
  const initials = serviceName.charAt(0).toUpperCase();

  const formattedPrice = formatServicePrice(price, priceType);
  const formattedDuration = `${duration} min`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <Avatar className="h-10 w-10 rounded-md flex-shrink-0">
            <AvatarImage src={imageUrl || undefined} alt={serviceName} className="object-cover" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold line-clamp-2 break-all" title={serviceName} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{serviceName}</p>
          </div>
        </div>
         <Badge variant={statusVariantMap[status]} className={status === 'Ativo' ? 'bg-green-500/20 text-green-700 dark:bg-green-500/20 dark:text-green-400 flex-shrink-0' : 'flex-shrink-0'}>{statusTraducao[status]}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm pb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
            <Tag className="h-4 w-4" />
            <span>{formattedPrice}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formattedDuration}</span>
        </div>
         {returnInDays && (
           <div className="flex items-center gap-2 text-muted-foreground">
              <Repeat className="h-4 w-4" />
              <span>Retorno em {returnInDays} dias</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2 pb-4 px-4">
        <Button variant="outline" size="sm" onClick={() => onEdit(service)} className="flex-shrink-0">
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50 flex-shrink-0" onClick={() => onDelete(service)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </Button>
      </CardFooter>
    </Card>
  )
}
