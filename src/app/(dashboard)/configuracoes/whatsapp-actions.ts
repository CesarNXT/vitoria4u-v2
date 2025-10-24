'use server'

/**
 * 🔌 WHATSAPP ACTIONS - Substitui N8N
 * 
 * Funções que replicam EXATAMENTE o workflow N8N
 */

import { adminDb } from '@/lib/firebase-admin'
import { WhatsAppAPI } from '@/lib/whatsapp-api-simple'
import { checkFeatureAccess } from '@/lib/server-utils'
import type { ConfiguracoesNegocio } from '@/lib/types'

const NOTIFICATION_TOKEN = 'b2e97825-2d28-4646-ae38-3357fcbf0e20'
const API_BASE = 'https://vitoria4u.uazapi.com'

// ==========================================
// ENVIAR SMS VIA INSTÂNCIA DE NOTIFICAÇÃO
// ==========================================

async function sendNotificationSMS(phone: string, text: string) {
  try {
    await fetch(`${API_BASE}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': NOTIFICATION_TOKEN
      },
      body: JSON.stringify({ number: phone, text })
    })
  } catch (error) {
    console.warn('⚠️ Erro ao enviar SMS:', error)
  }
}

// ==========================================
// AGUARDAR E VERIFICAR STATUS
// ==========================================

async function waitAndCheckConnection(
  api: WhatsAppAPI,
  businessId: string,
  businessPhone: string,
  timeoutSeconds: number = 60
): Promise<boolean> {
  // Aguardar tempo especificado
  await new Promise(resolve => setTimeout(resolve, timeoutSeconds * 1000))
  
  try {
    // Buscar status da instância
    const status = await api.checkStatus()
    
    if (status.connected) {
      // Enviar SMS de sucesso
      await sendNotificationSMS(businessPhone, '✅Whatsapp Conectado✅')
      
      // Atualizar Firestore
      await adminDb.collection('negocios').doc(businessId).update({
        whatsappConectado: true,
        whatsappStatus: 'conectado'
      })
      
      return true
    } else {
      // NÃO conectou no tempo limite - DELETAR instância
      console.warn(`[WHATSAPP-CONNECT] ⚠️ Timeout: Instância ${businessId} não conectou em ${timeoutSeconds}s`)
      
      try {
        await api.deleteInstance()
        console.warn(`[WHATSAPP-CONNECT] ✅ Instância ${businessId} deletada`)
      } catch (deleteError) {
        console.error('[WHATSAPP-CONNECT] Erro ao deletar instância:', deleteError)
      }
      
      // Limpar dados no Firestore
      await adminDb.collection('negocios').doc(businessId).update({
        whatsappConectado: false,
        whatsappStatus: 'timeout',
        tokenInstancia: '',
        whatsappQR: null
      })
      
      // Notificar usuário
      await sendNotificationSMS(
        businessPhone, 
        '⚠️ Tempo esgotado para conexão. Por favor, tente novamente.'
      )
      
      return false
    }
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error)
    
    // Em caso de erro, também deletar instância
    try {
      await api.deleteInstance()
    } catch (deleteError) {
      console.error('[WHATSAPP-CONNECT] Erro ao deletar instância após erro:', deleteError)
    }
    
    // Limpar dados no Firestore
    await adminDb.collection('negocios').doc(businessId).update({
      whatsappConectado: false,
      whatsappStatus: 'erro',
      tokenInstancia: '',
      whatsappQR: null
    })
    
    return false
  }
}

// ==========================================
// AÇÃO: CONECTAR WHATSAPP
// ==========================================

export async function connectWhatsAppAction(data: {
  businessId: string
  businessPhone: string
}) {
  const { businessId, businessPhone } = data
  
  // Formatar telefone (remover caracteres não numéricos)
  let cleanPhone = businessPhone.toString().replace(/\D/g, '')
  
  // Se tem 13 dígitos, remover o 9 extra
  if (cleanPhone.length === 13) {
    cleanPhone = cleanPhone.substring(0, 4) + cleanPhone.substring(5)
  }
  
  // Garantir código do país
  if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) {
    cleanPhone = '55' + cleanPhone
  }
  
  try {
    // 1. Buscar configurações do negócio para verificar features
    const businessDoc = await adminDb.collection('negocios').doc(businessId).get()
    const businessSettings = businessDoc.data() as ConfiguracoesNegocio
    
    // Verificar se tem feature de IA
    const hasIAFeature = await checkFeatureAccess(businessSettings, 'atendimento_whatsapp_ia')
    // 2. Criar API instance
    const api = new WhatsAppAPI(businessId)
    
    // 3. Criar instância
    const token = await api.createInstance('apilocal')
    
    // Salvar token no Firestore
    await adminDb.collection('negocios').doc(businessId).update({
      tokenInstancia: token,
      whatsappStatus: 'criando'
    })
    
    // 3. Aguardar inicialização
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 4. Conectar com telefone (tentar paircode primeiro)
    let result = await api.connectWithPhone(cleanPhone)
    
    // 5. Verificar se paircode foi gerado
    if (!result.success || !result.pairCode || result.pairCode === '') {
      console.warn('⚠️ PairCode não foi gerado, tentando QR Code como fallback...')
      
      // Se API retornou QR code quando pedimos pair code, pode ser problema no telefone
      if (result.qrCode) {
        console.warn('⚠️ API retornou QR Code ao invés de Pair Code. Possível problema com o telefone.')
      }
      
      try {
        // FALLBACK: Tentar QR Code explicitamente
        result = await api.connectWithQRCode()
        
        if (result.qrCode) {
          // Configurar webhook APENAS se tiver feature de IA
          if (hasIAFeature) {
            // URL FIXA E CORRETA da webhook N8N (onde a IA está)
            const webhookUrl = 'https://n8n.vitoria4u.site/webhook/c0b43248-7690-4273-af55-8a11612849da'
            
            // Garantir que a webhook está sendo configurada
            const webhookResult = await api.setupWebhook(webhookUrl)
          }
          
          // Enviar instrução via SMS
          await sendNotificationSMS(
            cleanPhone, 
            '📱 *Instruções para Conexão via QR Code:*\n\n' +
            '1. Abra o WhatsApp no seu celular\n' +
            '2. Toque em *Mais opções* (⋮) > *Aparelhos conectados*\n' +
            '3. Toque em *Conectar um aparelho*\n' +
            '4. Escaneie o QR Code que aparecerá na tela do computador\n\n' +
            '_O QR Code será exibido na tela agora._'
          )
          
          // IMPORTANTE: Aguardar 60s e verificar conexão (em background)
          // QR Code MUDA a cada 60s, então se não conectou, precisa gerar novo
          // Se não conectar, DELETA instância para liberar recursos
          waitAndCheckConnection(api, businessId, cleanPhone, 60).catch(err => {
            console.error('Erro no background check (QR Code):', err)
          })
          
          return {
            success: true,
            qrCode: result.qrCode,
            message: 'Use o QR Code para conectar (método mais confiável)',
            method: 'qrcode'
          }
        }
      } catch (qrError: any) {
        console.error('❌ Erro ao gerar QR Code:', qrError.message)
        
        // Falhou tudo
        await sendNotificationSMS(
          cleanPhone, 
          'Estamos com problemas de conexão aguarde alguns minutos e tente novamente.'
        )
        
        await api.deleteInstance()
        
        return {
          success: false,
          error: 'Não foi possível gerar código de conexão'
        }
      }
    }
    
    // PairCode foi gerado com sucesso
    // Configurar webhook APENAS se tiver feature de IA
    if (hasIAFeature) {
      // URL FIXA E CORRETA da webhook N8N
      const webhookUrl = 'https://n8n.vitoria4u.site/webhook/c0b43248-7690-4273-af55-8a11612849da'
      
      // Garantir que a webhook está sendo configurada
      const webhookResult = await api.setupWebhook(webhookUrl)
      } else {
        // IA feature não disponível
    }
    
    // Enviar paircode via SMS
    await sendNotificationSMS(cleanPhone, '*Copie o codigo abaixo:*')
    await sendNotificationSMS(cleanPhone, result.pairCode!)
    
    // 8. Aguardar 60s e verificar conexão (em background)
    // Pair Code MUDA a cada 60s, então se não conectou, precisa gerar novo
    // Se não conectar, DELETA instância para liberar recursos
    waitAndCheckConnection(api, businessId, cleanPhone, 60).catch(err => {
      console.error('Erro no background check:', err)
    })
    
    return {
      success: true,
      pairCode: result.pairCode,
      message: 'Código enviado via SMS',
      method: 'paircode'
    }
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message)
    
    return {
      success: false,
      error: error.message
    }
  }
}

// ==========================================
// AÇÃO: VERIFICAR E CORRIGIR WEBHOOK
// ==========================================

export async function verifyAndFixWebhookAction(data: {
  businessId: string
}) {
  const { businessId } = data
  
  try {
    // 1. Buscar configurações do negócio
    const businessDoc = await adminDb.collection('negocios').doc(businessId).get()
    const businessSettings = businessDoc.data() as ConfiguracoesNegocio
    
    if (!businessSettings.whatsappConectado || !businessSettings.tokenInstancia) {
      return {
        success: false,
        message: 'WhatsApp não está conectado ou token ausente'
      }
    }
    
    // 2. Verificar se tem feature de IA
    const hasIAFeature = await checkFeatureAccess(businessSettings, 'atendimento_whatsapp_ia')
    // 3. Criar API instance
    const api = new WhatsAppAPI(businessId, businessSettings.tokenInstancia)
    
    // 4. Configurar ou remover webhook baseado na feature
    if (hasIAFeature) {
      // URL FIXA E CORRETA da webhook N8N
      const webhookUrl = 'https://n8n.vitoria4u.site/webhook/c0b43248-7690-4273-af55-8a11612849da'
      
      await api.setupWebhook(webhookUrl)
      return {
        success: true,
        message: 'Webhook configurada corretamente',
        webhookUrl
      }
    } else {
      // Configurar webhook vazia para garantir que não há webhook ativa
      await api.setupWebhook('')
      return {
        success: true,
        message: 'Webhook removida (plano sem IA)',
        webhookUrl: null
      }
    }
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// ==========================================
// AÇÃO: DESCONECTAR WHATSAPP (Manual)
// ==========================================

export async function disconnectWhatsAppAction(data: {
  businessId: string
  instanceToken: string
  businessPhone: string
}) {
  const { businessId, instanceToken, businessPhone } = data
  
  try {
    // Formatar telefone
    let cleanPhone = businessPhone.toString().replace(/\D/g, '')
    if (cleanPhone.length === 13) {
      cleanPhone = cleanPhone.substring(0, 4) + cleanPhone.substring(5)
    }
    if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone
    }
    
    // 1. Criar API instance
    const api = new WhatsAppAPI(businessId, instanceToken)
    
    // 2. Deletar instância
    await api.deleteInstance()
    
    // 3. Atualizar Firestore
    await adminDb.collection('negocios').doc(businessId).update({
      whatsappConectado: false,
      tokenInstancia: ''
    })
    
    // 4. Enviar SMS de desconexão
    await sendNotificationSMS(cleanPhone, '❌Whatsapp Desconectado❌')
    
    return {
      success: true,
      message: 'WhatsApp desconectado'
    }
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message)
    
    // Se erro 401 ou 500, considerar como sucesso (instância já deletada)
    if (error.message.includes('401') || error.message.includes('500')) {
      await adminDb.collection('negocios').doc(businessId).update({
        whatsappConectado: false,
        tokenInstancia: ''
      })
      
      return {
        success: true,
        message: 'WhatsApp desconectado (instância já estava removida)'
      }
    }
    
    return {
      success: false,
      error: error.message
    }
  }
}

// ==========================================
// WEBHOOK HANDLER: Auto-desconexão
// ==========================================

export async function handleWebhookDisconnection(data: {
  token: string
  id: string
  status: string
}) {
  if (data.status !== 'disconnected') {
    return { success: false, message: 'Status não é disconnected' }
  }
  
  try {
    // 1. Buscar todas as instâncias
    const response = await fetch(`${API_BASE}/instance/all`, {
      headers: {
        'Accept': 'application/json',
        'admintoken': process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN || ''
      }
    })
    
    const instances = await response.json()
    
    // 2. Filtrar pela instância com mesmo nome
    const instance = instances.find((inst: any) => inst.name === data.id)
    
    if (!instance) {
      return { success: false, message: 'Instância não encontrada' }
    }
    
    // 3. Buscar dados do negócio
    const businessDoc = await adminDb.collection('negocios').doc(data.id).get()
    
    if (!businessDoc.exists) {
      return { success: false, message: 'Negócio não encontrado' }
    }
    
    const businessData = businessDoc.data()
    
    // 4. Atualizar Firestore
    await adminDb.collection('negocios').doc(data.id).update({
      whatsappConectado: false,
      tokenInstancia: ''
    })
    
    // 5. Deletar instância
    const api = new WhatsAppAPI(data.id, data.token)
    await api.deleteInstance()
    
    // 6. Enviar SMS
    if (businessData?.telefone) {
      let cleanPhone = businessData.telefone.toString().replace(/\D/g, '')
      if (cleanPhone.length === 13) {
        cleanPhone = cleanPhone.substring(0, 4) + cleanPhone.substring(5)
      }
      if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone
      }
      
      await sendNotificationSMS(cleanPhone, '❌Whatsapp Desconectado❌')
    }
    
    return {
      success: true,
      message: 'Desconexão processada'
    }
    
  } catch (error: any) {
    console.error('❌ Erro ao processar desconexão:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}
