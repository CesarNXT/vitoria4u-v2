# ⚙️ Configuração do Webhook Global - Guia Rápido

## 🎯 Resumo

Você precisa configurar o **webhook global** da UazAPI para receber atualizações sobre os **lembretes** em tempo real.

---

## ✅ Lembrete Foi Criado?

**SIM! ✅**

Nos logs você pode ver:
```bash
✅ Campanha 2h criada com sucesso! folder_id: r7c731ffe5ff76b
✅ 1 lembretes criados para agendamento appt-1761322491101-9eb2a097
```

**Por que apenas 1 lembrete?**
- Agendamento: hoje às 16:30
- Lembrete 24h: ontem ❌ (já passou)
- Lembrete 2h: hoje às 14:30 ✅ (será enviado)

---

## 🔧 Configuração do Webhook

### 1️⃣ Endpoint da API

```bash
POST https://vitoria4u.uazapi.com/globalwebhook
```

### 2️⃣ Headers

```
admintoken: SEU_ADMIN_TOKEN
Content-Type: application/json
```

### 3️⃣ Body (Copiar e Colar)

```json
{
  "url": "https://seu-dominio.com/api/webhooks/uazapi",
  "events": [
    "sender",
    "messages_update"
  ],
  "excludeMessages": ["wasSentByApi"]
}
```

**⚠️ IMPORTANTE:** Substituir `https://seu-dominio.com` pela URL real do seu sistema!

---

## 📋 Eventos Configurados

| Evento | Função | Quando é Disparado |
|--------|--------|-------------------|
| **`sender`** | Rastreia campanhas | Quando campanha inicia/completa |
| **`messages_update`** | Rastreia mensagens | Quando mensagem é entregue/lida |
| **`excludeMessages: ["wasSentByApi"]`** | Previne loops | Ignora mensagens que VOCÊ enviou |

---

## 🚀 Exemplo Completo com cURL

```bash
curl -X POST https://vitoria4u.uazapi.com/globalwebhook \
  -H "admintoken: SEU_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seu-dominio.com/api/webhooks/uazapi",
    "events": ["sender", "messages_update"],
    "excludeMessages": ["wasSentByApi"]
  }'
```

### Resposta Esperada (200 OK):

```json
{
  "id": "wh_9a8b7c6d5e",
  "instance_id": "global",
  "enabled": true,
  "url": "https://seu-dominio.com/api/webhooks/uazapi",
  "events": ["sender", "messages_update"],
  "excludeMessages": ["wasSentByApi"],
  "created": "2025-10-24T16:30:00Z"
}
```

---

## 🔍 O Que Cada Evento Faz

### Event: `sender`

**Quando dispara:**
- Campanha inicia (status: "sending")
- Campanha completa (status: "completed")
- Campanha falha (status: "failed")

**Payload recebido:**
```json
{
  "event": "sender",
  "data": {
    "folder_id": "r7c731ffe5ff76b",
    "status": "sending",
    "sent_count": 1,
    "failed_count": 0,
    "total_messages": 1
  }
}
```

**Atualização no Firestore:**
```typescript
// Agendamento será atualizado:
{
  lembrete2hCampanhaIniciada: true,
  lembrete2hCampanhaIniciadaEm: Timestamp(...)
}
```

---

### Event: `messages_update`

**Quando dispara:**
- Mensagem enviada (ack: 1)
- Mensagem entregue - ✓✓ (ack: 2)
- Mensagem lida - ✓✓ azul (ack: 3)
- Mensagem com erro (ack: -1)

**Payload recebido:**
```json
{
  "event": "messages_update",
  "data": {
    "id": "3EB0538DA65A59F6D8A251",
    "from": "5581995207521@s.whatsapp.net",
    "ack": 3,
    "timestamp": 1729781400
  }
}
```

**Códigos de ACK:**
- `ack: 1` → ✓ Enviado
- `ack: 2` → ✓✓ Entregue
- `ack: 3` → ✓✓ (azul) Lido
- `ack: -1` → ❌ Erro

**Atualização no Firestore:**
```typescript
// Se ack = 3 (lido):
{
  lembrete2hLido: true,
  lembrete2hLidoEm: Timestamp(...)
}
```

---

## ⚠️ CRÍTICO: Prevenir Loops Infinitos

