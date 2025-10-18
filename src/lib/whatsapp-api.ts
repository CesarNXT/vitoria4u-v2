/**
 * WhatsApp API Client
 * Gerencia conexão, status e configurações do WhatsApp
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';
const API_TOKEN = process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN || '';

export interface WhatsAppInstance {
  id: string;
  token: string;
  status: 'disconnected' | 'connecting' | 'connected';
  paircode?: string;
  qrcode?: string;
  name?: string;
  profileName?: string;
  profilePicUrl?: string;
  isBusiness?: boolean;
  plataform?: string;
  systemName?: string;
  owner?: string;
  lastDisconnect?: string;
  lastDisconnectReason?: string;
  created?: string;
  updated?: string;
}

export interface WhatsAppStatus {
  connected: boolean;
  loggedIn: boolean;
  jid: any;
  instance?: WhatsAppInstance;
}

export interface ConnectResponse {
  connected: boolean;
  loggedIn: boolean;
  jid: any;
  instance: WhatsAppInstance;
}

export interface PrivacySettings {
  groupadd?: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  last?: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  status?: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  profile?: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  readreceipts?: 'all' | 'none';
  online?: 'all' | 'match_last_seen';
  calladd?: 'all' | 'known';
}

/**
 * Token da instância de notificações
 * Usado para enviar mensagens de status (conectado/desconectado)
 */
const NOTIFICATION_INSTANCE_TOKEN = 'b2e97825-2d28-4646-ae38-3357fcbf0e20';

/**
 * Cliente da API WhatsApp
 */
export class WhatsAppAPIClient {
  private instanceToken: string;
  private instanceId: string;

  constructor(instanceId: string, instanceToken: string = '') {
    this.instanceId = instanceId;
    this.instanceToken = instanceToken;
  }

