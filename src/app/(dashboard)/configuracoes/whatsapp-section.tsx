'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WhatsAppConnection } from '@/components/whatsapp-connection'
import { Smartphone, Settings } from 'lucide-react'
import type { ConfiguracoesNegocio } from '@/lib/types'
import { doc, updateDoc } from 'firebase/firestore'
import { useFirebase } from '@/firebase'
import { useToast } from '@/hooks/use-toast'

interface WhatsAppSectionProps {
  businessSettings: ConfiguracoesNegocio
  onUpdate: () => void
}

export function WhatsAppSection({ businessSettings, onUpdate }: WhatsAppSectionProps) {
  const { firestore } = useFirebase()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('connection')

  const handleConnected = async () => {
    try {
      // Atualizar Firestore
      const businessRef = doc(firestore, 'negocios', businessSettings.id)
      await updateDoc(businessRef, {
        whatsappConectado: true,
        updatedAt: new Date()
      })

      toast({
        title: '✅ WhatsApp Conectado!',
        description: 'Suas automações foram ativadas com sucesso.',
      })

      onUpdate()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive'
      })
    }
  }

  const handleDisconnected = async () => {
    try {
      // Atualizar Firestore
      const businessRef = doc(firestore, 'negocios', businessSettings.id)
      await updateDoc(businessRef, {
        whatsappConectado: false,
        updatedAt: new Date()
      })

      toast({
        title: 'WhatsApp Desconectado',
        description: 'Suas automações foram desativadas.',
      })

      onUpdate()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive'
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-green-600" />
          WhatsApp Business
        </CardTitle>
        <CardDescription>
          Conecte sua conta WhatsApp e gerencie as automações
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connection">
              <Smartphone className="mr-2 h-4 w-4" />
              Conexão
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4 mt-4">
            <WhatsAppConnection
              instanceId={businessSettings.id}
              token={businessSettings.tokenInstancia || businessSettings.id}
              onConnected={handleConnected}
              onDisconnected={handleDisconnected}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações Avançadas</CardTitle>
                <CardDescription>
                  Gerencie privacidade e presença
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  🚧 Configurações de privacidade e presença em breve...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
