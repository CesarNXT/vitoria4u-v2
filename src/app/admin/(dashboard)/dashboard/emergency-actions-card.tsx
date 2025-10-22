"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, ShieldAlert, LogOut } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function EmergencyActionsCard() {
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
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

    const confirmMsg = "⚠️ ATENÇÃO! Isso vai desconectar TODOS os usuários do sistema (incluindo você). Confirma?"
    if (!confirm(confirmMsg)) return

    setIsLoading(true)

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

      toast({
        title: "✅ Sessões Revogadas",
        description: `${data.revokedCount} usuários foram desconectados com sucesso`,
      })

      setPassword("")
      setIsOpen(false)
      
      // Avisar que será desconectado em breve
      setTimeout(() => {
        toast({
          title: "🚪 Redirecionando...",
          description: "Você será desconectado em 3 segundos",
        })
      }, 2000)
      
      // Desconectar após 5 segundos
      setTimeout(() => {
        window.location.href = '/admin'
      }, 5000)

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
    <Card className="border-red-500 border-2">
      <CardHeader>
        <CardTitle className="text-red-600 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Ações de Emergência
        </CardTitle>
        <CardDescription>
          Ferramentas críticas para resolver problemas de autenticação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>⚠️ Use com Cuidado</AlertTitle>
          <AlertDescription>
            Esta ação afetará TODOS os usuários do sistema
          </AlertDescription>
        </Alert>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="destructive" 
              size="lg" 
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Desconectar Todos os Usuários
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="h-5 w-5" />
                Confirmar Revogação de Sessões
              </DialogTitle>
              <DialogDescription>
                Esta ação irá desconectar <strong>TODOS</strong> os usuários do sistema, incluindo você.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong>
                  <ul className="list-disc list-inside mt-2 text-sm">
                    <li>Todos os usuários serão desconectados</li>
                    <li>Você também será desconectado</li>
                    <li>Todos precisarão fazer login novamente</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Senha Administrativa</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Digite a senha (ADMIN_SECRET_KEY)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRevoke()}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  💡 A senha está definida na variável de ambiente ADMIN_SECRET_KEY
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false)
                    setPassword("")
                  }}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRevoke}
                  disabled={isLoading || !password}
                  variant="destructive"
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      Confirmar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-4 text-xs text-muted-foreground">
          <p><strong>Quando usar:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Usuários não conseguem fazer login</li>
            <li>Sessões corrompidas ou antigas</li>
            <li>Após mudanças críticas de segurança</li>
            <li>Para forçar re-autenticação geral</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
