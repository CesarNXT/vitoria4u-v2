# 🔧 Configuração Webhook Global - Passo a Passo

**IMPORTANTE:** Este guia é para configurar o webhook GLOBAL da UazAPI que já está funcionando. **NÃO MEXER** na arquitetura, apenas verificar/configurar!

---

## 📍 O que é Webhook Global?

**Webhook Global** recebe TODOS os eventos de TODAS as instâncias:
- ✅ Connection (conectou/desconectou)
- ✅ Call (chamadas)
- ✅ Sender (campanhas)
- ✅ Messages Update (status de entrega)
- ✅ Messages (mensagens recebidas)

**É ESSENCIAL** para o sistema funcionar!

---

## 🎯 Passo 1: Acessar Painel UazAPI

1. Acesse: https://vitoria4u.uazapi.com
2. Login com suas credenciais
3. Vá em: **Global Webhook** (menu lateral)

---

## 🎯 Passo 2: Configurar URL

**URL do Webhook Global:**
```
https://seu-dominio.vercel.app/api/whatsapp/webhook
```

**OU se tiver domínio próprio:**
```
https://seu-dominio.com/api/whatsapp/webhook
```

### **Como encontrar sua URL:**

**Vercel:**
```
https://vitoria4u-v2.vercel.app/api/whatsapp/webhook
```

**Domínio personalizado:**
```
https://app.vitoria4u.com/api/whatsapp/webhook
```

---

## 🎯 Passo 3: Selecionar Eventos

**Marcar TODOS os eventos:**

- [x] `connection.update` - Status de conexão
- [x] `messages.upsert` - Mensagens recebidas
- [x] `messages.update` - Status de mensagens
- [x] `call` - Chamadas
- [x] `sender` - Campanhas em massa

**IMPORTANTE:** Marcar TODOS! O sistema precisa de cada um.

---

## 🎯 Passo 4: Formato dos Eventos

**Configuração recomendada:**

```json
{
  "webhookUrl": "https://seu-dominio.com/api/whatsapp/webhook",
  "webhookByEvents": true,
  "events": [
    "connection.update",
    "messages.upsert", 
    "messages.update",
    "call",
    "sender"
  ]
}
```

---

## 🎯 Passo 5: Testar Webhook

### **Teste 1: Connection**

1. Conectar/desconectar uma instância
2. Ver se atualiza no Firestore
3. Campo `whatsappConectado` deve mudar

### **Teste 2: Mensagem**

1. Enviar mensagem para um número conectado
2. Ver logs em tempo real:

```bash
# Vercel
vercel logs --follow

# Ou abrir dashboard Vercel → Seu projeto → Functions
```

3. Deve aparecer:
```
[WEBHOOK] Recebido da UazAPI: { event: 'message', ... }
```

### **Teste 3: Chamada**

1. Ativar rejeição automática no negócio
2. Fazer chamada teste
3. Deve rejeitar e enviar mensagem

---

## 🔐 Segurança (Opcional)

### **Validar origem do webhook:**

Adicione validação no webhook handler:

```typescript
// src/app/api/whatsapp/webhook/route.ts

export async function POST(req: NextRequest) {
  // Validar API key da UazAPI
  const apikey = req.headers.get('apikey');
  
  if (apikey !== process.env.UAZAPI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // ... resto do código
}
```

**Adicionar no `.env`:**
```
UAZAPI_WEBHOOK_SECRET=seu-secret-aqui
```

---

## 📊 Monitoramento

### **Ver se webhook está recebendo:**

**Vercel:**
1. Dashboard → Seu projeto
2. Functions → `/api/whatsapp/webhook`
3. Ver logs em tempo real

**Logs esperados:**
```
✅ [WEBHOOK-CONNECTION] Instância xxx → estado: open
✅ [WEBHOOK-MESSAGE] Processando mensagem de 5511999999999
✅ [WEBHOOK-CALL] Chamada rejeitada
✅ [WEBHOOK-SENDER] Campanha xxx → status: sending
```

---

## ⚠️ Problemas Comuns

### **1. Webhook não recebe eventos**

**Causas:**
- URL incorreta
- Webhook não ativada
- Eventos não selecionados

**Solução:**
1. Verificar URL está correta
2. Verificar webhook está "Active"
3. Verificar todos os eventos marcados

---

### **2. Erro 500 no webhook**

**Causas:**
- Erro no código
- Firebase offline
- Variáveis de ambiente faltando

**Solução:**
1. Ver logs detalhados
2. Verificar Firebase conectado
3. Verificar `.env` completo

---

### **3. Mensagens não chegam na IA**

**Causas:**
- Webhook da instância não configurada
- `iaAtiva: false`
- n8n offline

**Solução:**
1. Verificar `iaAtiva: true` no Firestore
2. Verificar n8n está rodando
3. Reconfigurar webhook da instância

---

## 📝 Diferença: Webhook Global vs Webhook Instância

### **Webhook Global (UazAPI)**
- Recebe TODOS os eventos
- Configurado UMA VEZ
- URL: `/api/whatsapp/webhook`
- Processa: connection, call, sender, messages_update
- **Essencial para sistema funcionar**

### **Webhook Instância (n8n)**
- Recebe apenas mensagens daquela instância
- Configurado POR instância
- URL: `https://n8n.vitoria4u.site/webhook/...`
- Processa: apenas conversas com IA
- **Opcional (só se IA ativa)**

---

## ✅ Checklist Final

- [ ] Webhook global configurada
- [ ] URL correta do seu domínio
- [ ] Todos os eventos marcados
- [ ] Testado com mensagem
- [ ] Testado com conexão
- [ ] Logs aparecem no Vercel
- [ ] Firebase atualiza

---

## 🚀 Próximo Passo

Depois de configurar webhook global, testar:

1. ✅ Conectar WhatsApp
2. ✅ Enviar lembrete
3. ✅ Fazer chamada
4. ✅ Conversar com IA
5. ✅ Confirmar agendamento

Tudo deve funcionar perfeitamente!

---

**Última atualização:** 24/10/2025  
**Autor:** Sistema de Documentação
