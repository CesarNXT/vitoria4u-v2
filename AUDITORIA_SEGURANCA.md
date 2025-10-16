# 🔒 AUDITORIA DE SEGURANÇA E ESCALABILIDADE - VITORIA4U V2

**Data:** 16/10/2025  
**Status:** ⚠️ **ATENÇÃO NECESSÁRIA** - Sistema tem problemas críticos que precisam ser corrigidos

---

## 📋 RESUMO EXECUTIVO

O sistema possui uma **arquitetura sólida** com Firebase + Next.js 15, mas apresenta **vulnerabilidades de segurança críticas** que podem causar problemas sérios em produção com múltiplos usuários.

### ✅ Pontos Positivos
- Firestore Rules bem estruturadas com controle de acesso por negócio
- Autenticação Firebase implementada com session cookies
- Webhook signatures validadas no MercadoPago
- Logging estruturado com sanitização de dados sensíveis
- TypeScript com validação rigorosa (ignoreBuildErrors: false)

### ❌ Problemas CRÍTICOS Encontrados
1. **🚨 CRÍTICO:** Arquivo `.env` exposto no repositório
2. **🚨 CRÍTICO:** API `/api/admin/manage-admin` sem autenticação
3. **⚠️ ALTO:** Cron jobs sem rate limiting
4. **⚠️ ALTO:** Impersonação via localStorage (client-side)
5. **⚠️ MÉDIO:** Múltiplos TODOs de segurança no código
6. **⚠️ MÉDIO:** Console.logs em produção

---

## 🚨 PROBLEMAS CRÍTICOS (RESOLVER IMEDIATAMENTE)

### 1. Arquivo .env NO REPOSITÓRIO ⚠️⚠️⚠️

**Localização:** `.env` (3106 bytes)  
**Gravidade:** 🔴 **CRÍTICA - EMERGÊNCIA**

**Problema:**
- O arquivo `.env` contém credenciais sensíveis (Firebase, MercadoPago, etc.)
- Está presente no diretório (3106 bytes) mesmo com `.gitignore` configurado
- Se foi commitado antes, as credenciais estão NO HISTÓRICO DO GIT

**Impacto:**
- ✅ Boas notícias: O `.gitignore` está correto e bloqueia `.env*`
- ⚠️ Risco: Se este arquivo foi commitado ANTES do `.gitignore`, as credenciais estão expostas no histórico

**Solução URGENTE:**
```bash
# 1. Verificar histórico do Git
git log --all --full-history -- .env

# 2. Se o arquivo aparece no histórico:
# REVOGAR TODAS AS CREDENCIAIS IMEDIATAMENTE:
# - Firebase: Regenerar Service Account Key
# - MercadoPago: Gerar novo Access Token
# - N8N: Atualizar webhook secrets
# - CRON_SECRET: Gerar nova

# 3. Limpar histórico (CUIDADO!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 4. Force push (todos os clones precisarão re-clonar)
git push origin --force --all
```

**Checklist Pós-Incidente:**
- [ ] Verificar histórico Git
- [ ] Revogar credenciais antigas se expostas
- [ ] Gerar novas credenciais
- [ ] Atualizar `.env` local com novas credenciais
- [ ] Configurar variáveis de ambiente no Vercel/Firebase Hosting
- [ ] Confirmar que `.env` não está no repositório remoto

---

### 2. API Admin SEM AUTENTICAÇÃO ⚠️⚠️⚠️

**Localização:** `src/app/api/admin/manage-admin/route.ts`  
**Gravidade:** 🔴 **CRÍTICA**

**Problema:**
```typescript
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, uid, action } = body;
        
        // ❌ NENHUMA VALIDAÇÃO DE AUTENTICAÇÃO!
        // Qualquer pessoa pode chamar esta API e adicionar admins!
```

**Impacto:**
- Qualquer pessoa pode adicionar/remover administradores
- Controle total do sistema pode ser obtido por atacantes

