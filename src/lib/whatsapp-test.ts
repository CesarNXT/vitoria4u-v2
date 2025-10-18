/**
 * 🧪 TESTE MANUAL - WHATSAPP API
 * 
 * Execute este arquivo para testar a API diretamente
 * 
 * Como usar:
 * 1. Abra o console do navegador (F12)
 * 2. Cole este código
 * 3. Execute: await testWhatsAppConnection('5581999887766')
 */

import { WhatsAppAPI, deleteOldInstances } from './whatsapp-api-simple'

/**
 * 🧪 TESTE COMPLETO DE CONEXÃO
 */
export async function testWhatsAppConnection(phone: string) {
  console.clear()
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 TESTE DE CONEXÃO WHATSAPP')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const instanceId = `teste_${Date.now()}`
  
  try {
    // PASSO 1: Deletar instâncias antigas
    console.log('\n📋 PASSO 1: Verificando instâncias antigas...')
    await deleteOldInstances(instanceId)
    console.log('✅ OK')
    
    // PASSO 2: Criar instância
    console.log('\n🔧 PASSO 2: Criando instância...')
    const api = new WhatsAppAPI(instanceId)
    const token = await api.createInstance('Teste Manual')
    console.log('✅ Token:', token.substring(0, 20) + '...')
    
    // PASSO 3: Aguardar inicialização
    console.log('\n⏳ PASSO 3: Aguardando inicialização (2s)...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('✅ OK')
    
    // PASSO 4: Conectar com telefone
    console.log('\n📱 PASSO 4: Solicitando PairCode...')
    const result = await api.connectWithPhone(phone)
    
    if (result.success && result.pairCode) {
      console.log('✅ PAIRCODE GERADO:', result.pairCode)
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📱 DIGITE ESTE CÓDIGO NO WHATSAPP:')
      console.log(`   ${result.pairCode}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      // PASSO 5: Configurar webhook
      console.log('\n🔔 PASSO 5: Configurando webhook...')
      await api.setupWebhook('https://exemplo.com/webhook')
      console.log('✅ OK')
      
      // PASSO 6: Monitorar status por 30s
      console.log('\n👀 PASSO 6: Monitorando status (30s)...')
      let connected = false
      
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        try {
          const status = await api.checkStatus()
          console.log(`   [${i+1}/15] Status:`, status.status, status.connected ? '✅ CONECTADO' : '⏳')
          
          if (status.connected) {
            connected = true
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            console.log('🎉 SUCESSO! WHATSAPP CONECTADO!')
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            break
          }
        } catch (err) {
          console.warn('   ⚠️ Erro ao verificar status:', err)
        }
      }
      
      if (!connected) {
        console.log('\n⏰ TIMEOUT: Não conectou em 30s')
        console.log('   (Isso é normal se você não digitou o código)')
      }
      
      // PASSO 7: Deletar instância de teste
      console.log('\n🗑️ PASSO 7: Deletando instância de teste...')
      await api.deleteInstance()
      console.log('✅ OK')
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('✅ TESTE CONCLUÍDO COM SUCESSO!')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      return {
        success: true,
        pairCode: result.pairCode,
        token,
        connected
      }
      
    } else {
      throw new Error(result.error || 'Falha ao gerar PairCode')
    }
    
  } catch (error: any) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ ERRO NO TESTE')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(error.message)
    console.error('\n📋 Stack:', error.stack)
    
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 🧪 TESTE: Criar instância
 */
export async function testCreateInstance() {
  console.log('🧪 Teste: Criar Instância\n')
  
  const api = new WhatsAppAPI('teste_123')
  
  try {
    const token = await api.createInstance('Teste')
    console.log('✅ SUCESSO!')
    console.log('Token:', token)
    return token
  } catch (error: any) {
    console.error('❌ ERRO:', error.message)
    throw error
  }
}

/**
 * 🧪 TESTE: Conectar com telefone
 */
export async function testConnect(token: string, phone: string) {
  console.log('🧪 Teste: Conectar com Telefone\n')
  
  const api = new WhatsAppAPI('teste_123', token)
  
  try {
    const result = await api.connectWithPhone(phone)
    console.log('✅ SUCESSO!')
    console.log('PairCode:', result.pairCode)
    console.log('QRCode:', result.qrCode ? 'Disponível' : 'Não')
    return result
  } catch (error: any) {
    console.error('❌ ERRO:', error.message)
    throw error
  }
}

/**
 * 🧪 TESTE: Verificar status
 */
export async function testStatus(token: string) {
  console.log('🧪 Teste: Verificar Status\n')
  
  const api = new WhatsAppAPI('teste_123', token)
  
  try {
    const status = await api.checkStatus()
    console.log('✅ SUCESSO!')
    console.log('Conectado:', status.connected)
    console.log('Status:', status.status)
    return status
  } catch (error: any) {
    console.error('❌ ERRO:', error.message)
    throw error
  }
}

/**
 * 🧪 TESTE: Configurar webhook
 */
export async function testWebhook(token: string) {
  console.log('🧪 Teste: Configurar Webhook\n')
  
  const api = new WhatsAppAPI('teste_123', token)
  
  try {
    await api.setupWebhook('https://exemplo.com/webhook')
    console.log('✅ SUCESSO!')
  } catch (error: any) {
    console.error('❌ ERRO:', error.message)
    throw error
  }
}

/**
 * 🧪 TESTE: Deletar instância
 */
export async function testDelete(token: string) {
  console.log('🧪 Teste: Deletar Instância\n')
  
  const api = new WhatsAppAPI('teste_123', token)
  
  try {
    await api.deleteInstance()
    console.log('✅ SUCESSO!')
  } catch (error: any) {
    console.error('❌ ERRO:', error.message)
    throw error
  }
}

/**
 * 🧪 TESTE: Fluxo passo a passo
 */
export async function testStepByStep(phone: string) {
  console.clear()
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 TESTE PASSO A PASSO')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  let token: string
  
  try {
    // Passo 1
    console.log('PASSO 1: Criar instância')
    token = await testCreateInstance()
    console.log('\n---\n')
    
    // Aguardar
    console.log('Aguardando 2s...\n')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Passo 2
    console.log('PASSO 2: Conectar com telefone')
    const result = await testConnect(token, phone)
    console.log('\n---\n')
    
    if (result.pairCode) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📱 DIGITE NO WHATSAPP:', result.pairCode)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    }
    
    // Passo 3
    console.log('PASSO 3: Configurar webhook')
    await testWebhook(token)
    console.log('\n---\n')
    
    // Passo 4
    console.log('PASSO 4: Verificar status')
    await testStatus(token)
    console.log('\n---\n')
    
    // Passo 5
    console.log('PASSO 5: Deletar instância')
    await testDelete(token)
    console.log('\n---\n')
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ TODOS OS TESTES PASSARAM!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
  } catch (error: any) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ TESTE FALHOU')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Erro:', error.message)
  }
}

// ==========================================
// EXPORTAR PARA GLOBAL (para usar no console)
// ==========================================

if (typeof window !== 'undefined') {
  (window as any).testWhatsApp = testWhatsAppConnection;
  (window as any).testStepByStep = testStepByStep;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 TESTES WHATSAPP DISPONÍVEIS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('1. testWhatsApp("5581999887766")')
  console.log('2. testStepByStep("5581999887766")')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}
