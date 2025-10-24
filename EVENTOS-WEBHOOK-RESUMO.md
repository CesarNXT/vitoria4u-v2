# 📊 Resumo: Eventos de Webhook UazAPI

## ✅ Eventos Necessários para Rastreamento Completo

| # | Evento | Quando Ocorre | Campo Atualizado | Ícone WhatsApp |
|---|--------|---------------|------------------|----------------|
| 1️⃣ | `message_sent` | Mensagem enviada pela UazAPI | `lembrete24hEnviado` | ✓ |
| 2️⃣ | `message_delivered` | WhatsApp entregou no celular | `lembrete24hEntregue` | ✓✓ |
| 3️⃣ | `message_read` | Cliente abriu e leu | `lembrete24hLido` | ✓✓ (azul) |
| ❌ | `message_failed` | Erro no envio | `lembrete24hErro` | ❌ |

---

## 🔄 Fluxo de Estados

```
AGENDAMENTO CRIADO
       ↓
   [Aguardando]
       ↓
─────────────────────────────────────
Horário do Lembrete Chega
       ↓
   message_sent ✓
       ↓ (alguns segundos depois)
   message_delivered ✓✓
       ↓ (quando cliente abrir)
   message_read ✓✓ (azul)
─────────────────────────────────────

✅ SUCESSO - Cliente foi notificado e visualizou


ALTERNATIVA - ERRO:
─────────────────────────────────────
   message_failed ❌
       ↓
   [Notificar Gestor]
       ↓
   Gestor confirma manualmente
─────────────────────────────────────
```

---

## 📋 Campos Atualizados no Firestore

### Para Lembrete 24h

| Campo | Tipo | Preenchido por Evento |
|-------|------|----------------------|
| `lembrete24hEnviado` | boolean | message_sent |
| `lembrete24hEnviadoEm` | Timestamp | message_sent |
| `lembrete24hEntregue` | boolean | message_delivered |
| `lembrete24hEntregueEm` | Timestamp | message_delivered |
| `lembrete24hLido` | boolean | message_read |
| `lembrete24hLidoEm` | Timestamp | message_read |
| `lembrete24hErro` | boolean | message_failed |
| `lembrete24hErroMotivo` | string | message_failed |
| `lembrete24hErroEm` | Timestamp | message_failed |

### Para Lembrete 2h

| Campo | Tipo | Preenchido por Evento |
|-------|------|----------------------|
| `lembrete2hEnviado` | boolean | message_sent |
| `lembrete2hEnviadoEm` | Timestamp | message_sent |
| `lembrete2hEntregue` | boolean | message_delivered |
| `lembrete2hEntregueEm` | Timestamp | message_delivered |
| `lembrete2hLido` | boolean | message_read |
| `lembrete2hLidoEm` | Timestamp | message_read |
| `lembrete2hErro` | boolean | message_failed |
| `lembrete2hErroMotivo` | string | message_failed |
| `lembrete2hErroEm` | Timestamp | message_failed |

---

## 💡 Exemplo de Dados no Firestore

### Lembrete Enviado e Lido com Sucesso

```json
{
  "id": "appt-1234567890",
  "cliente": { "name": "João Silva", "phone": "11999999999" },
  "date": "2025-10-26T14:00:00Z",
  
  "reminderCampaigns": [
    { "type": "24h", "folderId": "abc123", "scheduledFor": "2025-10-25T14:00:00Z" },
    { "type": "2h", "folderId": "def456", "scheduledFor": "2025-10-26T12:00:00Z" }
  ],
  
  "lembrete24hEnviado": true,
  "lembrete24hEnviadoEm": "2025-10-25T14:00:05Z",
  "lembrete24hEntregue": true,
  "lembrete24hEntregueEm": "2025-10-25T14:00:12Z",
  "lembrete24hLido": true,
  "lembrete24hLidoEm": "2025-10-25T14:15:30Z",
  
  "lembrete2hEnviado": true,
  "lembrete2hEnviadoEm": "2025-10-26T12:00:03Z",
  "lembrete2hEntregue": true,
  "lembrete2hEntregueEm": "2025-10-26T12:00:08Z",
  "lembrete2hLido": true,
  "lembrete2hLidoEm": "2025-10-26T12:05:20Z"
}
```

### Lembrete com Erro

```json
{
  "id": "appt-9876543210",
  "cliente": { "name": "Maria Costa", "phone": "11888888888" },
  "date": "2025-10-27T10:00:00Z",
  
  "reminderCampaigns": [
    { "type": "24h", "folderId": "xyz789", "scheduledFor": "2025-10-26T10:00:00Z" }
  ],
  
  "lembrete24hEnviado": false,
  "lembrete24hErro": true,
  "lembrete24hErroMotivo": "phone_number_invalid",
  "lembrete24hErroEm": "2025-10-26T10:00:02Z"
}
```

---

## 🎯 Configuração do Webhook na UazAPI

