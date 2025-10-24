# 🛡️ Sistema de Validação de Webhooks

**Objetivo:** Garantir que webhooks estão SEMPRE configuradas corretamente, mesmo se alguém alterar manualmente.

---

## 📋 Por Que Isso é Importante?

### **Problema:**

Webhook da instância pode ficar desconfigurada se:
- ❌ Alguém mudar manualmente no painel UazAPI
- ❌ API falhar ao configurar na primeira vez
- ❌ Instância for deletada e recriada
- ❌ Erro na configuração durante conexão

**Resultado:** IA para de funcionar e você não sabe!

---

## ✅ Solução Implementada

### **Sistema de 3 Camadas:**

1. **Validação Automática na Conexão**
   - Quando instância conecta → Valida webhook em 5s
   - Se incorreta → Corrige automaticamente

2. **Validação Manual via API**
   - Endpoint para validar quando quiser
   - Endpoint para corrigir tudo de uma vez

3. **Validação Periódica (Opcional)**
   - Cron job pode validar a cada X horas
   - Garante que está sempre correto

---

## 🔄 Como Funciona?

### **1. Validação Automática (Já Configurado)**

```typescript
// Quando instância CONECTA:
Connection Event (open)
    ↓
processConnectionEvent()
    ↓
validateWebhookOnConnection() → Em background
    ↓
    ├─ Aguarda 5s (instância estabilizar)
    ├─ Busca webhook atual da API
    ├─ Compara com esperada
    └─ Se diferente → Corrige automaticamente
```

**Arquivo:** `src/app/api/whatsapp/webhook/route.ts` (linhas 422-428)

---

### **2. Validação Manual**

#### **Validar UMA instância:**

```bash
# Ver se webhook está correta
GET /api/admin/validate-webhooks?businessId=abc123

# Resposta:
{
  "businessId": "abc123",
  "isValid": false,
  "currentWebhook": "https://webhook-errada.com",
  "expectedWebhook": "https://n8n.vitoria4u.site/webhook/...",
  "needsFix": true
}
```

#### **Corrigir UMA instância:**

```bash
# Validar e corrigir automaticamente
POST /api/admin/validate-webhooks?businessId=abc123

# Resposta:
{
  "success": true,
  "message": "Webhook corrigida com sucesso"
}
```

---

#### **Validar TODAS as instâncias:**

```bash
# Ver status de todas
GET /api/admin/validate-webhooks?action=validate-all

# Resposta:
{
  "total": 10,
  "valid": 8,
  "needsFix": 2,
  "errors": 0,
  "results": [
    {
      "businessId": "abc123",
      "isValid": true,
      "currentWebhook": "https://n8n...",
      "expectedWebhook": "https://n8n...",
      "needsFix": false
    },
    // ... mais resultados
  ]
}
```

---

#### **Corrigir TODAS as instâncias:**

```bash
# Corrigir todas que precisam
POST /api/admin/validate-webhooks?action=fix-all

# Resposta:
{
  "total": 2,
  "fixed": 2,
  "failed": 0,
  "results": [
    {
      "businessId": "abc123",
      "success": true,
      "message": "Webhook corrigida com sucesso"
    },
    {
      "businessId": "def456",
      "success": true,
      "message": "Webhook corrigida com sucesso"
    }
  ]
}
```

---

## 🔧 Lógica de Validação

### **O que é verificado:**

1. **WhatsApp está conectado?**
   - Se não → Não precisa webhook, retorna OK

2. **Tem feature de IA no plano?**
   - Se sim → Webhook deve ser: `https://n8n.vitoria4u.site/webhook/...`
   - Se não → Webhook deve estar vazia

3. **Webhook atual corresponde?**
   - Busca webhook atual da API
   - Compara com esperada
   - Se diferente → Marca para correção

---

### **Código de Validação:**

```typescript
// src/lib/webhook-validator.ts

async function validateInstanceWebhook(businessId: string) {
  // 1. Buscar negócio
  const business = await getBusinessById(businessId);
  
  // 2. Se não conectado, OK
  if (!business.whatsappConectado) return { isValid: true };
  
  // 3. Determinar webhook esperada
  const hasIA = await checkFeatureAccess(business, 'atendimento_whatsapp_ia');
  const expectedWebhook = hasIA ? N8N_WEBHOOK_URL : '';
  
  // 4. Buscar webhook atual
  const api = new WhatsAppAPI(businessId, business.tokenInstancia);
  const current = await api.getWebhook();
  
  // 5. Comparar
  const isValid = current.url === expectedWebhook;
  const needsFix = !isValid;
  
  return { isValid, needsFix, currentWebhook: current.url, expectedWebhook };
}
```

---

## 📊 Logs e Monitoramento

### **Logs Gerados:**

