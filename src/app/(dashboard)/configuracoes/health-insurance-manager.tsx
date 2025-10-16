'use client';

import { useState, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, Heart } from 'lucide-react';
import type { PlanoSaude } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isCategoriaClinica } from '@/lib/categoria-utils';
import { useToast } from '@/hooks/use-toast';

interface HealthInsuranceManagerProps {
  categoria?: string;
}

export default function HealthInsuranceManager({ categoria }: HealthInsuranceManagerProps) {
  const { watch, setValue } = useFormContext();
  const { toast } = useToast();
  const [novoPlanoNome, setNovoPlanoNome] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const planosSaudeAceitos: PlanoSaude[] = watch('planosSaudeAceitos') || [];

  // Determinar se é uma categoria de clínica
  const isClinica = isCategoriaClinica(categoria);

  const adicionarPlano = () => {
    const nomeTrimmed = novoPlanoNome.trim();
    
    if (!nomeTrimmed) return;

    // Verificar se já existe um plano com esse nome
    if (planosSaudeAceitos.some(p => p.nome.toLowerCase() === nomeTrimmed.toLowerCase())) {
      toast({
        variant: "destructive",
        title: "Plano Duplicado",
        description: "Este plano já foi adicionado à lista!",
      });
      // Manter o input focado e limpar o campo
      setNovoPlanoNome('');
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    const novoPlano: PlanoSaude = {
      id: `plano_${Date.now()}`,
      nome: nomeTrimmed,
    };

    setValue('planosSaudeAceitos', [...planosSaudeAceitos, novoPlano], { shouldDirty: true });
    setNovoPlanoNome('');
    
    // Focar novamente no input após adicionar
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const removerPlano = (planoId: string) => {
    setValue(
      'planosSaudeAceitos',
      planosSaudeAceitos.filter((p) => p.id !== planoId),
      { shouldDirty: true }
    );
  };

  if (!isClinica) {
    return (
      <Alert>
        <AlertDescription>
          O gerenciamento de planos de saúde está disponível apenas para clínicas médicas, odontológicas,
          fisioterapia, nutrição e psicologia.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="novo-plano">Adicionar Plano de Saúde</Label>
          <p className="text-sm text-muted-foreground">
            Digite o nome do plano de saúde ou convênio que sua clínica aceita
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            ref={inputRef}
            id="novo-plano"
            placeholder="Ex: Unimed, Amil, SulAmérica..."
            value={novoPlanoNome}
            onChange={(e) => setNovoPlanoNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                adicionarPlano();
              }
            }}
            className="flex-1"
            maxLength={50}
          />
          <Button type="button" onClick={adicionarPlano} disabled={!novoPlanoNome.trim()} className="w-full sm:w-auto">
            <PlusCircle className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Lista de Planos Aceitos */}
      {planosSaudeAceitos.length > 0 && (
        <div className="space-y-3">
          <Label>Planos Aceitos ({planosSaudeAceitos.length})</Label>
          <div className="space-y-2">
            {planosSaudeAceitos.map((plano: PlanoSaude) => (
              <Card key={plano.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{plano.nome}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removerPlano(plano.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {planosSaudeAceitos.length === 0 && (
        <Alert>
          <AlertDescription>
            Nenhum plano cadastrado. Digite e adicione os planos de saúde/convênios que sua clínica aceita.
            Seus clientes poderão indicar qual plano possuem durante o agendamento.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
