"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Clock, Bell, Bot, Heart, Shield, Phone, FileText } from "lucide-react";
import type { ConfiguracoesNegocio } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BusinessInfoModal from "./modals/business-info-modal";
import BusinessHoursModal from "./modals/business-hours-modal";
import NotificationsModal from "./modals/notifications-modal";
import IAModal from "./modals/ia-modal";
import HealthInsuranceModal from "./modals/health-insurance-modal";

interface ConfigCardsPageProps {
  settings: ConfiguracoesNegocio | null;
  userId: string;
  onSave: (data: Partial<ConfiguracoesNegocio>) => Promise<void>;
  userPlan: any | null;
  isAdmin: boolean;
}

type ModalType = 'business' | 'hours' | 'notifications' | 'ia' | 'health' | null;

export default function ConfigCardsPage({ settings, userId, onSave, userPlan, isAdmin }: ConfigCardsPageProps) {
  const [openModal, setOpenModal] = useState<ModalType>(null);
  
  const configCards = [
    {
      id: 'business' as const,
      title: 'Informações do Negócio',
      description: 'Nome, telefone, categoria e endereço',
      icon: Building2,
      iconClass: 'text-blue-600',
      bgClass: 'bg-blue-50 dark:bg-blue-950/20',
      enabled: true,
    },
    {
      id: 'hours' as const,
      title: 'Horários de Funcionamento',
      description: 'Configure os dias e horários de atendimento',
      icon: Clock,
      iconClass: 'text-green-600',
      bgClass: 'bg-green-50 dark:bg-green-950/20',
      enabled: true,
    },
    {
      id: 'notifications' as const,
      title: 'Notificações',
      description: 'Lembretes, aniversários e feedback',
      icon: Bell,
      iconClass: 'text-yellow-600',
      bgClass: 'bg-yellow-50 dark:bg-yellow-950/20',
      enabled: true,
    },
    {
      id: 'ia' as const,
      title: 'Inteligência Artificial',
      description: 'Configure o assistente virtual',
      icon: Bot,
      iconClass: 'text-purple-600',
      bgClass: 'bg-purple-50 dark:bg-purple-950/20',
      enabled: true,
    },
    {
      id: 'health' as const,
      title: 'Planos de Saúde',
      description: 'Gerenciar planos aceitos (clínicas)',
      icon: Heart,
      iconClass: 'text-pink-600',
      bgClass: 'bg-pink-50 dark:bg-pink-950/20',
      enabled: settings?.categoria?.toLowerCase().includes('clinic') || settings?.categoria?.toLowerCase().includes('consul'),
    },
  ];

  const handleSaveAndClose = async (data: Partial<ConfiguracoesNegocio>) => {
    await onSave(data);
    setOpenModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações do Negócio</h2>
        <p className="text-muted-foreground mt-2">
          Gerencie as informações essenciais que alimentam a IA, o sistema de agendamento e outras funcionalidades.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {configCards.filter(card => card.enabled).map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2"
              onClick={() => setOpenModal(card.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "p-3 rounded-lg",
                    card.bgClass
                  )}>
                    <Icon className={cn("h-6 w-6", card.iconClass)} />
                  </div>
                </div>
                <CardTitle className="mt-4">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Modals */}
      <BusinessInfoModal
        open={openModal === 'business'}
        onClose={() => setOpenModal(null)}
        settings={settings}
        onSave={handleSaveAndClose}
      />

      <BusinessHoursModal
        open={openModal === 'hours'}
        onClose={() => setOpenModal(null)}
        settings={settings}
        onSave={handleSaveAndClose}
      />

      <NotificationsModal
        open={openModal === 'notifications'}
        onClose={() => setOpenModal(null)}
        settings={settings}
        onSave={handleSaveAndClose}
        userId={userId}
      />

      <IAModal
        open={openModal === 'ia'}
        onClose={() => setOpenModal(null)}
        settings={settings}
        onSave={handleSaveAndClose}
      />

      {settings?.categoria && (settings.categoria.toLowerCase().includes('clinic') || settings.categoria.toLowerCase().includes('consul')) && (
        <HealthInsuranceModal
          open={openModal === 'health'}
          onClose={() => setOpenModal(null)}
          settings={settings}
          onSave={handleSaveAndClose}
          userId={userId}
        />
      )}
    </div>
  );
}