```
[WEBHOOK-VALIDATOR] Validando webhook após conexão: abc123
[WEBHOOK-VALIDATOR] ✅ Webhook validada: abc123

OU

[WEBHOOK-VALIDATOR] ❌ Falha ao validar: abc123 - Erro ao buscar webhook
```

### **Registro no Firestore:**

Quando webhook é corrigida, salva log:

```javascript
negocios/{businessId}/logs/{logId}
{
  tipo: 'webhook_corrigida',
  webhookAnterior: 'https://webhook-errada.com',
  webhookNova: 'https://n8n.vitoria4u.site/webhook/...',
  corrigidoEm: Timestamp
}
```

---

## 🔄 Validação Periódica (Opcional)

### **Opção 1: Vercel Cron**

Criar arquivo `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/admin/validate-webhooks?action=fix-all",
    "schedule": "0 */6 * * *"
  }]
}
```

**Roda a cada 6 horas**

---

### **Opção 2: GitHub Actions**

Criar `.github/workflows/validate-webhooks.yml`:

```yaml
name: Validate Webhooks

on:
  schedule:
    - cron: '0 */6 * * *'  # A cada 6 horas
  workflow_dispatch:  # Permite executar manualmente

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Validate and Fix Webhooks
        run: |
          curl -X POST https://seu-dominio.com/api/admin/validate-webhooks?action=fix-all
```

---

### **Opção 3: Cloud Scheduler (Google Cloud)**

```bash
gcloud scheduler jobs create http validate-webhooks \
  --schedule="0 */6 * * *" \
  --uri="https://seu-dominio.com/api/admin/validate-webhooks?action=fix-all" \
  --http-method=POST
```

---

## 🧪 Como Testar

### **Teste 1: Desconfigurar Manualmente**

1. Acessar painel UazAPI
2. Mudar webhook de uma instância manualmente
3. Desconectar e reconectar WhatsApp
4. Verificar logs:

```
[WEBHOOK-VALIDATOR] Validando webhook após conexão
[WEBHOOK-VALIDATOR] ✅ Webhook validada e corrigida
```

5. Ver log no Firestore (collection `logs`)

---

### **Teste 2: Validação Manual**

```bash
# 1. Ver status atual
curl https://seu-dominio.com/api/admin/validate-webhooks?businessId=abc123

# 2. Se needsFix: true, corrigir
curl -X POST https://seu-dominio.com/api/admin/validate-webhooks?businessId=abc123

# 3. Validar novamente
curl https://seu-dominio.com/api/admin/validate-webhooks?businessId=abc123

# Agora deve estar: isValid: true
```

---

### **Teste 3: Validar Todas**

```bash
# Ver status de todas
curl https://seu-dominio.com/api/admin/validate-webhooks?action=validate-all

# Se alguma needsFix, corrigir todas
curl -X POST https://seu-dominio.com/api/admin/validate-webhooks?action=fix-all
```

---

## 🔐 Segurança (Recomendado)

### **Proteger endpoint admin:**

```typescript
// src/app/api/admin/validate-webhooks/route.ts

export async function GET(req: NextRequest) {
  // Validar token de administrador
  const authHeader = req.headers.get('authorization');
  
  if (authHeader !== `Bearer ${process.env.ADMIN_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // ... resto do código
}
```

**Adicionar no `.env`:**
```
ADMIN_API_SECRET=seu-secret-super-seguro-aqui
```

---

## ✅ Checklist de Implementação

- [x] Criar `webhook-validator.ts`
- [x] Adicionar método `getWebhook()` na API
- [x] Integrar validação no evento CONNECTION
- [x] Criar endpoint `/api/admin/validate-webhooks`
- [ ] Adicionar segurança no endpoint admin
- [ ] Configurar validação periódica (opcional)
- [ ] Testar fluxo completo
- [ ] Monitorar logs

---

## 📈 Benefícios

| Antes | Depois |
|-------|--------|
| ❌ Webhook pode quebrar silenciosamente | ✅ Detecta e corrige automaticamente |
| ❌ Difícil descobrir problema | ✅ Logs claros e alertas |
| ❌ Precisa verificar manualmente | ✅ Validação automática |
| ❌ IA para sem aviso | ✅ Sistema auto-regenerativo |

---

## 🎯 Próximos Passos

1. **Testar validação automática**
   - Conectar instância
   - Verificar logs
   - Confirmar webhook correta

2. **Testar validação manual**
   - Usar endpoints GET/POST
   - Ver resposta JSON
   - Confirmar correções

3. **Configurar cron (opcional)**
   - Escolher método (Vercel/GitHub/Cloud)
   - Configurar schedule
   - Testar execução

4. **Monitorar em produção**
   - Ver logs Vercel/servidor
   - Verificar collection `logs` no Firestore
   - Ajustar frequência se necessário

---

**Última atualização:** 24/10/2025  
**Status:** ✅ Implementado e pronto para usar
