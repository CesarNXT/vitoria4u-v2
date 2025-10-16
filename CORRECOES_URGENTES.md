# 🚨 CORREÇÕES URGENTES - LISTA DE TAREFAS

## ✅ TAREFA 1: Verificar e Proteger .env

### Passo 1: Verificar Histórico Git
```bash
# Verificar se .env foi commitado
git log --all --full-history -- .env
git log --all --full-history -- **/.env*
```

### Passo 2A: SE NÃO APARECEU NO HISTÓRICO (Melhor Cenário)
```bash
# Apenas garantir que está no .gitignore
echo "✅ Seguro - .env nunca foi commitado"

# Verificar .gitignore
cat .gitignore | grep ".env"
# Deve aparecer: .env*
```

### Passo 2B: SE APARECEU NO HISTÓRICO (Pior Cenário)
```bash
# ⚠️ EMERGÊNCIA - Seguir estes passos IMEDIATAMENTE:

# 1. Revocar TODAS as credenciais:
# - Firebase Console → Service Accounts → Deletar key antiga
# - MercadoPago → Configurações → Revogar Access Token
# - Gerar novo CRON_SECRET

# 2. Limpar histórico (BACKUP PRIMEIRO!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push
git push origin --force --all
git push origin --force --tags

# 4. Avisar equipe para re-clonar
echo "⚠️ Todos devem deletar clone local e re-clonar!"
```

### Passo 3: Configurar Variáveis no Vercel
```bash
# No dashboard do Vercel:
# Settings → Environment Variables → Add

# Adicionar TODAS as variáveis do .env:
# - FIREBASE_SERVICE_ACCOUNT_KEY (novo!)
# - MERCADOPAGO_ACCESS_TOKEN (novo!)
# - MERCADOPAGO_WEBHOOK_SECRET
# - CRON_SECRET (novo!)
# - ADMIN_EMAILS
# - NEXT_PUBLIC_* (públicas, OK)
```

---

## ✅ TAREFA 2: Corrigir API Admin (manage-admin)

### Localização
`src/app/api/admin/manage-admin/route.ts`

### Código Atual (INSEGURO)
```typescript
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, uid, action } = body;
        // ❌ SEM VALIDAÇÃO!
```

