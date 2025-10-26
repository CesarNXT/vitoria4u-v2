# 🔄 ARQUITETURA DE WEBHOOKS - VITORIA4U

**Data:** 26 de Outubro de 2025  
**Sistema:** Webhooks UazAPI + N8N + Next.js

---

## 📡 DUAS WEBHOOKS SEPARADAS

### 1️⃣ **WEBHOOK GLOBAL** (UazAPI → Next.js)

**URL:** `https://seu-dominio.com/api/whatsapp/webhook`

**Configuração:** Definida nas configurações globais da UazAPI

**Recebe TODOS os eventos:**
- ✅ `connection` - Conexão/desconexão
- ✅ `call` - Chamadas de voz/vídeo
- ✅ `messages` - Mensagens (todas)
- ✅ `messages_update` - Status de entrega/leitura
- ✅ `sender` - Status de campanhas
- ✅ Respostas de botões

**Processamento:**
- Auto-cadastra clientes novos
- Processa confirmações de presença (botões)
- Rejeita chamadas automaticamente
- Atualiza status de conexão
- Processa status de campanhas/lembretes
- Notifica gestores

---

### 2️⃣ **WEBHOOK DA INSTÂNCIA** (UazAPI → N8N)

**URL:** `https://n8n.vitoria4u.site/webhook/c0b43248-7690-4273-af55-8a11612849da`

**Configuração:** Definida POR instância/negócio via `webhook-validator.ts`

**Recebe APENAS:**
- ✅ `messages` - Mensagens de clientes

**Filtros automáticos da UazAPI:**
- ❌ Remove `fromMe: true` (mensagens enviadas por você)
- ❌ Remove `isGroup: true` (mensagens de grupos)

**Processamento:**
- N8N processa com IA
- IA responde diretamente ao cliente
- Usa ferramentas: consultar_servicos, consultar_agendamento, enviar_mensagem

---

## 🔧 COMO FUNCIONA:

### Quando cliente envia mensagem:

```
1. UazAPI recebe a mensagem
   ↓
2. UazAPI envia para AMBAS as webhooks simultaneamente:
   
   A) WEBHOOK GLOBAL → Next.js
      ✅ Processa: auto-cadastro, eventos do sistema
      
   B) WEBHOOK DA INSTÂNCIA → N8N
      ✅ Processa: IA responde cliente
```

### Configuração automática:

O sistema configura a webhook da instância automaticamente:

```typescript
// webhook-validator.ts (linha 59-62)

const hasIAFeature = await checkFeatureAccess(business, 'atendimento_whatsapp_ia')

const expectedWebhook = hasIAFeature 
  ? N8N_WEBHOOK_URL   // ✅ Se tem IA = aponta para N8N
  : ''                // ❌ Se não tem IA = webhook vazia
```

**Quando é configurado:**
- ✅ Ao conectar instância
- ✅ Quando IA é ativada
- ✅ Validação a cada 5 segundos após conexão
- ✅ Pode ser corrigida manualmente via `validateAndFixWebhook()`

---

## 📋 EVENTOS POR WEBHOOK:

### Webhook Global (Next.js):
```
✅ connection       → Atualiza Firestore
✅ call             → Rejeita automaticamente
✅ messages         → Auto-cadastra cliente
✅ messages_update  → Atualiza status entrega
✅ sender           → Processa campanhas/lembretes
✅ buttonsResponse  → Confirmação de presença
```

### Webhook Instância (N8N):
```
✅ messages → IA processa e responde
   ↓
   Filtrado pela UazAPI:
   - ❌ fromMe: true (você mesmo)
   - ❌ isGroup: true (grupos)
```

---

## 🎯 VANTAGENS DESSA ARQUITETURA:

1. **Separação de responsabilidades**
   - Sistema: Next.js
   - IA: N8N

2. **Filtros nativos da UazAPI**
   - Não precisa filtrar byapi/isGroup no código
   - UazAPI já faz isso na webhook da instância

3. **Escalabilidade**
   - Cada negócio tem sua própria webhook
   - N8N recebe apenas o necessário

4. **Economia de tokens**
   - IA não processa mensagens do sistema
   - IA não processa mensagens de grupo

5. **Resiliência**
   - Se N8N cair, sistema continua funcionando
   - Se Next.js cair, IA continua respondendo

---

## 🛠️ CONFIGURAÇÃO MANUAL:

### Ver webhook atual:
```typescript
const api = new WhatsAppAPI(businessId, tokenInstancia);
const webhook = await api.getWebhook();
console.log(webhook.url);
```

### Configurar webhook:
```typescript
const api = new WhatsAppAPI(businessId, tokenInstancia);
await api.setupWebhook('https://n8n.vitoria4u.site/webhook/c0b43248-7690-4273-af55-8a11612849da');
```

### Validar e corrigir:
```typescript
import { validateAndFixWebhook } from '@/lib/webhook-validator';

const result = await validateAndFixWebhook(businessId);
console.log(result.message);
```

---

## ⚠️ IMPORTANTE:

**NUNCA configure a webhook GLOBAL para apontar para o N8N!**

A webhook global SEMPRE deve apontar para o Next.js.

Apenas a webhook DA INSTÂNCIA aponta para o N8N.

---

## 🔍 DEBUG:

### Ver logs no console:

**Webhook Global:**
```
[WEBHOOK] Recebido da UazAPI: { EventType: "messages", ... }
[WEBHOOK-MESSAGE] Cliente auto-cadastrado: Nome (5581...)
```

**Webhook Instância (N8N):**
```
[N8N] Mensagem recebida: { from: "5581...", body: "Oi", ... }
[N8N-IA] Processando com IA...
```

---

**Documentação atualizada:** 26/10/2025  
**Sistema funcionando perfeitamente!** ✅
