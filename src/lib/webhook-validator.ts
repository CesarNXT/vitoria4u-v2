/**
 * 🛡️ WEBHOOK VALIDATOR
 * 
 * Garante que webhooks estão sempre configuradas corretamente
 * Valida e corrige automaticamente quando necessário
 */

import { adminDb } from '@/lib/firebase-admin'
import { WhatsAppAPI } from '@/lib/whatsapp-api-simple'
import { checkFeatureAccess } from '@/lib/server-utils'
import type { ConfiguracoesNegocio } from '@/lib/types'

const N8N_WEBHOOK_URL = 'https://n8n.vitoria4u.site/webhook/c0b43248-7690-4273-af55-8a11612849da'

export interface WebhookValidationResult {
  businessId: string
  isValid: boolean
  currentWebhook: string | null
  expectedWebhook: string | null
  needsFix: boolean
  error?: string
}

/**
 * Valida webhook de uma instância específica
 */
export async function validateInstanceWebhook(
  businessId: string
): Promise<WebhookValidationResult> {
  try {
    // 1. Buscar configurações do negócio
    const businessDoc = await adminDb.collection('negocios').doc(businessId).get()
    
    if (!businessDoc.exists) {
      return {
        businessId,
        isValid: false,
        currentWebhook: null,
        expectedWebhook: null,
        needsFix: false,
        error: 'Negócio não encontrado'
      }
    }

    const business = businessDoc.data() as ConfiguracoesNegocio

    // 2. Verificar se WhatsApp está conectado
    if (!business.whatsappConectado || !business.tokenInstancia) {
      return {
        businessId,
        isValid: true, // Não precisa webhook se não conectado
        currentWebhook: null,
        expectedWebhook: null,
        needsFix: false
      }
    }

    // 3. Verificar se tem feature de IA
    const hasIAFeature = await checkFeatureAccess(business, 'atendimento_whatsapp_ia')
    
    // 4. Determinar webhook esperada
    const expectedWebhook = hasIAFeature ? N8N_WEBHOOK_URL : ''

    // 5. Buscar webhook atual da API
    const api = new WhatsAppAPI(businessId, business.tokenInstancia)
    let currentWebhook: string | null = null

    try {
      const webhookInfo = await api.getWebhook()
      currentWebhook = webhookInfo.url || ''
    } catch (error) {
      console.warn(`[WEBHOOK-VALIDATOR] Erro ao buscar webhook: ${error}`)
      // Se falhou ao buscar, assumir que precisa configurar
      return {
        businessId,
        isValid: false,
        currentWebhook: null,
        expectedWebhook,
        needsFix: true,
        error: 'Não foi possível buscar webhook atual'
      }
    }

    // 6. Comparar
    const isValid = currentWebhook === expectedWebhook
    const needsFix = !isValid

    return {
      businessId,
      isValid,
      currentWebhook,
      expectedWebhook,
      needsFix
    }

  } catch (error: any) {
    console.error('[WEBHOOK-VALIDATOR] Erro ao validar:', error)
    return {
      businessId,
      isValid: false,
      currentWebhook: null,
      expectedWebhook: null,
      needsFix: false,
      error: error.message
    }
  }
}

/**
 * Valida e corrige webhook automaticamente
 */
export async function validateAndFixWebhook(
  businessId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Validar
    const validation = await validateInstanceWebhook(businessId)

    if (!validation.needsFix) {
      return {
        success: true,
        message: validation.isValid 
          ? 'Webhook está correta' 
          : 'Webhook não precisa de correção'
      }
    }

    // 2. Buscar configurações
    const businessDoc = await adminDb.collection('negocios').doc(businessId).get()
    const business = businessDoc.data() as ConfiguracoesNegocio

    if (!business.tokenInstancia) {
      return {
        success: false,
        message: 'Token da instância não encontrado'
      }
    }

    // 3. Corrigir webhook
    const api = new WhatsAppAPI(businessId, business.tokenInstancia)
    
    await api.setupWebhook(validation.expectedWebhook || '')

    // 4. Validar novamente
    const revalidation = await validateInstanceWebhook(businessId)

    if (revalidation.isValid) {
      // Registrar correção no log
      await adminDb.collection('negocios').doc(businessId)
        .collection('logs').add({
          tipo: 'webhook_corrigida',
          webhookAnterior: validation.currentWebhook,
          webhookNova: validation.expectedWebhook,
          corrigidoEm: new Date()
        })

      return {
        success: true,
        message: 'Webhook corrigida com sucesso'
      }
    } else {
      return {
        success: false,
        message: 'Webhook foi configurada mas validação falhou'
      }
    }

  } catch (error: any) {
    console.error('[WEBHOOK-VALIDATOR] Erro ao corrigir:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

/**
 * Valida todas as instâncias ativas
 */
export async function validateAllWebhooks(): Promise<WebhookValidationResult[]> {
  try {
    // Buscar todos os negócios com WhatsApp conectado
    const snapshot = await adminDb.collection('negocios')
      .where('whatsappConectado', '==', true)
      .get()

    const results: WebhookValidationResult[] = []

    for (const doc of snapshot.docs) {
      const result = await validateInstanceWebhook(doc.id)
      results.push(result)
    }

    return results
  } catch (error) {
    console.error('[WEBHOOK-VALIDATOR] Erro ao validar todas:', error)
    return []
  }
}

/**
 * Corrige todas as webhooks que precisam
 */
export async function fixAllWebhooks(): Promise<{
  total: number
  fixed: number
  failed: number
  results: Array<{ businessId: string; success: boolean; message: string }>
}> {
  const validations = await validateAllWebhooks()
  const needsFix = validations.filter(v => v.needsFix)

  const results = []
  let fixed = 0
  let failed = 0

  for (const validation of needsFix) {
    const result = await validateAndFixWebhook(validation.businessId)
    results.push({
      businessId: validation.businessId,
      ...result
    })

    if (result.success) {
      fixed++
    } else {
      failed++
    }
  }

  return {
    total: needsFix.length,
    fixed,
    failed,
    results
  }
}

/**
 * Valida webhook quando detectar evento de conexão
 */
export async function validateWebhookOnConnection(
  businessId: string
): Promise<void> {
  try {
    // Aguardar 5s para instância estabilizar
    await new Promise(resolve => setTimeout(resolve, 5000))

    const result = await validateAndFixWebhook(businessId);

    if (!result.success) {
      console.error(`[WEBHOOK-VALIDATOR] ❌ Falha ao validar: ${businessId} - ${result.message}`)
    }
  } catch (error) {
    console.error('[WEBHOOK-VALIDATOR] Erro:', error)
  }
}
