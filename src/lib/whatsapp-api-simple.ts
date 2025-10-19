/**
 * 🔌 WhatsApp API - VERSÃO SIMPLIFICADA
 * 
 * Requisições HTTPS diretas e simples
 * Foco: FUNCIONALIDADE e CLAREZA
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN || '';

// ==========================================
// TIPOS
// ==========================================

export interface PairCodeResponse {
  success: boolean;
  pairCode?: string;
  qrCode?: string;
  instanceToken?: string;
  error?: string;
}

export interface StatusResponse {
  connected: boolean;
  status: string;
  instanceToken?: string;
}

// ==========================================
// CLASSE PRINCIPAL
// ==========================================

export class WhatsAppAPI {
  private instanceId: string;
  private instanceToken: string;

  constructor(instanceId: string, instanceToken: string = '') {
    this.instanceId = instanceId;
    this.instanceToken = instanceToken;
  }

  /**
   * 📡 REQUISIÇÃO HTTP GENÉRICA
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any,
    useInstanceToken: boolean = false
  ): Promise<any> {
    
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Decidir qual token usar
    if (useInstanceToken && this.instanceToken) {
      headers['token'] = this.instanceToken;
    } else {
      headers['admintoken'] = ADMIN_TOKEN;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 ${method} ${url}`);
    console.log('📋 Headers:', JSON.stringify(headers, null, 2));
    if (body) console.log('📦 Body:', JSON.stringify(body, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseText = await response.text();
      
      console.log(`📥 Response Status: ${response.status}`);
      console.log(`📥 Response Body:`, responseText.substring(0, 500));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      return responseText ? JSON.parse(responseText) : {};
      
    } catch (error: any) {
      console.error('❌ Request Error:', error.message);
      throw error;
    }
  }

  // ==========================================
  // PASSO 1: CRIAR INSTÂNCIA
  // ==========================================

  async createInstance(systemName: string = 'Vitoria4U Web'): Promise<string> {
    console.log('🔧 PASSO 1: Criando instância...');
    
    const response = await this.makeRequest(
      '/instance/init',
      'POST',
      { name: this.instanceId, systemName },
      false // Usa admintoken
    );

    const token = response.token || response.instance?.token;
    
    if (!token) {
      throw new Error('Token não retornado pela API');
    }

    this.instanceToken = token;
    console.log('✅ Instância criada! Token:', token.substring(0, 8) + '...');
    
    return token;
  }

  // ==========================================
  // PASSO 2A: CONECTAR COM TELEFONE (PAIRCODE)
  // ==========================================

  async connectWithPhone(phone: string): Promise<PairCodeResponse> {
    console.log('📱 PASSO 2A: Conectando com telefone...');
    console.log('📞 Telefone:', phone);

    if (!this.instanceToken) {
      throw new Error('Instância não criada. Chame createInstance() primeiro.');
    }

    const response = await this.makeRequest(
      '/instance/connect',
      'POST',
      { phone },
      true // Usa instanceToken
    );

    console.log('📥 Resposta completa:', JSON.stringify(response, null, 2));

    const pairCode = response.instance?.paircode || response.paircode;
    const qrCode = response.instance?.qrcode || response.qrcode;

    if (pairCode) {
      console.log('✅ Pair Code gerado:', pairCode);
      return {
        success: true,
        pairCode,
        instanceToken: this.instanceToken
      };
    }

    if (qrCode) {
      console.log('✅ QR Code gerado');
      return {
        success: true,
        qrCode,
        instanceToken: this.instanceToken
      };
    }

    throw new Error('Nem PairCode nem QRCode foram gerados');
  }

  // ==========================================
  // PASSO 2B: CONECTAR VIA QR CODE (FALLBACK)
  // ==========================================

  async connectWithQRCode(): Promise<PairCodeResponse> {
    console.log('📱 PASSO 2B: Conectando via QR Code (método mais confiável)...');

    if (!this.instanceToken) {
      throw new Error('Instância não criada. Chame createInstance() primeiro.');
    }

    const response = await this.makeRequest(
      '/instance/connect',
      'POST',
      {}, // Sem telefone = gera QR Code
      true // Usa instanceToken
    );

    console.log('📥 Resposta completa:', JSON.stringify(response, null, 2));

    const qrCode = response.instance?.qrcode || response.qrcode;

    if (qrCode) {
      console.log('✅ QR Code gerado');
      return {
        success: true,
        qrCode,
        instanceToken: this.instanceToken
      };
    }

    throw new Error('QR Code não foi gerado');
  }

  // ==========================================
  // PASSO 3: VERIFICAR STATUS
  // ==========================================

  async checkStatus(): Promise<StatusResponse> {
    console.log('🔍 PASSO 3: Verificando status...');

    if (!this.instanceToken) {
      throw new Error('Token da instância não configurado');
    }

    const response = await this.makeRequest(
      `/instance/status?id=${this.instanceId}`,
      'GET',
      undefined,
      true // Usa instanceToken
    );

    const connected = response.status?.connected || response.connected || false;
    const status = response.status?.instance?.status || response.instance?.status || 'disconnected';

    console.log('📊 Status:', { connected, status });

    return {
      connected,
      status,
      instanceToken: this.instanceToken
    };
  }

  // ==========================================
  // PASSO 4: CONFIGURAR WEBHOOK
  // ==========================================

  async setupWebhook(webhookUrl: string): Promise<void> {
    console.log('🔔 PASSO 4: Configurando webhook...');
    console.log('📍 URL:', webhookUrl);

    if (!this.instanceToken) {
      throw new Error('Token da instância não configurado');
    }

    await this.makeRequest(
      '/webhook',
      'POST',
      {
        enabled: true,
        url: webhookUrl,
        events: ['messages'],
        excludeMessages: ['wasSentByApi', 'isGroupYes']
      },
      true // Usa instanceToken
    );

    console.log('✅ Webhook configurado!');
  }

  // ==========================================
  // DELETAR INSTÂNCIA
  // ==========================================

  async deleteInstance(): Promise<void> {
    console.log('🗑️ Deletando instância...');

    if (!this.instanceToken) {
      throw new Error('Token da instância não configurado');
    }

    await this.makeRequest(
      '/instance',
      'DELETE',
      undefined,
      true // Usa instanceToken
    );

    console.log('✅ Instância deletada!');
  }

  // ==========================================
  // DESCONECTAR (sem deletar)
  // ==========================================

  async disconnect(): Promise<void> {
    console.log('🔌 Desconectando instância...');

    if (!this.instanceToken) {
      throw new Error('Token da instância não configurado');
    }

    await this.makeRequest(
      '/instance/disconnect',
      'POST',
      undefined,
      true // Usa instanceToken
    );

    console.log('✅ Instância desconectada!');
  }
}

// ==========================================
// FUNÇÃO HELPER: FLUXO COMPLETO
// ==========================================

/**
 * 🚀 FLUXO COMPLETO DE CONEXÃO
 * 
 * 1. Cria instância
 * 2. Conecta com telefone (gera paircode)
 * 3. Configura webhook
 * 4. Retorna paircode para o usuário
 */