  setInstanceToken(token: string) {
    this.instanceToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    let url = `${API_BASE_URL}${endpoint}`;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Endpoints que usam admintoken no header
    const useAdminToken = endpoint.includes('/instance/init') || 
                          endpoint.includes('/instance/all');
    
    if (useAdminToken) {
      if (!API_TOKEN) {
        throw new Error('NEXT_PUBLIC_WHATSAPP_API_TOKEN não configurado no .env');
      }
      headers['admintoken'] = API_TOKEN;
    } else if (endpoint.includes('/instance/status')) {
      // Status usa token da instância (não admin token)
      if (!this.instanceToken) {
        throw new Error('Token da instância não configurado para verificar status');
      }
      headers['token'] = this.instanceToken;
      url += `?id=${this.instanceId}`;
    } else if (options.method === 'DELETE') {
      // DELETE usa token da instância no header
      if (!this.instanceToken) {
        throw new Error('Token da instância não configurado para DELETE');
      }
      headers['token'] = this.instanceToken;
    } else if (endpoint.includes('/webhook') || endpoint.includes('/instance/connect') || endpoint.includes('/instance/disconnect')) {
      // Webhook, connect e disconnect usam token no header
      headers['token'] = this.instanceToken;
    } else {
      // Outros endpoints: token na query string
      url += `${endpoint.includes('?') ? '&' : '?'}token=${this.instanceToken || API_TOKEN}`;
    }
    
    // Request silencioso (sem logs)
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Criar instância
   * @param name - Nome da instância
   * @param systemName - Nome do sistema (ex: 'Chrome Windows', 'Safari macOS') - Opcional
   */
  async createInstance(name: string, systemName?: string): Promise<any> {
    const body: any = { name };
    if (systemName) {
      body.systemName = systemName;
    }
    
    return this.request('/instance/init', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Conectar instância ao WhatsApp
   * @param phone - Número de telefone no formato internacional (ex: 5511999999999) - Opcional
   * @returns QR code ou código de pareamento
   */
  async connect(phone?: string): Promise<ConnectResponse> {
    const options: RequestInit = {
      method: 'POST',
    };
    
    if (phone) {
      options.body = JSON.stringify({ phone });
    }
    
    return this.request<ConnectResponse>('/instance/connect', options);
  }

  /**
   * Verificar status da instância
   * @returns Status atual da conexão
   */
  async getStatus(): Promise<{ instance: WhatsAppInstance; status: WhatsAppStatus }> {
    return this.request('/instance/status', {
      method: 'GET',
    });
  }

  /**
   * Desconectar instância
   */
  async disconnect(): Promise<{ response: string; info: string }> {
    return this.request('/instance/disconnect', {
      method: 'POST',
    });
  }

  /**
   * Deletar instância
   */
  async deleteInstance(): Promise<{ response: string; info: string }> {
    return this.request('/instance', {
      method: 'DELETE',
    });
  }

  /**
   * Atualizar nome da instância
   * @param name - Novo nome
   */
  async updateName(name: string): Promise<WhatsAppInstance> {
    return this.request('/instance/updateInstanceName', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Atualizar status de presença
   * @param presence - 'available' ou 'unavailable'
   */
  async updatePresence(presence: 'available' | 'unavailable'): Promise<{ response: string }> {
    return this.request('/instance/presence', {
      method: 'POST',
      body: JSON.stringify({ presence }),
    });
  }

  /**
   * Buscar configurações de privacidade
   */
  async getPrivacy(): Promise<PrivacySettings> {
    return this.request('/instance/privacy', {
      method: 'GET',
    });
  }

  /**
   * Alterar configurações de privacidade
   * @param settings - Configurações a alterar
   */
  async updatePrivacy(settings: PrivacySettings): Promise<PrivacySettings> {
    return this.request('/instance/privacy', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  /**
   * Enviar mensagem de texto
   * @param number - Número do destinatário (formato: 5511999999999)
   * @param text - Texto da mensagem
   */
  async sendTextMessage(number: string, text: string): Promise<any> {
    return this.request('/send/text', {
      method: 'POST',
      body: JSON.stringify({
        number,
        text,
      }),
    });
  }

  /**
   * Configurar webhook da instância
   * @param webhookUrl - URL do webhook
   * @param events - Eventos para enviar (ex: ['messages'])
   * @param excludeMessages - Filtros de mensagens
   */
  async setWebhook(webhookUrl: string, events: string[] = ['messages'], excludeMessages: string[] = ['wasSentByApi', 'isGroupYes']): Promise<any> {
    return this.request('/webhook', {
      method: 'POST',
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        events: events,
        excludeMessages: excludeMessages
      }),
    });
  }

  /**
   * Buscar todas as instâncias
   */
  async getAllInstances(): Promise<any[]> {
    return this.request<any[]>('/instance/all', {
      method: 'GET',
    });
  }
}

/**
 * Enviar notificação de status via instância de notificações
 * @param number - Número do negócio (formato: 5511999999999)
 * @param text - Mensagem a enviar
 */
export async function sendStatusNotification(
  number: string,
  text: string
): Promise<void> {
  try {
    const url = `${API_BASE_URL}/send/text`;
    
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
        'instanceToken': NOTIFICATION_INSTANCE_TOKEN,
      },
      body: JSON.stringify({
        number,
        text,
      }),
    });
  } catch (error) {
    // Silencioso
  }
}

/**
 * Hook helper para polling de status
 */
export async function pollStatus(
  client: WhatsAppAPIClient,
  onUpdate: (status: WhatsAppStatus) => void,
  intervalMs: number = 2000,
  maxAttempts: number = 60 // 2 minutos
): Promise<void> {
  let attempts = 0;

  const poll = async (): Promise<boolean> => {
    try {
      const { status } = await client.getStatus();
      onUpdate(status);
      
      // Parar polling se conectado ou exceder tentativas
      if (status.connected || attempts >= maxAttempts) {
        return true;
      }
      
      attempts++;
      return false;
    } catch (error) {
      attempts++;
      return attempts >= maxAttempts;
    }
  };

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      const shouldStop = await poll();
      if (shouldStop) {
        clearInterval(interval);
        resolve();
      }
    }, intervalMs);
  });
}
