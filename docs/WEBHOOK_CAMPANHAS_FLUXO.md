# 📡 Webhook Global - Rastreamento de Campanhas

## ✅ **Webhook Já Configurado!**

**URL:** `https://vitoria4u-v22.vercel.app/api/whatsapp/webhook`

### **Eventos Habilitados:**
- ✅ `connection` - Status de conexão
- ✅ `messages` - Mensagens recebidas  
- ✅ `messages_update` - Status de entrega/leitura
- ✅ `call` - Chamadas
- ✅ **`sender` - CAMPANHAS (atualização em tempo real!)** 🎯

### **Eventos Excluídos:**
- ❌ `wasSentByApi` - Evita loops infinitos
- ❌ `isGroupYes` - Ignora mensagens de grupos

---

## 🔄 **Fluxo Completo: Campanha → Webhook → Firestore**

### 1️⃣ **Cliente Cria Campanha (5 contatos)**

```typescript
// Você clica "Agendar Campanha"
{
  nome: "Teste Campanha",
  tipo: "texto",
  mensagem: "Olá! Promoção especial!",
  contatos: [
    { clienteId: "1", nome: "João", telefone: "11999999999" },
    { clienteId: "2", nome: "Maria", telefone: "11888888888" },
    { clienteId: "3", nome: "Pedro", telefone: "11777777777" },
    { clienteId: "4", nome: "Ana", telefone: "11666666666" },
    { clienteId: "5", nome: "Carlos", telefone: "11555555555" }
  ]
}
```

### 2️⃣ **Sistema Envia para UazAPI**

```typescript
POST https://vitoria4u.uazapi.com/sender/simple

{
  numbers: [
    "5511999999999@s.whatsapp.net",
    "5511888888888@s.whatsapp.net",
    "5511777777777@s.whatsapp.net",
    "5511666666666@s.whatsapp.net",
    "5511555555555@s.whatsapp.net"
  ],
  delayMin: 80,
  delayMax: 120,
  scheduled_for: 1706198400000,
  type: 'text',
  text: 'Olá! Promoção especial!'
}

// UazAPI responde:
{
  folder_id: "abc123",
  count: 5,
  status: "queued"
}
```

### 3️⃣ **Sistema Salva no Firestore**

```typescript
negocios/{businessId}/campanhas/{campaignId}
{
  folder_id: "abc123",        // ← ID da UazAPI
  nome: "Teste Campanha",
  tipo: "texto",
  mensagem: "Olá! Promoção especial!",
  status: "scheduled",        // ← Status inicial
  total_contacts: 5,
  sent_count: 0,              // ← Contador
  failed_count: 0,
  contatos: [
    { clienteId: "1", nome: "João", telefone: "11999999999", status: "pending" },
    { clienteId: "2", nome: "Maria", telefone: "11888888888", status: "pending" },
    { clienteId: "3", nome: "Pedro", telefone: "11777777777", status: "pending" },
    { clienteId: "4", nome: "Ana", telefone: "11666666666", status: "pending" },
    { clienteId: "5", nome: "Carlos", telefone: "11555555555", status: "pending" }
  ],
  created_at: timestamp,
  scheduled_for: timestamp
}
```

---

## 📊 **UazAPI Começa a Enviar (14:00)**

### Evento 1: Campanha Iniciou
```json
// Webhook recebe:
{
  "EventType": "sender",
  "data": {
    "folder_id": "abc123",
    "status": "sending",
    "sent_count": 0,
    "failed_count": 0,
    "total_messages": 5
  }
}

// Sistema atualiza Firestore:
campanhas/{campaignId}
{
  status: "sending",  // ← Mudou de "scheduled" para "sending"
  sent_count: 0
}
```

### Evento 2: Primeira Mensagem Enviada (14:00:00)
```json
// Webhook recebe:
{
  "EventType": "sender",
  "data": {
    "folder_id": "abc123",
    "status": "sending",
    "sent_count": 1,     // ← João recebeu!
    "failed_count": 0,
    "total_messages": 5
  }
}

// Sistema atualiza Firestore:
campanhas/{campaignId}
{
  sent_count: 1,
  contatos: [
    { ...João, status: "sent", sent_at: timestamp },  // ← ATUALIZADO
    { ...Maria, status: "pending" },
    { ...Pedro, status: "pending" },
    { ...Ana, status: "pending" },
    { ...Carlos, status: "pending" }
  ]
}
```

### Evento 3: Segunda Mensagem (14:01:35 - após 95s)
```json
{
  "EventType": "sender",
  "data": {
    "folder_id": "abc123",
    "status": "sending",
    "sent_count": 2,     // ← Maria recebeu!
    "failed_count": 0,
    "total_messages": 5
  }
}

// Firestore atualizado:
sent_count: 2
contatos: [
  { ...João, status: "sent", sent_at: ... },
  { ...Maria, status: "sent", sent_at: timestamp },  // ← ATUALIZADO
  { ...Pedro, status: "pending" },
  { ...Ana, status: "pending" },
  { ...Carlos, status: "pending" }
]
```

### Eventos 4, 5, 6: Demais Mensagens
```
14:03:27 → Pedro recebe (sent_count: 3)
14:04:50 → Ana recebe (sent_count: 4)
14:06:48 → Carlos recebe (sent_count: 5)
```

