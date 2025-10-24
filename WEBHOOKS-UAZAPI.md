# 🔔 Webhooks UazAPI - Sistema de Lembretes

## 📋 Visão Geral

Os **webhooks** permitem que a UazAPI notifique nosso sistema em **tempo real** sobre o andamento das campanhas de lembrete, atualizando automaticamente o status no Firestore.

---

## 🎯 Eventos Necessários

### ✅ 1. message_sent - Mensagem Enviada
**Quando**: UazAPI envia a mensagem com sucesso

```json
{
  "event": "message_sent",
  "data": {
    "folder_id": "abc123",
    "message_id": "3EB0538DA65A59F6D8A251",
    "number": "5511999999999@s.whatsapp.net",
    "status": "sent",
    "timestamp": 1706198400000
  }
}
```

**Atualização no Agendamento:**
```typescript
{
  lembrete24hEnviado: true,
  lembrete24hEnviadoEm: Date(timestamp)
}
```

---

### ✅ 2. message_delivered - Mensagem Entregue (2 checks)
**Quando**: WhatsApp confirma que mensagem chegou no celular do cliente

```json
{
  "event": "message_delivered",
  "data": {
    "folder_id": "abc123",
    "message_id": "3EB0538DA65A59F6D8A251",
    "number": "5511999999999@s.whatsapp.net",
    "timestamp": 1706198450000
  }
}
```

**Atualização no Agendamento:**
```typescript
{
  lembrete24hEntregue: true,
  lembrete24hEntregueEm: Date(timestamp)
}
```

---

### ✅ 3. message_read - Mensagem Lida (2 checks azuis)
**Quando**: Cliente abre e visualiza a mensagem

```json
{
  "event": "message_read",
  "data": {
    "folder_id": "abc123",
    "message_id": "3EB0538DA65A59F6D8A251",
    "number": "5511999999999@s.whatsapp.net",
    "timestamp": 1706198500000
  }
}
```

**Atualização no Agendamento:**
```typescript
{
  lembrete24hLido: true,
  lembrete24hLidoEm: Date(timestamp)
}
```

---

### ❌ 4. message_failed - Erro no Envio
**Quando**: Falha ao enviar a mensagem

```json
{
  "event": "message_failed",
  "data": {
    "folder_id": "abc123",
    "message_id": "3EB0538DA65A59F6D8A251",
    "number": "5511999999999@s.whatsapp.net",
    "status": "phone_number_invalid",
    "timestamp": 1706198400000
  }
}
```

**Possíveis Erros:**
- `phone_number_invalid` - Número inválido
- `number_blocked` - Número bloqueou você
- `message_not_delivered` - Mensagem não entregue
- `unknown_error` - Erro desconhecido

**Atualização no Agendamento:**
```typescript
{
  lembrete24hErro: true,
  lembrete24hErroMotivo: "phone_number_invalid",
  lembrete24hErroEm: Date(timestamp)
}
```

**Notificação ao Gestor:**
```
⚠️ *Alerta: Lembrete não enviado*

📅 *Agendamento:* João Silva
⏰ *Lembrete:* 24h antes
❌ *Motivo:* número de telefone inválido

Por favor, confirme o agendamento manualmente.
```

---

## ⚙️ Configuração do Webhook

### 1. URL do Webhook
```
https://seu-dominio.com/api/webhooks/uazapi
```

### 2. Configurar na UazAPI

**Opção A: Via Dashboard**
1. Acesse: https://vitoria4u.uazapi.com/webhooks
2. Adicione a URL acima
3. Selecione eventos:
   - ✅ message_sent
   - ✅ message_delivered
   - ✅ message_read
   - ✅ message_failed

**Opção B: Via API**
```bash
POST https://vitoria4u.uazapi.com/webhook/set
Headers:
  token: SEU_TOKEN_INSTANCIA
Body:
{
  "url": "https://seu-dominio.com/api/webhooks/uazapi",
  "events": ["message_sent", "message_delivered", "message_read", "message_failed"],
  "enabled": true
}
```

---

## 🔍 Fluxo Completo

### Cenário: Cliente Recebe e Lê Lembrete

```
1. UazAPI envia lembrete 24h antes
   ↓
   [WEBHOOK] message_sent
   → Firestore: lembrete24hEnviado = true
   
2. WhatsApp entrega no celular
   ↓
   [WEBHOOK] message_delivered
   → Firestore: lembrete24hEntregue = true
   
3. Cliente abre a mensagem
   ↓
   [WEBHOOK] message_read
   → Firestore: lembrete24hLido = true
   
✅ Sucesso! Cliente visualizou o lembrete
```

### Cenário: Erro no Envio

```
1. UazAPI tenta enviar lembrete
   ↓
   [WEBHOOK] message_failed (phone_number_invalid)
   → Firestore: lembrete24hErro = true
   → Notifica gestor via WhatsApp
   
⚠️ Gestor precisa confirmar manualmente
```

---

## 📊 Estrutura de Dados no Firestore

### Campos Adicionados ao Agendamento

```typescript
interface Agendamento {
  // ... campos existentes
  
  // Status Lembrete 24h
  lembrete24hEnviado?: boolean;
  lembrete24hEnviadoEm?: Timestamp;
  lembrete24hEntregue?: boolean;
  lembrete24hEntregueEm?: Timestamp;
  lembrete24hLido?: boolean;
  lembrete24hLidoEm?: Timestamp;
  lembrete24hErro?: boolean;
  lembrete24hErroMotivo?: string;
  lembrete24hErroEm?: Timestamp;
  
  // Status Lembrete 2h
  lembrete2hEnviado?: boolean;
  lembrete2hEnviadoEm?: Timestamp;
  lembrete2hEntregue?: boolean;
  lembrete2hEntregueEm?: Timestamp;
  lembrete2hLido?: boolean;
  lembrete2hLidoEm?: Timestamp;
  lembrete2hErro?: boolean;
  lembrete2hErroMotivo?: string;
  lembrete2hErroEm?: Timestamp;
}
```