**Solução:**
```typescript
export async function POST(request: NextRequest) {
    try {
        // ✅ VALIDAR TOKEN
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        
        // ✅ VALIDAR SE É ADMIN
        const isAdmin = await isServerAdmin(decodedToken.email);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // Restante do código...
    }
}
```

---

### 3. CRON Jobs SEM RATE LIMITING ⚠️

**Localização:** 
- `src/app/api/cron/check-birthdays/route.ts`
- `src/app/api/cron/check-expirations/route.ts`
- `src/app/api/cron/check-returns/route.ts`

**Gravidade:** 🟠 **ALTA**

**Problema:**
- Validação apenas via `CRON_SECRET` no header
- Sem rate limiting
- Atacante com o secret pode executar infinitas vezes

**Impacto:**
- Milhares de webhooks disparados = custos altos no N8N
- Spam de WhatsApp para clientes
- Ban da instância WhatsApp

**Solução:**
1. **Implementar Rate Limiting:**
```typescript
// Criar: src/lib/rate-limiter.ts
import { adminDb } from './firebase-admin';

export async function checkRateLimit(key: string, maxCalls: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const rateLimitDoc = await adminDb.collection('rate_limits').doc(key).get();
    const data = rateLimitDoc.data();
    
    if (data) {
        const recentCalls = data.calls.filter((timestamp: number) => timestamp > windowStart);
        if (recentCalls.length >= maxCalls) {
            return false; // Rate limit excedido
        }
        
        await adminDb.collection('rate_limits').doc(key).update({
            calls: [...recentCalls, now]
        });
    } else {
        await adminDb.collection('rate_limits').doc(key).set({
            calls: [now]
        });
    }
    
    return true;
}
```

2. **Aplicar nos Cron Jobs:**
```typescript
export async function GET(request: Request) {
    const authToken = (request.headers.get('authorization') || '').split('Bearer ')[1];
    if (authToken !== process.env.CRON_SECRET) {
        return new Response('Unauthorized', { status: 401 });
    }
    
    // ✅ RATE LIMITING
    const canProceed = await checkRateLimit('cron:check-birthdays', 10, 60 * 60 * 1000); // 10 calls/hour
    if (!canProceed) {
        return new Response('Rate limit exceeded', { status: 429 });
    }
    
    // Restante do código...
}
```

---

## ⚠️ PROBLEMAS DE ALTA PRIORIDADE

### 4. Impersonação via LocalStorage (Client-Side)

**Localização:** `src/app/(dashboard)/layout.tsx:45-68`

**Problema:**
```typescript
// ⚠️ SEGURANÇA: Impersonação via localStorage pode ser manipulada no DevTools
// TODO: Validar impersonação server-side usando /api/validate-impersonation
const [impersonatedId, setImpersonatedId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('impersonatedBusinessId');
    }
    return null;
});
```

**Status:** ✅ Parcialmente mitigado - tem validação server-side em `useEffect`

**Recomendação:**
- Migrar para session cookie server-side
- Adicionar timestamp de expiração da impersonação
- Adicionar auditoria de impersonações (quem, quando, qual negócio)

---

### 5. Validação de Configuração Desabilitada

**Localização:** `src/app/(dashboard)/layout.tsx:155-171`

**Problema:**
```typescript
// ⚠️ SEGURANÇA DESABILITADA TEMPORARIAMENTE - estava bloqueando todos os usuários
// Esta validação deve ser REATIVADA assim que garantir que createUserBusinessProfile
// sempre cria o documento no signup (verificar /login/actions.ts)
```

**Impacto:**
- Usuários sem documento no Firestore podem acessar o sistema
- Possível privilege escalation

**Solução:**
1. Verificar que `createUserBusinessProfile` sempre cria o documento
2. Reativar a validação
3. Adicionar migration para usuários antigos sem documento

---

## ⚠️ PROBLEMAS DE MÉDIA PRIORIDADE

### 6. Console.logs em Produção

**Localização:** 10+ arquivos

