'use client'

import { useState, useEffect } from 'react';
import type { Plano, PlanFeature } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Lista completa de todas as features possíveis
const allFeatures: { id: PlanFeature; label: string }[] = [
  { id: 'lembrete_24h', label: 'Lembrete 24h' },
  { id: 'lembrete_2h', label: 'Lembrete 2h' },
  { id: 'feedback_pos_atendimento', label: 'Feedback Pós-Atendimento' },
  { id: 'lembrete_aniversario', label: 'Lembrete de Aniversário' },
  { id: 'lembrete_profissional', label: 'Lembrete para Profissional' },
  { id: 'disparo_de_mensagens', label: 'Campanhas' },
  { id: 'retorno_manutencao', label: 'Lembrete de Retorno' },
  { id: 'notificacao_gestor_agendamento', label: 'Aviso de Agendamento/Cancelamento' },
  { id: 'notificacao_cliente_agendamento', label: 'Confirmação para o Cliente' },
  { id: 'atendimento_whatsapp_ia', label: 'Atendimento com IA' },
  { id: 'escalonamento_humano', label: 'Escalonamento Humano' },
];

interface AdminPlanFormProps {
  plan: Plano | null;
  onSave: (updatedPlan: Partial<Plano>) => void;
  onCancel: () => void;
}

export function AdminPlanForm({ plan, onSave, onCancel }: AdminPlanFormProps) {
  const [formData, setFormData] = useState<Partial<Plano>>({});

  useEffect(() => {
    setFormData(plan || {});
  }, [plan]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      // Checkbox para features
      if (name === 'isFeatured') {
        setFormData({ ...formData, isFeatured: checked });
      } else {
        const currentFeatures = formData.features || [];
        const newFeatures = checked
          ? [...currentFeatures, name as PlanFeature]
          : currentFeatures.filter(feature => feature !== name);
        setFormData({ ...formData, features: newFeatures });
      }
    } else if (type === 'number') {
      // Campos numéricos (price, oldPrice)
      setFormData({ ...formData, [name]: value ? parseFloat(value) : undefined });
    } else {
      // Campos de texto (name, description, mercadoPagoId)
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!plan) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Plano: {plan.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Plano</Label>
            <Input id="name" name="name" value={formData.name || ''} onChange={handleInputChange} required />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input id="description" name="description" value={formData.description || ''} onChange={handleInputChange} placeholder="Ex: Automações essenciais para economizar tempo" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Preço Mensal (R$)</Label>
              <Input id="price" name="price" type="number" step="0.01" min="0" value={formData.price || 0} onChange={handleInputChange} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="oldPrice">Preço Antigo (opcional)</Label>
              <Input id="oldPrice" name="oldPrice" type="number" step="0.01" min="0" value={formData.oldPrice || ''} onChange={handleInputChange} placeholder="Para mostrar desconto" />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="durationInDays">Duração do Acesso (dias)</Label>
            <Input 
              id="durationInDays" 
              name="durationInDays" 
              type="number" 
              min="1" 
              value={formData.durationInDays || 30} 
              onChange={handleInputChange} 
              required 
            />
            <p className="text-xs text-muted-foreground">
              Quantos dias de acesso o cliente ganha ao comprar este plano (ex: 30 para mensal, 365 para anual).
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isFeatured" 
              name="isFeatured" 
              checked={formData.isFeatured || false}
              onCheckedChange={(checked) => handleInputChange({
                target: { name: 'isFeatured', checked: !!checked, type: 'checkbox' }
              } as any)}
            />
            <Label htmlFor="isFeatured" className="font-normal">Marcar como "Mais Popular" (destaque visual)</Label>
          </div>
          
          <div>
            <Label>Funcionalidades Incluídas</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2 p-4 border rounded-md">
              {allFeatures.map(({ id, label }) => (
                <div key={id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={id} 
                    name={id} 
                    checked={formData.features?.includes(id)} 
                    onCheckedChange={(checked) => handleInputChange({
                      target: { name: id, checked: !!checked, type: 'checkbox' }
                    } as any)}
                  />
                  <Label htmlFor={id} className="font-normal text-sm sm:text-base">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">Cancelar</Button>
            <Button type="submit" className="w-full sm:w-auto">Salvar Alterações</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