### Via Dashboard
1. Acesse: https://vitoria4u.uazapi.com/webhooks
2. Adicione URL: `https://seu-dominio.com/api/webhooks/uazapi`
3. Selecione eventos:
   - ✅ `message_sent`
   - ✅ `message_delivered`
   - ✅ `message_read`
   - ✅ `message_failed`
4. Salvar

### Via API
```bash
POST https://vitoria4u.uazapi.com/webhook/set
Headers:
  token: SEU_TOKEN_INSTANCIA

Body:
{
  "url": "https://seu-dominio.com/api/webhooks/uazapi",
  "events": [
    "message_sent",
    "message_delivered", 
    "message_read",
    "message_failed"
  ],
  "enabled": true
}
```

---

## 📊 Métricas que Você Pode Extrair

### Taxa de Sucesso
```typescript
const totalEnviados = agendamentos.filter(a => a.lembrete24hEnviado).length;
const totalEntregues = agendamentos.filter(a => a.lembrete24hEntregue).length;
const totalLidos = agendamentos.filter(a => a.lembrete24hLido).length;
const totalErros = agendamentos.filter(a => a.lembrete24hErro).length;

console.log({
  taxaEntrega: (totalEntregues / totalEnviados * 100).toFixed(2) + '%',
  taxaLeitura: (totalLidos / totalEntregues * 100).toFixed(2) + '%',
  taxaErro: (totalErros / totalEnviados * 100).toFixed(2) + '%'
});

// Exemplo de saída:
// {
//   taxaEntrega: "98.50%",
//   taxaLeitura: "75.30%",
//   taxaErro: "1.50%"
// }
```

### Tempo Médio de Leitura
```typescript
const temposLeitura = agendamentos
  .filter(a => a.lembrete24hLido && a.lembrete24hEnviado)
  .map(a => {
    const enviado = a.lembrete24hEnviadoEm.toDate();
    const lido = a.lembrete24hLidoEm.toDate();
    return (lido - enviado) / 1000 / 60; // minutos
  });

const tempoMedio = temposLeitura.reduce((a, b) => a + b, 0) / temposLeitura.length;
console.log(`Tempo médio de leitura: ${tempoMedio.toFixed(0)} minutos`);

// Exemplo: "Tempo médio de leitura: 45 minutos"
```

### Principais Erros
```typescript
const erros = agendamentos
  .filter(a => a.lembrete24hErro)
  .reduce((acc, a) => {
    const motivo = a.lembrete24hErroMotivo || 'unknown';
    acc[motivo] = (acc[motivo] || 0) + 1;
    return acc;
  }, {});

console.log('Distribuição de erros:', erros);

// Exemplo:
// {
//   phone_number_invalid: 5,
//   number_blocked: 2,
//   message_not_delivered: 1
// }
```

---

## 🔔 Notificações ao Gestor

### Quando Notificar

| Situação | Notificar Gestor? | Prioridade |
|----------|-------------------|------------|
| Lembrete enviado | ❌ Não | - |
| Lembrete entregue | ❌ Não | - |
| Lembrete lido | ❌ Não | - |
| Erro: número inválido | ✅ Sim | 🔴 Alta |
| Erro: bloqueado | ✅ Sim | 🔴 Alta |
| Erro: não entregue | ✅ Sim | 🟡 Média |

### Formato da Notificação
```
⚠️ *Alerta: Lembrete não enviado*

📅 *Agendamento:* João Silva
📅 *Data:* 26/10/2025 às 14:00
⏰ *Lembrete:* 24h antes
❌ *Motivo:* número de telefone inválido

Por favor, confirme o agendamento manualmente.
```

---

## 🧪 Teste Rápido

### Enviar Evento de Teste
```bash
curl -X POST https://seu-dominio.com/api/webhooks/uazapi \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message_read",
    "data": {
      "folder_id": "SEU_FOLDER_ID",
      "message_id": "TEST123",
      "number": "5511999999999@s.whatsapp.net",
      "timestamp": 1729944000000
    }
  }'
```

### Verificar Resultado
```typescript
// No Firestore Console:
db.collection('negocios/USER_ID/agendamentos/APPT_ID')

// Deve ter:
{
  lembrete24hLido: true,
  lembrete24hLidoEm: Timestamp(2024-10-26...)
}
```

---

## ✅ Checklist Final

- [x] Webhook endpoint criado
- [x] Campos de status no tipo Agendamento
- [x] Processamento de 4 eventos (sent, delivered, read, failed)
- [x] Notificação de erro para gestor
- [x] Documentação completa
- [ ] Configurar webhook na UazAPI
- [ ] Testar com evento real
- [ ] Monitorar por 24h
- [ ] Criar dashboard de métricas

---

**Status:** ✅ Implementação completa  
**Próximo passo:** Configurar webhook na UazAPI  
**Arquivo:** `src/app/api/webhooks/uazapi/route.ts`