### Código Corrigido (SEGURO)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { isServerAdmin } from '@/lib/server-admin-utils';
import { logger, sanitizeForLog } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        // ✅ 1. VALIDAR TOKEN
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('Tentativa de acesso sem token', {
                ip: request.headers.get('x-forwarded-for'),
                userAgent: request.headers.get('user-agent')
            });
            return NextResponse.json(
                { error: 'Token de autenticação não fornecido.' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken;
        
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (error) {
            logger.error('Token inválido', sanitizeForLog(error));
            return NextResponse.json(
                { error: 'Token de autenticação inválido.' },
                { status: 401 }
            );
        }

        // ✅ 2. VALIDAR SE É ADMIN
        const isAdmin = await isServerAdmin(decodedToken.email);
        if (!isAdmin) {
            logger.warn('Tentativa de acesso não autorizado', {
                email: decodedToken.email,
                uid: decodedToken.uid
            });
            return NextResponse.json(
                { error: 'Acesso negado. Apenas administradores podem gerenciar admins.' },
                { status: 403 }
            );
        }

        // ✅ 3. AUDITORIA
        logger.info('Admin gerenciando permissões', {
            adminEmail: decodedToken.email,
            adminUid: decodedToken.uid
        });

        const body = await request.json();
        const { email, uid, action } = body;

        // Restante do código continua igual...
        if (!action || (action !== 'add' && action !== 'remove')) {
            return NextResponse.json(
                { error: 'Action deve ser "add" ou "remove"' },
                { status: 400 }
            );
        }

        if (action === 'add') {
            if (!email) {
                return NextResponse.json(
                    { error: 'Email é obrigatório' },
                    { status: 400 }
                );
            }

            let user;
            try {
                user = await adminAuth.getUserByEmail(email);
            } catch (error) {
                return NextResponse.json(
                    { error: 'Usuário não encontrado. O usuário deve ter feito login pelo menos uma vez.' },
                    { status: 404 }
                );
            }

            const adminRef = adminDb.collection('admin').doc(user.uid);
            const adminDoc = await adminRef.get();

            if (adminDoc.exists && adminDoc.data()?.isAdmin) {
                return NextResponse.json(
                    { error: 'Este usuário já é administrador' },
                    { status: 400 }
                );
            }

            await adminRef.set({
                email: user.email,
                isAdmin: true,
                createdAt: new Date(),
                createdBy: decodedToken.uid, // ✅ Auditoria
            });

            logger.success('Admin adicionado', sanitizeForLog({ 
                uid: user.uid, 
                email: user.email,
                by: decodedToken.email
            }));

            return NextResponse.json({
                success: true,
                message: 'Admin adicionado com sucesso!',
                uid: user.uid,
                email: user.email,
            });
        }

        if (action === 'remove') {
            if (!uid) {
                return NextResponse.json(
                    { error: 'UID é obrigatório para remover' },
                    { status: 400 }
                );
            }

            // ✅ Não permitir remover a si mesmo
            if (uid === decodedToken.uid) {
                return NextResponse.json(
                    { error: 'Você não pode remover sua própria permissão de admin' },
                    { status: 400 }
                );
            }

            const adminsSnapshot = await adminDb.collection('admin').where('isAdmin', '==', true).get();
            if (adminsSnapshot.size <= 1) {
                return NextResponse.json(
                    { error: 'Não é possível remover o último administrador' },
                    { status: 400 }
                );
            }

            await adminDb.collection('admin').doc(uid).delete();

            logger.success('Admin removido', sanitizeForLog({ 
                uid,
                by: decodedToken.email
            }));

            return NextResponse.json({
                success: true,
                message: 'Admin removido com sucesso!',
            });
        }

    } catch (error: any) {
        logger.error('Erro ao gerenciar admin', sanitizeForLog(error));
        return NextResponse.json(
            { error: 'Erro ao processar solicitação', details: error.message },
            { status: 500 }
        );
    }
}
```

---

## ✅ TAREFA 3: Implementar Rate Limiting

### Criar arquivo: `src/lib/rate-limiter.ts`

```typescript
import { adminDb } from './firebase-admin';
import { logger } from './logger';

interface RateLimitConfig {
    maxCalls: number;
    windowMs: number;
}

/**
 * Verifica rate limit baseado em Firestore
 * @param key - Identificador único (ex: 'cron:check-birthdays')
 * @param maxCalls - Número máximo de chamadas
 * @param windowMs - Janela de tempo em milissegundos
 */
export async function checkRateLimit(
    key: string,
    maxCalls: number,
    windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
    try {
        const now = Date.now();
        const windowStart = now - windowMs;
        
        const rateLimitRef = adminDb.collection('rate_limits').doc(key);
        const rateLimitDoc = await rateLimitRef.get();
        
        if (!rateLimitDoc.exists) {
            // Primeira chamada
            await rateLimitRef.set({
                calls: [now],
                createdAt: new Date(),
            });
            return { allowed: true, remaining: maxCalls - 1 };
        }
        
        const data = rateLimitDoc.data();
        if (!data) {
            return { allowed: false, remaining: 0 };
        }
        
        // Filtrar apenas chamadas dentro da janela de tempo
        const recentCalls = (data.calls || []).filter(
            (timestamp: number) => timestamp > windowStart
        );
        
        if (recentCalls.length >= maxCalls) {
            logger.warn('Rate limit excedido', { key, calls: recentCalls.length, maxCalls });
            return { allowed: false, remaining: 0 };
        }
        
        // Atualizar com nova chamada
        await rateLimitRef.update({
            calls: [...recentCalls, now],
            lastUpdated: new Date(),
        });
        
        return { allowed: true, remaining: maxCalls - recentCalls.length - 1 };
        
    } catch (error) {
        logger.error('Erro ao verificar rate limit', { key, error });
        // Em caso de erro, permitir (fail open) para não quebrar funcionalidade
        return { allowed: true, remaining: 0 };
    }
}

