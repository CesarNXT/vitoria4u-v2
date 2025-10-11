
"use client"

import type { Profissional } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPhoneNumber } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

const statusVariantMap: { [key in Profissional['status']]: 'default' | 'destructive' } = {
  Ativo: 'default',
  Inativo: 'destructive',
};

const statusTraducao: { [key in Profissional['status']]: string } = {
  Ativo: 'Ativo',
  Inativo: 'Inativo',
};

interface ProfessionalCardProps {
  professional: Profissional;
  onEdit: (professional: Profissional) => void;
  onDelete: (professional: Profissional) => void;
}

export function ProfessionalCard({ professional, onEdit, onDelete }: ProfessionalCardProps) {
  const profName = String(professional.name || 'Profissional');
  const initials = profName.charAt(0).toUpperCase();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={professional.avatarUrl || undefined} alt={profName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{profName}</p>
            <p className="text-sm text-muted-foreground">{formatPhoneNumber(String(professional.phone))}</p>
          </div>
        </div>
         <Badge variant={statusVariantMap[professional.status]} className={professional.status === 'Ativo' ? 'bg-accent text-accent-foreground' : ''}>{statusTraducao[professional.status]}</Badge>
      </CardHeader>
      <CardFooter className="flex justify-end gap-2 pb-4 px-4">
        <Button variant="outline" size="sm" onClick={() => onEdit(professional)}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50" onClick={() => onDelete(professional)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </Button>
      </CardFooter>
    </Card>
  )
}

    