---

## 🔧 Implementação Técnica

### Endpoint Webhook
📁 `src/app/api/webhooks/uazapi/route.ts`

**Fluxo de Processamento:**
```typescript
1. Recebe evento da UazAPI
   ↓
2. Identifica tipo de evento (message_sent, etc)
   ↓
3. Busca agendamento pelo folder_id
   ↓
4. Identifica tipo de lembrete (24h ou 2h)
   ↓
5. Atualiza campos correspondentes
   ↓
6. Se erro: notifica gestor
```

**Código Simplificado:**
```typescript
// Buscar agendamento
const snapshot = await adminDb
  .collectionGroup('agendamentos')
  .where('reminderCampaigns', 'array-contains', { 
    folderId: folder_id 
  })
  .get();

// Atualizar status
const reminderType = campaign.type; // '24h' ou '2h'
await agendamentoDoc.ref.update({
  [`lembrete${reminderType}Enviado`]: true,
  [`lembrete${reminderType}EnviadoEm`]: new Date(timestamp)
});
```

---

## 📊 Dashboard de Monitoramento

### Visualizar Status dos Lembretes

```typescript
// Query para ver lembretes enviados hoje
const enviados = await getDocs(
  query(
    collection(db, 'agendamentos'),
    where('lembrete24hEnviado', '==', true),
    where('lembrete24hEnviadoEm', '>=', startOfDay(new Date()))
  )
);

// Taxa de leitura
const lidos = agendamentos.filter(a => a.lembrete24hLido);
const taxaLeitura = (lidos.length / enviados.length) * 100;

console.log(`Taxa de leitura: ${taxaLeitura}%`);
```

### Métricas Úteis

| Métrica | Cálculo | Uso |
|---------|---------|-----|
| **Taxa de Envio** | `enviados / total` | Monitorar falhas |
| **Taxa de Entrega** | `entregues / enviados` | Qualidade dos números |
| **Taxa de Leitura** | `lidos / entregues` | Engajamento dos clientes |
| **Taxa de Erro** | `erros / total` | Problemas técnicos |

---

## 🧪 Testes

### Testar Webhook Manualmente

**1. Simular Evento:**
```bash
curl -X POST https://seu-dominio.com/api/webhooks/uazapi \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message_sent",
    "data": {
      "folder_id": "abc123",
      "message_id": "TEST123",
      "number": "5511999999999@s.whatsapp.net",
      "status": "sent",
      "timestamp": 1706198400000
    }
  }'
```

**2. Verificar Logs:**
```
[WEBHOOK-REMINDER] Evento message_sent para folder abc123
[WEBHOOK-REMINDER] Agendamento appt-123 atualizado: 24h - message_sent
```

**3. Verificar Firestore:**
```typescript
// Deve ter sido atualizado:
{
  lembrete24hEnviado: true,
  lembrete24hEnviadoEm: Timestamp(...)
}
```

---

## ⚠️ Troubleshooting

### Webhook não está sendo chamado
- [ ] Verificar URL configurada na UazAPI
- [ ] Verificar se endpoint está acessível publicamente
- [ ] Verificar logs do servidor (500 errors?)
- [ ] Verificar firewall/CORS

### Agendamento não é atualizado
- [ ] Verificar se `folder_id` está correto em `reminderCampaigns`
- [ ] Verificar logs: `Nenhum agendamento encontrado para folder...`
- [ ] Verificar estrutura do array `reminderCampaigns`

### Gestor não recebe notificação de erro
- [ ] Verificar se `business.telefone` existe
- [ ] Verificar se token de notificação está correto
- [ ] Verificar logs: `Erro ao notificar gestor`

---

## 🔒 Segurança

### Validar Origem do Webhook (Opcional)

```typescript
// Adicionar verificação de assinatura
export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-uazapi-signature');
  const body = await req.text();
  
  // Validar assinatura HMAC
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // Processar normalmente...
}
```

---

## 📈 Próximas Melhorias

### 1. Retry Automático
```typescript
// Se falhar, tentar reenviar automaticamente
if (event === 'message_failed' && retryCount < 3) {
  await resendReminder(agendamento, reminderType);
}
```

### 2. Analytics Dashboard
```typescript
// Painel com métricas em tempo real
- Total de lembretes enviados hoje
- Taxa de leitura por hora
- Principais erros
- Comparativo com dias anteriores
```

### 3. A/B Testing de Mensagens
```typescript
// Testar diferentes mensagens
const messageVariant = Math.random() > 0.5 ? 'variant_a' : 'variant_b';
// Comparar taxa de leitura
```

---

## ✅ Checklist de Implementação

- [x] Endpoint webhook criado (`/api/webhooks/uazapi`)
- [x] Função `processReminderEvent()` implementada
- [x] Campos de status adicionados em `Agendamento`
- [x] Notificação de erro para gestor
- [ ] Configurar webhook na UazAPI
- [ ] Testar com evento real
- [ ] Monitorar logs por 24h
- [ ] Criar dashboard de métricas (futuro)

---

**Implementado em:** `src/app/api/webhooks/uazapi/route.ts`  
**Documentação:** Este arquivo  
**Status:** ✅ Pronto para uso
