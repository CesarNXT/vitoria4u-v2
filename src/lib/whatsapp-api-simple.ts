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
  message?: string;
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

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseText = await response.text();

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
    
    return token;
  }

  // ==========================================
  // PASSO 2A: CONECTAR COM TELEFONE (PAIRCODE)
  // ==========================================

  async connectWithPhone(phone: string): Promise<PairCodeResponse> {

    if (!this.instanceToken) {
      throw new Error('Instância não criada. Chame createInstance() primeiro.');
    }

    const response = await this.makeRequest(
      '/instance/connect',
      'POST',
      { phone },
      true // Usa instanceToken
    );

    // Segundo documentação: COM phone deve gerar pairCode
    const pairCode = response.instance?.paircode || response.paircode;
    
    if (pairCode && pairCode.trim() !== '') {
      return {
        success: true,
        pairCode,
        instanceToken: this.instanceToken
      };
    }

    // Se pairCode vazio/ausente, API pode ter retornado QR code
    // Isso indica que o método de pair code falhou
    const qrCode = response.instance?.qrcode || response.qrcode;
    
    if (qrCode) {
      console.warn('[WHATSAPP-API] API retornou QR Code ao invés de Pair Code. Telefone pode estar incorreto.');
      return {
        success: false,
        error: 'API retornou QR Code ao invés de Pair Code. Verifique o número do telefone.',
        qrCode, // Retorna QR mas marca como não sucesso
        instanceToken: this.instanceToken
      };
    }

    throw new Error('Pair Code não foi gerado pela API');
  }

  // ==========================================
  // PASSO 2B: CONECTAR VIA QR CODE (FALLBACK)
  // ==========================================

  async connectWithQRCode(): Promise<PairCodeResponse> {

    if (!this.instanceToken) {
      throw new Error('Instância não criada. Chame createInstance() primeiro.');
    }

    const response = await this.makeRequest(
      '/instance/connect',
      'POST',
      {}, // Sem telefone = gera QR Code
      true // Usa instanceToken
    );

    const qrCode = response.instance?.qrcode || response.qrcode;

    if (qrCode) {
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

    return {
      connected,
      status,
      instanceToken: this.instanceToken
    };
  }

  // ==========================================
  // PASSO 4A: BUSCAR WEBHOOK ATUAL
  // ==========================================

  async getWebhook(): Promise<{ url: string; enabled: boolean; events: string[] }> {

    if (!this.instanceToken) {
      throw new Error('Token da instância não configurado');
    }

    const response = await this.makeRequest(
      '/webhook',
      'GET',
      undefined,
      true // Usa instanceToken
    );

    return {
      url: response.url || '',
      enabled: response.enabled || false,
      events: response.events || []
    };
  }

  // ==========================================
  // PASSO 4B: CONFIGURAR WEBHOOK
  // ==========================================

  async setupWebhook(webhookUrl: string): Promise<void> {

    if (!this.instanceToken) {
      throw new Error('Token da instância não configurado');
    }

    await this.makeRequest(
      '/webhook',
      'POST',
      {
        url: webhookUrl,
        enabled: true,
        events: ['messages'],  // ✅ Apenas mensagens
        excludeMessages: [
          'wasSentByApi',      // ✅ Excluir mensagens enviadas pela API (evitar loop)
          'isGroupYes'         // ✅ Excluir mensagens de grupo
        ]
      },
      true // Usa instanceToken
    );
  }

  // ==========================================
  // DELETAR INSTÂNCIA
  // ==========================================

  async deleteInstance(): Promise<void> {

    if (!this.instanceToken) {
      throw new Error('Token da instância não configurado');
    }

    await this.makeRequest(
      '/instance',
      'DELETE',
      undefined,
      true // Usa instanceToken
    );
  }

  // ==========================================
  // DESCONECTAR (sem deletar)
  // ==========================================

  async disconnect(): Promise<void> {

    if (!this.instanceToken) {
      throw new Error('Token da instância não configurado');
    }

    await this.makeRequest(
      '/instance/disconnect',
      'POST',
      undefined,
      true // Usa instanceToken
    );
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
  
  const api = new WhatsAppAPI(instanceId);

  try {
    // PASSO 1: Criar instância
    const instanceToken = await api.createInstance();
    
    // Aguardar 2s para instância inicializar
    await new Promise(resolve => setTimeout(resolve, 2000));

    // PASSO 2: Conectar com telefone
    const result = await api.connectWithPhone(phone);

    // PASSO 3: Configurar webhook
    await api.setupWebhook(webhookUrl);

    return result;

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERRO NA CONEXÃO');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(error.message);
    
    // Tentar deletar instância em caso de erro
    try {
      await api.deleteInstance();
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
  
  try {
    const instances = await listInstances();
    const oldInstances = instances.filter((inst: any) => inst.name === instanceId);
    
    if (oldInstances.length > 0) {
      for (const inst of oldInstances) {
        try {
          const api = new WhatsAppAPI(instanceId, inst.token);
          await api.deleteInstance();
        } catch (error) {
          // Ignorar erro
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Erro ao verificar instâncias antigas:', error);
  }
}