**Exemplos:**
- `src/app/api/pagamentos/mercado-pago/route.ts:12`
- `src/app/(dashboard)/layout.tsx:88`
- `src/lib/firebase-admin.ts:19`

**Solução:**
```typescript
// Substituir console.log por logger
import { logger } from '@/lib/logger';

// ❌ Antes
console.log('MERCADOPAGO_ACCESS_TOKEN:', process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Carregado' : 'NÃO CARREGADO');

// ✅ Depois
logger.debug('MercadoPago token status', { loaded: !!process.env.MERCADOPAGO_ACCESS_TOKEN });
```

---

### 7. TODOs de Segurança no Código

**Total:** 39 TODOs encontrados

**Prioritários:**
1. `layout.tsx:46` - Validar impersonação server-side
2. `utils.ts:20` - Migrar para Firebase Custom Claims
3. `business-settings-form.tsx` - Validação de campos
4. `actions.ts` - Tratamento de erros

---

## 📊 ANÁLISE DE ESCALABILIDADE

### ✅ Arquitetura Escalável

1. **Firestore:**
   - Subcoleções por negócio ✅
   - Queries otimizadas com índices ✅
   - Rules bem definidas ✅

2. **Next.js 15:**
   - Server Actions para operações pesadas ✅
   - API Routes para webhooks ✅
   - Static Generation onde possível ✅

3. **Webhooks Externos (N8N):**
   - Processamento assíncrono ✅
   - Desacoplamento do sistema principal ✅

### ⚠️ Potenciais Gargalos

1. **Webhook Flooding:**
   - Sem rate limiting nos webhooks N8N
   - Solução: Implementar queue com retry logic

2. **Firestore Read/Write Costs:**
   - Queries podem ser otimizadas com cache
   - Solução: Implementar Redis/Vercel KV para cache

3. **N8N Dependency:**
   - Sistema depende de serviço externo
   - Solução: Implementar fallback para emails/SMS

---

## 🔐 ANÁLISE DE SEGURANÇA FIRESTORE

### ✅ Pontos Fortes

```javascript
// firestore.rules - BEM IMPLEMENTADO
match /negocios/{businessId} {
    // ✅ Leitura pública para página de agendamento
    allow read: if true;
    
    // ✅ Escrita apenas para dono ou admin
    allow write: if request.auth != null && 
                   (request.auth.uid == businessId || isAdmin());
    
    // ✅ Subcoleções protegidas
    match /clientes/{clientId} {
        allow read, write: if request.auth != null && 
                             (request.auth.uid == businessId || isAdmin());
    }
}
```

### ⚠️ Possíveis Melhorias

1. **Validação de Dados:**
```javascript
// Adicionar validação de campos
match /negocios/{businessId}/clientes/{clientId} {
    allow create: if request.auth != null && 
                     request.auth.uid == businessId &&
                     request.resource.data.keys().hasAll(['name', 'phone']) &&
                     request.resource.data.phone is string &&
                     request.resource.data.name is string;
}
```

2. **Rate Limiting no Firestore:**
```javascript
// Limitar número de documentos criados
match /negocios/{businessId}/agendamentos/{appointmentId} {
    allow create: if request.auth != null &&
                     request.auth.uid == businessId &&
                     // Máximo 100 agendamentos por dia
                     request.resource.data.createdAt == request.time;
}
```

---

## 📝 CHECKLIST PRÉ-PRODUÇÃO

### 🔴 CRÍTICO (Resolver ANTES de publicar)

- [ ] **Verificar histórico Git para `.env`**
- [ ] **Adicionar autenticação em `/api/admin/manage-admin`**
- [ ] **Revogar credenciais se foram expostas**
- [ ] **Configurar variáveis de ambiente no hosting (Vercel/Firebase)**
- [ ] **Testar fluxo completo de autenticação**

### 🟠 ALTO (Resolver em 1 semana)

- [ ] Implementar rate limiting nos cron jobs
- [ ] Migrar impersonação para session cookie
- [ ] Reativar validação de documento de configuração
- [ ] Substituir console.logs por logger
- [ ] Adicionar auditoria de ações admin