### Por quê `"excludeMessages": ["wasSentByApi"]`?

**Sem filtro:**
```
1. Sistema envia lembrete via API
   ↓
2. Webhook recebe "message_sent"
   ↓
3. Sistema processa como "mensagem nova"
   ↓
4. Dispara automação
   ↓
5. Envia outra mensagem
   ↓
♾️ LOOP INFINITO!
```

**Com filtro:**
```
1. Sistema envia lembrete via API
   ↓
2. Webhook filtra: "wasSentByApi" → ignora ✅
   ↓
✅ Sem loop!
```

---

## 🧪 Testar Webhook

### Após configurar, teste manualmente:

```bash
# Simular evento "sender"
curl -X POST https://seu-dominio.com/api/webhooks/uazapi \
  -H "Content-Type: application/json" \
  -d '{
    "event": "sender",
    "data": {
      "folder_id": "r7c731ffe5ff76b",
      "status": "completed",
      "sent_count": 1,
      "total_messages": 1
    }
  }'

# Simular evento "messages_update"
curl -X POST https://seu-dominio.com/api/webhooks/uazapi \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages_update",
    "data": {
      "id": "TEST123",
      "from": "5581995207521@s.whatsapp.net",
      "ack": 3,
      "timestamp": 1729781400
    }
  }'
```

### Verificar Logs:

No terminal do Next.js, você deve ver:
```
[WEBHOOK] Recebido da UazAPI: {"event":"sender",...}
[WEBHOOK-SENDER] Campanha r7c731ffe5ff76b → status: completed
[WEBHOOK-SENDER] Agendamento appt-xxx atualizado: 2h - completed
```

---

## 📊 Campos Atualizados no Firestore

### Evento `sender` atualiza:

| Campo | Quando |
|-------|--------|
| `lembrete24hCampanhaIniciada` | status = "sending" |
| `lembrete24hCampanhaConcluida` | status = "completed" |

### Evento `messages_update` atualiza:

| ACK | Campos Atualizados |
|-----|-------------------|
| `1` | `lembrete24hEnviado`, `lembrete24hEnviadoEm` |
| `2` | `lembrete24hEntregue`, `lembrete24hEntregueEm` |
| `3` | `lembrete24hLido`, `lembrete24hLidoEm` |
| `-1` | `lembrete24hErro`, `lembrete24hErroEm` |

---

## ✅ Checklist de Configuração

- [ ] 1. Obter `admintoken` da UazAPI
- [ ] 2. Substituir URL do webhook pela URL real
- [ ] 3. Fazer POST para `/globalwebhook`
- [ ] 4. Verificar resposta 200 OK
- [ ] 5. Testar com evento manual
- [ ] 6. Monitorar logs do Next.js
- [ ] 7. Criar agendamento e verificar atualização automática

---

## 🎯 Próximo Lembrete

O lembrete criado (`r7c731ffe5ff76b`) será enviado:

**Data/Hora:** Hoje às 14:30  
**Tipo:** 2h antes  
**Cliente:** 81995207521  

Após enviar, você verá nos logs:
```
[WEBHOOK-SENDER] Campanha r7c731ffe5ff76b → status: sending
[WEBHOOK-MSG-UPDATE] Mensagem xxx → ack: 2 (entregue)
[WEBHOOK-MSG-UPDATE] Mensagem xxx → ack: 3 (lido)
```

E no Firestore:
```json
{
  "lembrete2hEnviado": true,
  "lembrete2hEntregue": true,
  "lembrete2hLido": true
}
```

---

## 🆘 Troubleshooting

### Webhook não está sendo chamado
- [ ] Verificar se URL está correta e acessível
- [ ] Verificar se servidor está rodando
- [ ] Verificar firewall/CORS
- [ ] Verificar logs da UazAPI

### Eventos não atualizam Firestore
- [ ] Verificar logs: `[WEBHOOK-SENDER]` ou `[WEBHOOK-MSG-UPDATE]`
- [ ] Verificar se folder_id está correto
- [ ] Verificar se agendamento existe

---

**Status:** ✅ Código pronto  
**Próximo passo:** Configurar webhook global  
**Arquivo:** `src/app/api/webhooks/uazapi/route.ts`
