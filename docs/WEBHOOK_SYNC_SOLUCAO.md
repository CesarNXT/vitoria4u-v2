# 🔄 Solução: Sincronização de Progresso de Campanhas

## ❌ **Problema Identificado**

O webhook da UazAPI **NÃO envia progresso incremental** das campanhas.

### **O Que o Webhook Envia:**
```json
// Quando inicia
{
  "EventType": "sender",
  "status": "sending",
  "sentCount": 0,        // ← Sempre 0!
  "messageCount": 4
}

// Quando termina (talvez)
{
  "EventType": "sender",
  "status": "done",
  "sentCount": 4,        // ← Só no final
  "messageCount": 4
}
```

### **O Que NÃO Envia:**
```json
// ❌ NÃO recebe isso a cada mensagem:
{
  "sentCount": 1  // Primeira enviada
}
{
  "sentCount": 2  // Segunda enviada
}
{
  "sentCount": 3  // Terceira enviada
}
```

---

## ✅ **Solução Implementada: Polling da API**

### **1. Função de Sincronização**
`src/app/(dashboard)/campanhas/sync-campaign-status.ts`

```typescript
syncCampaignStatus(businessId, campaignId, folderId)
```

**O que faz:**
1. Chama `/sender/listmessages` na UazAPI
2. Pega lista completa de mensagens com status
3. Conta quantas foram enviadas/falharam
4. Atualiza contatos individuais no Firestore
5. Atualiza status da campanha

### **2. Webhook Aciona Sincronização**
`src/app/api/whatsapp/webhook/route.ts`

Quando webhook `sender` chega com status "sending" ou "done":
```typescript
if (status === 'sending' || status === 'done') {
  // Sincroniza em background
  syncCampaignStatus(businessId, campaignId, folderId);
}
```

---

## 📊 **Fluxo Completo**

### **Timeline de uma Campanha de 4 Mensagens**

```
00:00 - Campanha criada
        ↓
00:00 - UazAPI recebe e agenda
        ↓
00:05 - UazAPI inicia envio
        ↓ Webhook chega
00:05 - {status: "sending", sentCount: 0}
        ↓ Sistema aciona
00:05 - 🔄 syncCampaignStatus()
        ↓ Chama /sender/listmessages
00:05 - UazAPI retorna:
        {
          messages: [
            {number: "11999...", status: "pending"},
            {number: "11888...", status: "pending"},
            {number: "11777...", status: "pending"},
            {number: "11666...", status: "pending"}
          ]
        }
        ↓ Atualiza Firestore
00:05 - Status: todos "pending"
        ↓
        ⏳ UazAPI envia mensagens (80-120s entre cada)
        ↓
02:00 - Mensagem 1 enviada
02:05 - Mensagem 2 enviada  
04:10 - Mensagem 3 enviada
06:15 - Mensagem 4 enviada
        ↓ Webhook final
06:15 - {status: "done", sentCount: 4}
        ↓ Sistema aciona
06:15 - 🔄 syncCampaignStatus()
        ↓ Chama /sender/listmessages
06:15 - UazAPI retorna:
        {
          messages: [
            {number: "11999...", status: "sent", sent_at: ...},
            {number: "11888...", status: "sent", sent_at: ...},
            {number: "11777...", status: "sent", sent_at: ...},
            {number: "11666...", status: "sent", sent_at: ...}
          ]
        }
        ↓ Atualiza Firestore
06:15 - ✅ Status: todos "sent"
```

---

## 🎯 **Resultado no Dashboard**

### **Antes (Sem Sincronização)**
```
Status: Enviando...
Progresso: 0/4 (0%)

[Contatos]
⏳ Debora Silva - Pendente
⏳ Eduardo Tonan - Pendente
⏳ Italia Cesar - Pendente
⏳ Jose Edson - Pendente
```

### **Depois (Com Sincronização)**
```
Status: ✅ Concluída
Progresso: 4/4 (100%)

[Contatos]
✅ Debora Silva - Enviado (24/10 22:11)
✅ Eduardo Tonan - Enviado (24/10 22:12)
✅ Italia Cesar - Enviado (24/10 22:14)
✅ Jose Edson - Enviado (24/10 22:16)
```

---

## ⚙️ **Opções de Sincronização**

### **1. Via Webhook (Implementado)** ✅
- Automático quando campanha inicia
- Automático quando campanha termina
- Não precisa polling contínuo

### **2. Polling Periódico (Futuro)**
Adicionar em `page.tsx`:
```typescript
useEffect(() => {
  if (selectedCampaign?.status === 'sending') {
    const interval = setInterval(async () => {
      await syncCampaignStatus(...);
    }, 30000); // A cada 30 segundos

    return () => clearInterval(interval);
  }
}, [selectedCampaign]);
```

### **3. Manual (Futuro)**
Botão "Atualizar" nos detalhes da campanha

---

## 🔧 **Arquivos Modificados**

### ✅ **Criados**
- `sync-campaign-status.ts` - Função de sincronização

### ✅ **Editados**
- `route.ts` (webhook) - Aciona sincronização
- `page.tsx` - Import da função

---

## 📝 **Endpoint UazAPI Usado**

```http
POST /sender/listmessages
Headers:
  Content-Type: application/json
  token: {tokenInstancia}
Body:
  {
    "folder_id": "reb3504f1be0ae3"
  }

Response:
{
  "messages": [
    {
      "id": "msg123",
      "number": "5511999999999@s.whatsapp.net",
      "status": "sent",
      "sent_at": 1761368973918,
      "error": null
    },
    ...
  ]
}
```

---

## ✅ **Vantagens da Solução**

1. **Preciso:** Pega status real direto da UazAPI
2. **Automático:** Webhook aciona sincronização
3. **Sem Índices:** Não precisa de índices compostos
4. **Confiável:** Usa API oficial documentada
5. **Escalável:** Funciona com qualquer quantidade de mensagens

---

## 🚀 **Próximos Passos**

1. ✅ Webhook aciona sincronização (implementado)
2. ⏳ Adicionar polling periódico (opcional)
3. ⏳ Botão manual de atualizar (opcional)
4. ⏳ Loading states no frontend

---

**Desenvolvedor:** Cesar (Windsurf AI + Claude 3.5 Sonnet)  
**Data:** 25/01/2025 02:15