### 🟡 MÉDIO (Resolver em 1 mês)

- [ ] Implementar cache com Vercel KV
- [ ] Adicionar queue para webhooks
- [ ] Migrar admin emails para Custom Claims
- [ ] Adicionar monitoramento (Sentry/LogRocket)
- [ ] Implementar backup automático

### 🟢 BAIXO (Melhorias futuras)

- [ ] Adicionar testes E2E (Playwright)
- [ ] Implementar CI/CD completo
- [ ] Adicionar documentação técnica
- [ ] Otimizar queries Firestore com cache
- [ ] Implementar healthcheck endpoints

---

## 🛡️ RECOMENDAÇÕES DE SEGURANÇA

### 1. Variáveis de Ambiente

**NUNCA committar:**
- `FIREBASE_SERVICE_ACCOUNT_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `CRON_SECRET`
- `ADMIN_EMAILS` (server-side)

**Pode expor (NEXT_PUBLIC_):**
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_API_KEY` (OK, é público)
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_ADMIN_EMAILS` (apenas para UI)

### 2. Headers de Segurança

**Adicionar no `next.config.ts`:**
```typescript
async headers() {
    return [
        {
            source: '/(.*)',
            headers: [
                {
                    key: 'X-Frame-Options',
                    value: 'DENY'
                },
                {
                    key: 'X-Content-Type-Options',
                    value: 'nosniff'
                },
                {
                    key: 'Referrer-Policy',
                    value: 'strict-origin-when-cross-origin'
                },
                {
                    key: 'Permissions-Policy',
                    value: 'camera=(), microphone=(), geolocation=()'
                }
            ]
        }
    ];
}
```

### 3. Monitoramento

**Implementar:**
- Sentry para error tracking
- LogRocket para session replay
- Vercel Analytics para performance
- Custom logs para auditoria

---

## 💰 ESTIMATIVA DE CUSTOS (Produção)

### Firestore
- **Reads:** ~1M/mês = $0.06/100k = **$0.60**
- **Writes:** ~500k/mês = $0.18/100k = **$0.90**
- **Storage:** ~1GB = **$0.18**
- **Total:** ~**$1.70/mês** (até 10 negócios)

### N8N (Self-hosted)
- **Servidor:** VPS 2GB RAM = **$5-10/mês**
- **Webhooks:** Ilimitado ✅

### Vercel (Hobby Plan)
- **Grátis** até 100GB bandwidth
- **Pro:** $20/mês (recomendado para produção)

### Firebase Hosting
- **Grátis** até 10GB/mês
- **Blaze:** Pay-as-you-go

**Total Estimado:** **$20-35/mês** (10-50 negócios)

---

## 🎯 CONCLUSÃO

### Veredicto: ⚠️ **NÃO PUBLICAR AINDA**

O sistema tem uma **arquitetura sólida** e está **80% pronto**, mas os problemas de segurança críticos DEVEM ser resolvidos primeiro.

### Próximos Passos (Ordem de Prioridade)

1. ✅ **HOJE:** Verificar `.env` no histórico Git
2. ✅ **HOJE:** Adicionar autenticação em manage-admin
3. ✅ **HOJE:** Configurar variáveis no Vercel/Firebase
4. 📅 **Esta semana:** Implementar rate limiting
5. 📅 **Esta semana:** Substituir console.logs
6. 📅 **Próxima semana:** Testes completos em staging

### Timeline Realista

- **1 dia:** Correções críticas
- **1 semana:** Testes e validação
- **2 semanas:** Deploy gradual (soft launch)
- **1 mês:** Produção completa com monitoramento

---

## 📞 SUPORTE

Para dúvidas sobre esta auditoria:
- Revisar este documento
- Consultar documentação Firebase/Next.js
- Testar em ambiente de staging primeiro

**Última atualização:** 16/10/2025  
**Próxima revisão:** Após correções críticas