### Evento Final: Campanha Concluída
```json
{
  "EventType": "sender",
  "data": {
    "folder_id": "abc123",
    "status": "done",       // ← CONCLUÍDA!
    "sent_count": 5,
    "failed_count": 0,
    "total_messages": 5
  }
}

// Firestore atualizado:
campanhas/{campaignId}
{
  status: "done",           // ← Status final
  sent_count: 5,
  failed_count: 0,
  completed_at: timestamp,  // ← Data de conclusão
  contatos: [
    { ...João, status: "sent", sent_at: ... },
    { ...Maria, status: "sent", sent_at: ... },
    { ...Pedro, status: "sent", sent_at: ... },
    { ...Ana, status: "sent", sent_at: ... },
    { ...Carlos, status: "sent", sent_at: ... }
  ]
}
```

---

## 🎯 **O Que o Webhook Faz Agora**

### Função: `processSenderEvent(data)`
```typescript
1. Recebe evento da UazAPI
2. Extrai: folder_id, status, sent_count, failed_count
3. Busca campanha no Firestore usando folder_id
4. Atualiza campos:
   - sent_count
   - failed_count
   - status (sending → done)
   - updated_at
5. Atualiza status individual dos contatos:
   - Marca primeiros sent_count como "sent"
   - Adiciona sent_at timestamp
6. Salva no Firestore
```

### Logs Gerados:
```
📊 [WEBHOOK-SENDER] Campanha abc123 → status: sending, 0/5 enviadas
✅ Campanha abc123 iniciou envio

📊 [WEBHOOK-SENDER] Campanha abc123 → status: sending, 1/5 enviadas
📊 [WEBHOOK-SENDER] Campanha abc123 → status: sending, 2/5 enviadas
📊 [WEBHOOK-SENDER] Campanha abc123 → status: sending, 3/5 enviadas
📊 [WEBHOOK-SENDER] Campanha abc123 → status: sending, 4/5 enviadas
📊 [WEBHOOK-SENDER] Campanha abc123 → status: sending, 5/5 enviadas

🎉 Campanha abc123 concluída! 5 enviadas, 0 falhas
```

---

## 📈 **Interface do Dashboard Atualiza em Tempo Real**

### Card de Estatísticas:
```
Enviadas: 3 / 5  (60%)
Falhas: 0
Status: Enviando... 🔄
```

### Tabela de Detalhes:
```
| Nome   | Telefone        | Status   | Enviado em       |
|--------|-----------------|----------|------------------|
| João   | (11) 99999-9999 | Enviado  | 25/01 14:00      |
| Maria  | (11) 88888-8888 | Enviado  | 25/01 14:01      |
| Pedro  | (11) 77777-7777 | Enviado  | 25/01 14:03      |
| Ana    | (11) 66666-6666 | Pendente | -                |
| Carlos | (11) 55555-5555 | Pendente | -                |
```

---

## 🔧 **Tratamento de Falhas**

### Se uma mensagem falhar:
```json
{
  "EventType": "sender",
  "data": {
    "folder_id": "abc123",
    "status": "sending",
    "sent_count": 3,
    "failed_count": 1,     // ← Ana falhou!
    "total_messages": 5
  }
}

// Firestore:
contatos: [
  { ...João, status: "sent" },
  { ...Maria, status: "sent" },
  { ...Pedro, status: "sent" },
  { ...Ana, status: "failed", error: "Failed to send" },  // ← MARCADO
  { ...Carlos, status: "pending" }
]
```

---

## ✅ **Resposta às Suas Perguntas**

### **1. Recebe webhook de envio?**
✅ **SIM!** Evento `sender` configurado

### **2. Salva que foi enviado no Firestore?**
✅ **SIM!** Atualiza `sent_count` e marca contato como `"sent"`

### **3. Sabe quantos foram enviados?**
✅ **SIM!** Campo `sent_count` atualizado em tempo real

### **4. Tem histórico individual?**
✅ **SIM!** Cada contato tem `status` + `sent_at` timestamp

---

## 🚀 **Testando**

1. Crie campanha com 5 contatos
2. Veja logs no console:
```bash
📊 [WEBHOOK-SENDER] Campanha abc123...
✅ Campanha iniciou envio
🎉 Campanha concluída!
```

3. Abra Firestore e veja atualizações em tempo real
4. Dashboard mostra progresso automaticamente

---

## 📁 **Arquivos Envolvidos**

- ✅ **Webhook Handler:** `src/app/api/whatsapp/webhook/route.ts`
  - `processSenderEvent()` - Processa eventos
  - `processCampaignUpdate()` - Atualiza campanha
  - `updateIndividualContactStatus()` - Atualiza contatos

- ✅ **Configuração UazAPI:** Painel admin
  - URL: `/api/whatsapp/webhook`
  - Eventos: `sender` habilitado

- ✅ **Firestore:** `negocios/{id}/campanhas/{id}`
  - Estrutura completa com contatos

---

**Desenvolvedor:** Cesar (Windsurf AI + Claude 3.5 Sonnet)  
**Data:** 25/01/2025 01:40
