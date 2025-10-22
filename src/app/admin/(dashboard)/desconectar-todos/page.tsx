"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, ShieldAlert, Users, LogOut } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

export default function RevokeAllSessionsPage() {
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleRevoke = async () => {
    if (!password) {
      toast({
        title: "⚠️ Senha necessária",
        description: "Digite a senha administrativa",
        variant: "destructive"
      })
      return
    }

    const confirmMsg = "⚠️ ATENÇÃO! Isso vai desconectar TODOS os usuários do sistema. Confirma?"
    if (!confirm(confirmMsg)) return

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/revoke-all-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao revogar sessões')
      }

      setResult(data)
      
      toast({
        title: "✅ Sessões Revogadas",
        description: `${data.revokedCount} usuários foram desconectados`,
      })

      setPassword("")
    } catch (error) {
      console.error('Erro:', error)
      toast({
        title: "❌ Erro",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-red-500" />
          Desconectar Todos os Usuários
        </h1>
        <p className="text-muted-foreground mt-2">
          Ferramenta administrativa para forçar logout global
        </p>
      </div>

      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>⚠️ ATENÇÃO - AÇÃO IRREVERSÍVEL</AlertTitle>
        <AlertDescription>
          Esta ação irá revogar TODAS as sessões ativas no sistema.
          Todos os usuários (incluindo você) serão desconectados e precisarão fazer login novamente.
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Revogar Sessões
          </CardTitle>
          <CardDescription>
            Use esta ferramenta quando precisar:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Resolver problemas de login de usuários</li>
            <li>Forçar re-autenticação após mudanças críticas</li>
            <li>Limpar sessões corrompidas ou antigas</li>
            <li>Aplicar novas políticas de segurança</li>
          </ul>

          <div className="space-y-2 pt-4">
            <Label htmlFor="password">Senha Administrativa</Label>
            <Input
              id="password"
              type="password"
              placeholder="Digite a senha administrativa"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRevoke()}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              💡 Dica: A senha está definida na variável de ambiente ADMIN_SECRET_KEY
            </p>
          </div>

          <Button
            onClick={handleRevoke}
            disabled={isLoading || !password}
            variant="destructive"
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Revogando sessões...
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Desconectar Todos os Usuários
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              ✅ Operação Concluída
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Usuários Desconectados</p>
                <p className="text-2xl font-bold text-green-600">{result.revokedCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Total de Usuários</p>
                <p className="text-2xl font-bold">{result.totalUsers}</p>
              </div>
              {result.errorCount > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Erros</p>
                  <p className="text-2xl font-bold text-orange-600">{result.errorCount}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium">Data/Hora</p>
                <p className="text-sm">{new Date(result.timestamp).toLocaleString('pt-BR')}</p>
              </div>
            </div>

            <Alert className="mt-4">
              <Users className="h-4 w-4" />
              <AlertDescription>
                {result.message}
                <br />
                <strong>Próximos passos:</strong>
                <ul className="list-disc list-inside mt-2">
                  <li>Notifique os usuários sobre a desconexão</li>
                  <li>Peça para limparem o cache do navegador se necessário</li>
                  <li>Você também será desconectado em breve</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6 border-blue-500">
        <CardHeader>
          <CardTitle className="text-blue-600 flex items-center gap-2">
            💡 Instruções para Usuários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Se um usuário ainda tiver problemas após a revogação de sessões, oriente-o a:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Fazer logout manualmente (se conseguir)</li>
            <li>Limpar cookies do navegador para o site</li>
            <li>Limpar cache do navegador (Ctrl+Shift+Delete)</li>
            <li>Fechar e reabrir o navegador</li>
            <li>Fazer login novamente</li>
          </ol>
          <Alert className="mt-4">
            <AlertDescription className="text-xs">
              <strong>Navegadores:</strong><br/>
              • Chrome/Edge: chrome://settings/clearBrowserData<br/>
              • Firefox: about:preferences#privacy<br/>
              • Safari: Preferências → Privacidade → Gerenciar Dados de Sites
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
