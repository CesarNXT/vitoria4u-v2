
"use client"

import type { Cliente } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPhoneNumber } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

const statusVariantMap: { [key in Cliente['status']]: 'default' | 'destructive' } = {
  Ativo: 'default',
  Inativo: 'destructive',
};

const statusTraducao: { [key in Cliente['status']]: string } = {
  Ativo: 'Ativo',
  Inativo: 'Inativo',
};

interface ClientCardProps {
  client: Cliente;
  onEdit: (client: Cliente) => void;
  onDelete: (client: Cliente) => void;
}

export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  const clientName = String(client.name || 'Cliente');
  const initials = clientName.charAt(0).toUpperCase();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={client.avatarUrl || undefined} alt={clientName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{clientName}</p>
            <p className="text-sm text-muted-foreground">{formatPhoneNumber(String(client.phone))}</p>
          </div>
        </div>
         <Badge variant={statusVariantMap[client.status]} className={client.status === 'Ativo' ? 'bg-green-500/20 text-green-700' : ''}>{statusTraducao[client.status]}</Badge>
      </CardHeader>
      <CardFooter className="flex justify-end gap-2 pb-4 px-4">
        <Button variant="outline" size="sm" onClick={() => onEdit(client)}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50" onClick={() => onDelete(client)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </Button>
      </CardFooter>
    </Card>
  )
}

    