/**
 * Limpa registros antigos de rate limit (executar periodicamente)
 */
export async function cleanupRateLimits(): Promise<void> {
    try {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const snapshot = await adminDb.collection('rate_limits')
            .where('lastUpdated', '<', new Date(oneDayAgo))
            .get();
        
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        
        logger.info('Rate limits antigos limpos', { count: snapshot.size });
    } catch (error) {
        logger.error('Erro ao limpar rate limits', error);
    }
}
```

### Aplicar em Cron Jobs

#### Exemplo: `src/app/api/cron/check-birthdays/route.ts`

```typescript
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(request: Request) {
    const authToken = (request.headers.get('authorization') || '').split('Bearer ')[1];

    if (authToken !== process.env.CRON_SECRET) {
        return new Response('Unauthorized', { status: 401 });
    }
    
    // ✅ RATE LIMITING: Máximo 10 execuções por hora
    const rateLimit = await checkRateLimit('cron:check-birthdays', 10, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
        logger.warn('Rate limit excedido para check-birthdays');
        return new Response('Rate limit exceeded', { status: 429 });
    }
    
    try {
        // Código existente...
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        // ... resto do código
    } catch (error) {
        logger.error('CRON Job (check-birthdays) failed', sanitizeForLog(error));
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
```

#### Aplicar em TODOS os cron jobs:
- ✅ `check-birthdays/route.ts` - 10 calls/hour
- ✅ `check-expirations/route.ts` - 20 calls/hour (executa a cada 6h)
- ✅ `check-returns/route.ts` - 10 calls/hour

---

## ✅ TAREFA 4: Substituir Console.logs

### Criar script de busca e substituição

```bash
# Encontrar todos os console.log
grep -r "console.log" src/ --include="*.ts" --include="*.tsx"

# Substituir manualmente por logger equivalente:
# console.log → logger.debug
# console.error → logger.error
# console.warn → logger.warn
```

### Principais arquivos para corrigir:

1. **`src/app/api/pagamentos/mercado-pago/route.ts:12`**
```typescript
// ❌ Antes
console.log('MERCADOPAGO_ACCESS_TOKEN:', process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Carregado' : 'NÃO CARREGADO');

// ✅ Depois
logger.debug('MercadoPago token status', { loaded: !!process.env.MERCADOPAGO_ACCESS_TOKEN });
```

2. **`src/app/(dashboard)/layout.tsx:88`**
```typescript
// ❌ Antes
console.error('🚨 Impersonação inválida detectada:', data.error);

// ✅ Depois
logger.error('Impersonação inválida detectada', { error: data.error });
```

3. **`src/lib/firebase-admin.ts:19,26,29,30`**
```typescript
// ❌ Antes
console.log('Firebase Admin SDK inicializado.');
console.warn('Firebase Admin SDK inicializado via ADC (fallback).');
console.error('Falha ao inicializar Firebase Admin SDK (fallback):', fallbackError);

// ✅ Depois
logger.info('Firebase Admin SDK inicializado');
logger.warn('Firebase Admin SDK inicializado via ADC (fallback)');
logger.error('Falha ao inicializar Firebase Admin SDK (fallback)', sanitizeForLog(fallbackError));
```

---

## ✅ TAREFA 5: Configurar Variáveis de Ambiente

### Estrutura Recomendada

#### `.env.local` (Desenvolvimento - NÃO COMMITAR)
```bash
# Firebase Client (públicas)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456

# Firebase Admin (SECRETA)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# MercadoPago (SECRETAS)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=seu-secret

# Cron (SECRETA)
CRON_SECRET=gerar-random-string-segura

# Admin (SECRETA - server-side)
ADMIN_EMAILS=seu-email@gmail.com

# Admin (PÚBLICA - client-side UI)
NEXT_PUBLIC_ADMIN_EMAILS=seu-email@gmail.com
```

#### `.env.example` (Template - PODE COMMITAR)
```bash
# Firebase Client
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_KEY=

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=

# Cron
CRON_SECRET=

# Admin
ADMIN_EMAILS=
NEXT_PUBLIC_ADMIN_EMAILS=
```

### Gerar CRON_SECRET Seguro
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32|%{Get-Random -Minimum 0 -Maximum 256}))

# Online (se não tiver openssl)
# https://generate-secret.vercel.app/32
```

---

## 🧪 TAREFA 6: Testar Tudo

### Checklist de Testes

#### Autenticação
- [ ] Login com Google funciona
- [ ] Login com Email/Password funciona
- [ ] Logout funciona
- [ ] Session cookie persiste após refresh
- [ ] Session expira após 5 dias

#### Admin
- [ ] Admin consegue acessar /admin/dashboard
- [ ] Admin consegue impersonar negócio
- [ ] Impersonação é validada server-side
- [ ] Não-admin não consegue acessar admin panel
- [ ] `/api/admin/manage-admin` requer autenticação

#### Cron Jobs
- [ ] `check-birthdays` executa com CRON_SECRET correto
- [ ] `check-birthdays` retorna 401 com secret errado
- [ ] `check-birthdays` retorna 429 após 10 chamadas/hora
- [ ] `check-expirations` funciona corretamente
- [ ] `check-returns` funciona corretamente

#### Webhooks
- [ ] MercadoPago webhook valida assinatura
- [ ] Pagamento aprovado atualiza Firestore
- [ ] N8N webhooks são chamados corretamente

#### Firestore Rules
- [ ] Negócio só acessa seus próprios dados
- [ ] Cliente não logado pode ver página de agendamento
- [ ] Cliente não logado NÃO pode ver lista de clientes
- [ ] Admin pode ler/escrever tudo

---

## 📋 TIMELINE DE EXECUÇÃO

### DIA 1 (HOJE - 2-3 horas)
- [ ] Tarefa 1: Verificar .env no Git (15 min)
- [ ] Tarefa 2: Corrigir manage-admin (30 min)
- [ ] Tarefa 5: Configurar variáveis Vercel (30 min)
- [ ] Tarefa 6: Testes básicos (1 hora)

### DIA 2 (Amanhã - 3-4 horas)
- [ ] Tarefa 3: Implementar rate limiting (2 horas)
- [ ] Tarefa 4: Substituir console.logs (1 hora)
- [ ] Tarefa 6: Testes completos (1 hora)

### DIA 3 (Deploy)
- [ ] Deploy em staging
- [ ] Testes finais
- [ ] Deploy em produção
- [ ] Monitoramento

---

## 🚀 APÓS CORREÇÕES

### Commit das Mudanças
```bash
git add .
git commit -m "🔒 Security: Critical fixes before production

- Add authentication to /api/admin/manage-admin
- Implement rate limiting on cron jobs
- Replace console.logs with structured logger
- Configure environment variables properly
- Add security headers

BREAKING: Requires new environment variables setup"

git push origin main
```

### Deploy
```bash
# Vercel
vercel --prod

# Ou via GitHub (se configurado)
git push origin main
# Vercel deploya automaticamente
```

### Monitoramento Pós-Deploy
1. Verificar logs no Vercel Dashboard
2. Testar endpoints críticos
3. Monitorar Firestore usage
4. Verificar webhooks N8N
5. Acompanhar custos por 24h

---

## 🆘 SE ALGO DER ERRADO

### Rollback Rápido
```bash
# Vercel
vercel rollback

# Ou via dashboard
# Deployments → Três pontinhos → Rollback
```

### Debug
```bash
# Ver logs em tempo real
vercel logs --follow

# Ver logs de função específica
vercel logs /api/admin/manage-admin
```

---

## ✅ CONCLUSÃO

Após executar TODAS estas tarefas:
1. Sistema estará seguro para produção
2. Rate limiting protegerá contra abuso
3. Auditoria estará completa
4. Logs estruturados facilitarão debug

**Tempo total estimado: 6-8 horas de trabalho focado**

Boa sorte! 🚀
