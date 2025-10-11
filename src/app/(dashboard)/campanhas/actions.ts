
"use server";

import type { ConfiguracoesNegocio } from '@/lib/types';

interface CampaignWebhookPayload {
    eventType: 'start_campaign';
    businessSettings: ConfiguracoesNegocio;
    message: string;
    mediaUrl: string;
    typeMidea?: 'image' | 'video' | 'ptt';
}

const CAMPAIGN_WEBHOOK_URL = "https://n8n.vitoria4u.site/webhook/a199551c-40a6-472e-ba7d-1a7076443e7c";

export async function sendCampaignWebhook(payload: CampaignWebhookPayload): Promise<{ success: boolean; message?: string }> {
  if (payload.businessSettings.planId === 'plano_gratis') {
    console.log("Bloqueando campanha para plano gratuito. Business ID:", payload.businessSettings.id);
    return { success: false, message: "Funcionalidade não disponível no plano gratuito." };
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
