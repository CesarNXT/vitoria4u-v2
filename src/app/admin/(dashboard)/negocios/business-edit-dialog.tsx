'use client'

import { useState, useEffect } from 'react';
import type { ConfiguracoesNegocio, Plano } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StandardDatePicker } from '@/components/ui/standard-date-picker';
import { format, addDays, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface BusinessEditDialogProps {
  business: ConfiguracoesNegocio;
  plans: Plano[];
  onSave: (businessId: string, updates: { planId?: string; access_expires_at?: Date }) => void;
  onCancel: () => void;
}

export function BusinessEditDialog({ business, plans, onSave, onCancel }: BusinessEditDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState(business.planId);
  const [expirationDate, setExpirationDate] = useState<Date>(() => {
    if (business.access_expires_at) {
      const date = business.access_expires_at;
      return typeof date === 'string' ? new Date(date) : (date.toDate ? date.toDate() : date);
    }
    return new Date();
  });

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleSave = () => {
    const updates: { planId?: string; access_expires_at?: Date } = {};
    
    if (selectedPlanId !== business.planId) {
      updates.planId = selectedPlanId;
    }
    
    const currentExpiration = business.access_expires_at;
    const currentDate = typeof currentExpiration === 'string' 
      ? new Date(currentExpiration) 
      : (currentExpiration?.toDate ? currentExpiration.toDate() : currentExpiration);
    
    if (expirationDate.getTime() !== currentDate?.getTime()) {
      updates.access_expires_at = expirationDate;
    }

    if (Object.keys(updates).length > 0) {
      onSave(business.id, updates);
    } else {
      onCancel();
    }
  };

  const quickDateActions = [
    { label: '+7 dias', action: () => setExpirationDate(addDays(new Date(), 7)) },
    { label: '+15 dias', action: () => setExpirationDate(addDays(new Date(), 15)) },
    { label: '+1 mês', action: () => setExpirationDate(addMonths(new Date(), 1)) },
    { label: '+3 meses', action: () => setExpirationDate(addMonths(new Date(), 3)) },
    { label: '+6 meses', action: () => setExpirationDate(addMonths(new Date(), 6)) },
    { label: '+1 ano', action: () => setExpirationDate(addMonths(new Date(), 12)) },
  ];

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Editar Assinatura</DialogTitle>
          <DialogDescription className="text-sm">
            Altere o plano e a data de expiração de <strong>{business.nome}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações Atuais */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Informações Atuais</p>
                  <p className="text-muted-foreground">
                    Plano: <span className="font-medium">{business.planId?.replace('plano_', '').replace(/_/g, ' ')}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Expira em: <span className="font-medium">
                      {business.access_expires_at 
                        ? format(
                            typeof business.access_expires_at === 'string' 
                              ? new Date(business.access_expires_at) 
                              : (business.access_expires_at.toDate ? business.access_expires_at.toDate() : business.access_expires_at),
                            "dd/MM/yyyy",
                            { locale: ptBR }
                          )
                        : 'Não definida'
                      }
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Plano */}
          <div className="space-y-2">
            <Label htmlFor="plan">Novo Plano</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger id="plan">
                <SelectValue placeholder="Selecione um plano" />
              </SelectTrigger>
              <SelectContent>
                {plans.filter(p => p.id !== 'plano_expirado').map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{plan.name}</span>
                      {plan.price > 0 && (
                        <span className="text-muted-foreground text-sm">
                          R$ {plan.price.toFixed(2)}/mês
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPlan && selectedPlan.description && (
              <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
            )}
          </div>

          {/* Seleção de Data */}
          <div className="space-y-2">
            <Label>Nova Data de Expiração</Label>
            <StandardDatePicker
              value={expirationDate}
              onChange={(date) => {
                if (date) {
                  setExpirationDate(date);
                }
              }}
              placeholder="Selecione uma data"
              isMobile={false}
              fromYear={new Date().getFullYear()}
              toYear={new Date().getFullYear() + 5}
              className="w-full"
            />
          </div>

          {/* Ações Rápidas */}
          <div className="space-y-2">
            <Label>Ações Rápidas</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickDateActions.map((action) => (
                <Button
                  key={action.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={action.action}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-1 text-sm">
                <p className="font-medium">Preview das Alterações:</p>
                {selectedPlanId !== business.planId && (
                  <p className="text-muted-foreground">
                    • Plano será alterado para: <span className="font-medium text-foreground">
                      {selectedPlan?.name}
                    </span>
                  </p>
                )}
                <p className="text-muted-foreground">
                  • Nova data de expiração: <span className="font-medium text-foreground">
                    {format(expirationDate, "PPP", { locale: ptBR })}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="w-full sm:w-auto">
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
