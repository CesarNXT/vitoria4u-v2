/**
 * Validador de Variáveis de Ambiente
 * Garante que todas as variáveis críticas estejam configuradas antes do sistema iniciar
 */

interface EnvConfig {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvConfig[] = [
  // Firebase (OBRIGATÓRIAS)
  {
    name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    required: true,
    description: 'ID do projeto Firebase'
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_APP_ID',
    required: true,
    description: 'App ID do Firebase'
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_API_KEY',
    required: true,
    description: 'API Key do Firebase'
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    required: true,
    description: 'Auth Domain do Firebase'
  },
  {
    name: 'FIREBASE_SERVICE_ACCOUNT_KEY',
    required: true,
    description: 'Service Account Key do Firebase (JSON)'
  },
  
  // WhatsApp API (OBRIGATÓRIAS)
  {
    name: 'NEXT_PUBLIC_WHATSAPP_API_URL',
    required: true,
    description: 'URL base da API WhatsApp'
  },
  {
    name: 'NEXT_PUBLIC_WHATSAPP_API_TOKEN',
    required: true,
    description: 'Token de admin da API WhatsApp'
  },
  {
    name: 'VITORIA4U_NOTIFICATION_TOKEN',
    required: true,
    description: 'Token de notificações da Vitoria4U'
  },
  
  // Segurança (OBRIGATÓRIAS)
  {
    name: 'CRON_SECRET',
    required: true,
    description: 'Secret para autenticação de cron jobs'
  },
  {
    name: 'ADMIN_SETUP_SECRET',
    required: true,
    description: 'Secret para setup inicial de admins'
  },
  
  // Mercado Pago (OPCIONAL mas recomendado)
  {
    name: 'MERCADOPAGO_ACCESS_TOKEN',
    required: false,
    description: 'Access Token do Mercado Pago'
  },
  {
    name: 'MERCADOPAGO_WEBHOOK_SECRET',
    required: false,
    description: 'Secret para validar webhooks do Mercado Pago'
  },
  
  // Google Gemini AI (OPCIONAL)
  {
    name: 'GEMINI_API_KEY',
    required: false,
    description: 'API Key do Google Gemini para IA'
  },
];

/**
 * Valida todas as variáveis de ambiente obrigatórias
 * Lança erro se alguma variável obrigatória estiver faltando
 * 
 * @throws Error com lista de variáveis faltantes
 */
export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];
    
    if (!value || value.trim() === '') {
      if (envVar.required) {
        missing.push(`${envVar.name} - ${envVar.description}`);
      } else {
        warnings.push(`${envVar.name} - ${envVar.description} (opcional)`);
      }
    }
  }
  
  // Se há variáveis obrigatórias faltando, lançar erro
  if (missing.length > 0) {
    const errorMessage = [
      '❌ Variáveis de ambiente obrigatórias não configuradas:',
      '',
      ...missing.map(m => `  - ${m}`),
      '',
      'Configure essas variáveis no arquivo .env antes de iniciar o sistema.',
      'Veja .env.example para referência.',
    ].join('\n');
    
    throw new Error(errorMessage);
  }
  
  // Avisos para variáveis opcionais
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Variáveis opcionais não configuradas:');
    warnings.forEach(w => console.warn(`  - ${w}`));
  }
  
  console.log('✅ Variáveis de ambiente validadas com sucesso');
}

/**
 * Valida apenas se existe, sem lançar erro
 * Útil para validações condicionais
 * 
 * @param envName - Nome da variável de ambiente
 * @returns true se existe e não está vazia, false caso contrário
 */
export function hasEnv(envName: string): boolean {
  const value = process.env[envName];
  return Boolean(value && value.trim() !== '');
}

/**
 * Obtém variável de ambiente ou lança erro se não existir
 * Útil para forçar que uma variável exista em runtime
 * 
 * @param envName - Nome da variável de ambiente
 * @param errorMessage - Mensagem de erro customizada (opcional)
 * @returns Valor da variável
 * @throws Error se variável não existir
 */
export function requireEnv(envName: string, errorMessage?: string): string {
  const value = process.env[envName];
  
  if (!value || value.trim() === '') {
    throw new Error(
      errorMessage || `Variável de ambiente ${envName} é obrigatória mas não está configurada`
    );
  }
  
  return value;
}
