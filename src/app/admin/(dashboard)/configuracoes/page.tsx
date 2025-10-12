'use client'

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { SystemConfig, Plano } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Shield, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getDocs } from 'firebase/firestore';

interface AdminUser {
  uid: string;
  email: string;
  isAdmin: boolean;
}

export default function ConfiguracoesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [plans, setPlans] = useState<Plano[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
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

        // Buscar admins
        const adminsSnapshot = await getDocs(collection(firestore, 'admin'));
        const adminsData = adminsSnapshot.docs
          .map(doc => ({ uid: doc.id, ...doc.data() } as AdminUser))
          .filter(admin => admin.isAdmin);
        setAdmins(adminsData);

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

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({ variant: 'destructive', title: 'Digite um email válido' });
      return;
    }

    setIsAddingAdmin(true);
    try {
      const response = await fetch('/api/admin/manage-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newAdminEmail, action: 'add' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao adicionar admin');
      }

      setAdmins([...admins, { uid: result.uid, email: result.email, isAdmin: true }]);
      setNewAdminEmail('');
      
      toast({
        title: 'Admin Adicionado!',
        description: `${result.email} agora é administrador.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (uid: string, email: string) => {
    if (admins.length === 1) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Deve haver pelo menos um administrador no sistema.',
      });
      return;
    }

    if (!confirm(`Remover ${email} como administrador?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/manage-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, action: 'remove' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao remover admin');
      }

      setAdmins(admins.filter(a => a.uid !== uid));
      
      toast({
        title: 'Admin Removido',
        description: `${email} não é mais administrador.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
        <p className="text-sm md:text-base text-muted-foreground">Gerencie as configurações globais da plataforma</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciar Administradores
          </CardTitle>
          <CardDescription>
            Adicione ou remova usuários administradores do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddAdmin()}
            />
            <Button onClick={handleAddAdmin} disabled={isAddingAdmin}>
              {isAddingAdmin ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Administradores Ativos ({admins.length})</Label>
            {admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum administrador cadastrado</p>
            ) : (
              <div className="divide-y rounded-md border">
                {admins.map((admin) => (
                  <div
                    key={admin.uid}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{admin.email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAdmin(admin.uid, admin.email)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {admins.length === 0 && (
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-950 p-3">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                ⚠️ Primeiro Admin - Configure o hook
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                1. Adicione seu email acima<br />
                2. Abra <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">src/hooks/use-admin-sync.ts</code><br />
                3. Adicione seu email na lista <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">ADMIN_EMAILS</code><br />
                4. Faça logout e login novamente
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> O usuário deve já ter feito login no sistema ao menos uma vez para ser adicionado como admin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
