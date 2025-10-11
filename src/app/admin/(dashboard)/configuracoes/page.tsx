'use client'

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { SystemConfig, Plano } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getDocs } from 'firebase/firestore';

export default function ConfiguracoesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [plans, setPlans] = useState<Plano[]>([]);
  const [config, setConfig] = useState<SystemConfig>({
    id: 'global',
    trial: {
      enabled: true,
      days: 3,
      planId: 'plano_premium'
    }
  });

  useEffect(() => {
    if (!firestore) return;

    const fetchData = async () => {
      try {
        // Buscar configurações
        const configRef = doc(firestore, 'configuracoes_sistema', 'global');
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
          setConfig(configSnap.data() as SystemConfig);
        } else {
          // Criar config padrão se não existir
          await setDoc(configRef, config);
        }

        // Buscar planos (exceto gratuito)
        const plansSnapshot = await getDocs(collection(firestore, 'planos'));
        const plansData = plansSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Plano))
          .filter(plan => plan.id !== 'plano_gratis' && plan.id !== 'plano_expirado' && plan.price > 0)
          .sort((a, b) => a.price - b.price);
        setPlans(plansData);

        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        toast({ variant: 'destructive', title: 'Erro ao carregar configurações' });
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore]);

  const handleSave = async () => {
    if (!firestore) return;

    setIsSaving(true);
    try {
      const configRef = doc(firestore, 'configuracoes_sistema', 'global');
      await setDoc(configRef, config);
      
      toast({
        title: 'Configurações Salvas!',
        description: 'As configurações foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar as configurações.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
          <p className="text-muted-foreground">Gerencie as configurações globais da plataforma</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Período de Teste Gratuito
          </CardTitle>
          <CardDescription>
            Configure o período de teste oferecido aos novos negócios cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="trial-enabled">Ativar período de teste</Label>
              <p className="text-sm text-muted-foreground">
                Novos negócios recebem acesso temporário a um plano premium
              </p>
            </div>
            <Switch
              id="trial-enabled"
              checked={config.trial.enabled}
              onCheckedChange={(checked) => 
                setConfig({ 
                  ...config, 
                  trial: { ...config.trial, enabled: checked } 
                })
              }
            />
          </div>

          {config.trial.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="trial-days">Duração do teste (dias)</Label>
                <Input
                  id="trial-days"
                  type="number"
                  min="1"
                  max="30"
                  value={config.trial.days}
                  onChange={(e) => 
                    setConfig({ 
                      ...config, 
                      trial: { ...config.trial, days: parseInt(e.target.value) || 1 } 
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Número de dias que o teste ficará ativo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trial-plan">Plano oferecido no teste</Label>
                <Select
                  value={config.trial.planId}
                  onValueChange={(value) => 
                    setConfig({ 
                      ...config, 
                      trial: { ...config.trial, planId: value } 
                    })
                  }
                >
                  <SelectTrigger id="trial-plan">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - R$ {plan.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Qual plano os novos negócios terão durante o teste
                </p>
              </div>
            </>
          )}

          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Configurações'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
