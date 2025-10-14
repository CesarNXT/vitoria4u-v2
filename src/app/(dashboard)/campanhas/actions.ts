"use server";

import type { ConfiguracoesNegocio, Plano, PlanFeature } from '@/lib/types';
import { adminDb } from "@/lib/firebase-admin";
import { checkFeatureAccess } from '@/lib/server-utils';

interface CampaignWebhookPayload {
    eventType: 'start_campaign';
    businessSettings: ConfiguracoesNegocio;
    message: string;
    mediaUrl: string;
    typeMidea?: 'image' | 'video' | 'audio';
}

const CAMPAIGN_WEBHOOK_URL = "https://n8n.vitoria4u.site/webhook/a199551c-40a6-472e-ba7d-1a7076443e7c";

export async function sendCampaignWebhook(payload: CampaignWebhookPayload): Promise<{ success: boolean; message?: string }> {
  if (!payload.businessSettings.whatsappConectado) {
      return { success: false, message: "Conecte seu WhatsApp para enviar campanhas." };
  }

  const hasAccess = await checkFeatureAccess(payload.businessSettings, 'disparo_de_mensagens');

  if (!hasAccess) {
    console.log("Bloqueando campanha por falta de permissão no plano. Business ID:", payload.businessSettings.id);
    return { success: false, message: "O envio de campanhas não está incluído no seu plano atual." };
  }

  console.log("Sending campaign webhook with payload:", payload);
  
  try {
    const response = await fetch(CAMPAIGN_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Webhook failed with status ${response.status}: ${errorBody}`);
      return { success: false };
    }

    console.log("Campaign webhook sent successfully.");
    return { success: true };

  } catch (error) {
    console.error("Failed to send campaign webhook:", error);
    return { success: false };
  }
}