export async function connectWhatsApp(
  instanceId: string,
  phone: string,
  webhookUrl: string
): Promise<PairCodeResponse> {
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 INICIANDO CONEXÃO WHATSAPP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const api = new WhatsAppAPI(instanceId);

  try {
    // PASSO 1: Criar instância
    const instanceToken = await api.createInstance();
    
    // Aguardar 2s para instância inicializar
    console.log('⏳ Aguardando instância inicializar...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // PASSO 2: Conectar com telefone
    const result = await api.connectWithPhone(phone);

    // PASSO 3: Configurar webhook
    await api.setupWebhook(webhookUrl);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CONEXÃO INICIADA COM SUCESSO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return result;

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERRO NA CONEXÃO');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(error.message);
    
    // Tentar deletar instância em caso de erro
    try {
      await api.deleteInstance();
      console.log('🗑️ Instância deletada após erro');
    } catch {
      // Ignorar erro ao deletar
    }

    return {
      success: false,
      error: error.message
    };
  }
}

// ==========================================
// FUNÇÃO HELPER: VERIFICAR INSTÂNCIAS
// ==========================================

/**
 * 📋 LISTAR TODAS AS INSTÂNCIAS
 */
export async function listInstances(): Promise<any[]> {
  const url = `${API_BASE_URL}/instance/all`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'admintoken': ADMIN_TOKEN
    }
  });

  if (!response.ok) {
    throw new Error(`Erro ao listar instâncias: ${response.status}`);
  }

  return response.json();
}

/**
 * 🗑️ DELETAR INSTÂNCIAS ANTIGAS COM MESMO NOME
 */
export async function deleteOldInstances(instanceId: string): Promise<void> {
  console.log('🔍 Verificando instâncias antigas...');
  
  try {
    const instances = await listInstances();
    const oldInstances = instances.filter((inst: any) => inst.name === instanceId);
    
    if (oldInstances.length > 0) {
      console.log(`🗑️ Encontradas ${oldInstances.length} instância(s) antiga(s)`);
      
      for (const inst of oldInstances) {
        try {
          const api = new WhatsAppAPI(instanceId, inst.token);
          await api.deleteInstance();
          console.log(`✅ Instância ${inst.token.substring(0, 8)}... deletada`);
        } catch (error) {
          console.warn('⚠️ Erro ao deletar instância antiga:', error);
        }
      }
    } else {
      console.log('✅ Nenhuma instância antiga encontrada');
    }
  } catch (error) {
    console.warn('⚠️ Erro ao verificar instâncias antigas:', error);
  }
}
