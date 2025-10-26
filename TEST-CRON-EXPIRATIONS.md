# 🧪 TESTE DO CRON: Check Expirations

## 📋 O que este cron faz?
1. **Verifica planos expirados** e faz downgrade automático para `plano_gratis`
2. **Sistema de Remarketing:** Envia notificações automáticas:
   - 🔔 **3 dias antes** da expiração
   - 🔔 **2 dias antes** da expiração  
   - 🔔 **1 dia antes** (ÚLTIMO DIA)
   - 🔔 **No dia da expiração**
3. **Deleta instância WhatsApp** para liberar recursos
4. **Usa número/token da Vitoria4U** para enviar notificações

---

## 🔧 Como testar localmente

### **IMPORTANTE: Servidor deve estar RODANDO!**
```bash
npm run dev
```

### **Opção 1: Usando cURL (Recomendado)**

```bash
curl -X GET "http://localhost:3000/api/cron/check-expirations" \
  -H "Authorization: Bearer SEU_CRON_SECRET_AQUI"
```

**⚠️ Substitua `SEU_CRON_SECRET_AQUI` pelo valor da variável `CRON_SECRET` do seu `.env`**

### **Exemplo com CRON_SECRET:**
Se seu `.env` tem: `CRON_SECRET=abc123`
```bash
curl -X GET "http://localhost:3000/api/cron/check-expirations" \
  -H "Authorization: Bearer abc123"
```

---

### **Opção 2: Usando PowerShell (Windows)**

```powershell
$headers = @{
    "Authorization" = "Bearer SEU_CRON_SECRET_AQUI"
}

Invoke-RestMethod -Uri "http://localhost:3000/api/cron/check-expirations" `
    -Method GET `
    -Headers $headers
```

---

### **Opção 3: Usando Postman/Insomnia**

1. **Method:** `GET`
2. **URL:** `http://localhost:3000/api/cron/check-expirations`
3. **Headers:**
   - `Authorization`: `Bearer SEU_CRON_SECRET_AQUI`

---

## 📊 Logs esperados no console

```
🔄 [CHECK-EXPIRATIONS] ========================================
🔄 [CHECK-EXPIRATIONS] Iniciando verificação de planos expirados
🔄 [CHECK-EXPIRATIONS] Data/Hora: 2025-10-26T07:00:00.000Z
✅ [CHECK-EXPIRATIONS] Autenticação bem-sucedida
📅 [CHECK-EXPIRATIONS] Verificando planos com data < 2025-10-26T07:00:00.000Z
📊 [CHECK-EXPIRATIONS] Encontrados 5 negócios com planos pagos
🔄 [CHECK-EXPIRATIONS] Processando em batches de 30...
📦 [CHECK-EXPIRATIONS] Processando batch 1/1 (5 negócios)

🔍 [CHECK-EXPIRATIONS] Verificando: Barbearia Silva (abc123)
   └─ Plano atual: plano_mensal
   └─ 📅 Expira em: 2025-10-20T00:00:00.000Z
   └─ 🕐 Está expirado? SIM ❌
   └─ ⚠️ PLANO EXPIRADO! Iniciando downgrade...
   └─ 📱 WhatsApp conectado. Deletando instância...
   └─ ✅ Instância WhatsApp deletada
   └─ 🔄 Atualizando para plano gratuito...
   └─ ✅ Downgrade concluído: Barbearia Silva → plano_gratis

🔍 [CHECK-EXPIRATIONS] Verificando: Salão Beleza (def456)
   └─ Plano atual: plano_anual
   └─ 📅 Expira em: 2025-11-30T00:00:00.000Z
   └─ 🕐 Está expirado? NÃO ✅
   └─ ⏰ Faltam 35 dias para expirar

🎯 [CHECK-EXPIRATIONS] ========================================
📊 [CHECK-EXPIRATIONS] RESUMO FINAL:
   ├─ Total verificado: 5 negócios
   ├─ Planos expirados: 1
   ├─ Firestore reads: 5
   └─ Status: ✅ Downgrades realizados
🎯 [CHECK-EXPIRATIONS] Verificação concluída com sucesso!
🔄 [CHECK-EXPIRATIONS] ========================================
```

---

## 📄 Resposta JSON esperada

```json
{
  "success": true,
  "message": "Verificação concluída. 1 planos expirados detectados e atualizados.",
  "updatedBusinesses": 1,
  "totalChecked": 5,
  "totalReads": 5,
  "timestamp": "2025-10-26T07:00:00.000Z"
}
```

---

## 🧪 Criar negócio de teste com plano expirado

### No Firestore Console:

1. Vá em **Firestore** → Collection `negocios`
2. Crie/edite um documento com:

```json
{
  "nome": "Negócio Teste",
  "planId": "plano_mensal",
  "access_expires_at": "2025-10-20T00:00:00.000Z",
  "whatsappConectado": false,
  "tokenInstancia": null
}
```

**⚠️ Use uma data no PASSADO para simular expiração!**

3. Execute o cron
4. Verifique se o `planId` mudou para `plano_gratis`

---

## ⚠️ Erros comuns

### ❌ `401 Unauthorized`
**Causa:** Token inválido ou ausente
**Solução:** Verifique se está usando o valor correto de `CRON_SECRET` do `.env`

### ❌ `500 Internal Server Error`
**Causa:** Erro no Firebase ou configuração
**Solução:** Verifique os logs do console para detalhes

### ⚠️ Retorna 200 OK mas negócios continuam Premium
**Causa:** Possíveis problemas:
1. Campo `access_expires_at` em formato incorreto (string ao invés de Timestamp)
2. Data de expiração ainda não passou (timezone)
3. `planId` diferente de 'premium' (ex: 'plano_mensal', 'plano_anual')

**Solução:**
1. Verifique os logs detalhados no console do servidor
2. Procure por linhas como:
   ```
   └─ Tipo do access_expires_at: object
   └─ Valor raw do access_expires_at: Timestamp { _seconds: 1729900800, _nanoseconds: 0 }
   └─ Está expirado? SIM ❌
   ```
3. Se aparecer "Está expirado? NÃO ✅", a data ainda não passou
4. Se aparecer "Sem data de expiração definida", o campo está null ou inválido

---

## 🚀 Agendar cron em produção

### **Vercel Cron:**

Crie `vercel.json` na raiz:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-expirations",
      "schedule": "0 5 * * *"
    }
  ]
}
```

**Schedule:** `0 5 * * *` = Todos os dias às 5h (UTC)

### **Ou use Cron-job.org:**

1. https://cron-job.org
2. URL: `https://seusite.com/api/cron/check-expirations`
3. Schedule: `0 2 * * *` (2h da manhã, horário Brasil)
4. Headers: `Authorization: Bearer SEU_CRON_SECRET`

---

## 📝 Checklist de teste

- [ ] Servidor Next.js rodando (`npm run dev`)
- [ ] `.env` com `CRON_SECRET` configurado
- [ ] Criar negócio de teste com data expirada
- [ ] Executar cron via cURL/Postman
- [ ] Verificar logs no console
- [ ] Confirmar que `planId` mudou para `plano_gratis`
- [ ] Confirmar que WhatsApp foi desconectado
- [ ] Verificar resposta JSON de sucesso

---

## 📱 SISTEMA DE NOTIFICAÇÕES DE REMARKETING

### **Como funciona:**

O cron envia notificações automáticas via WhatsApp nos seguintes momentos:

#### **3 Dias Antes (D-3)** ⚠️
```
⚠️ Atenção Barbearia Silva!

Seu plano Premium expira em 3 dias!

📅 Não perca o acesso a:
✅ Lembretes automáticos 24h e 2h
✅ Notificações de aniversário
✅ Feedback automatizado
✅ Inteligência Artificial

💳 Renove agora e mantenha suas automações ativas!

Acesse: https://vitoria4u.com.br/planos
```

#### **2 Dias Antes (D-2)** ⏰
```
⏰ Barbearia Silva, faltam apenas 2 dias!

Seu plano Premium está prestes a expirar.

❌ Após a expiração você perderá:
• Todas as automações de WhatsApp
• Conexão com sua instância
• Lembretes de agendamentos
• Histórico de campanhas

💎 Renove hoje e evite interrupções!
```

#### **1 Dia Antes (D-1)** 🚨
```
🚨 ÚLTIMO DIA, Barbearia Silva!

Seu plano Premium expira HOJE!

⚠️ A partir de amanhã:
❌ Sua instância WhatsApp será desconectada
❌ Todas as automações serão desativadas
❌ Lembretes não serão mais enviados

💳 Esta é sua última chance de renovar sem perder nada!
```

#### **Dia da Expiração (D-0)** 😔
```
😔 Barbearia Silva, seu plano expirou

Infelizmente seu plano Premium expirou hoje.

📋 O que aconteceu:
✅ Você foi migrado para o Plano Gratuito
✅ Sua instância WhatsApp foi desconectada
✅ Todas as automações foram desativadas

💡 Quer reativar seus recursos?
Renove seu plano e recupere tudo!
```

---

### **Configuração das Notificações:**

As notificações são enviadas pelo:
- **Número:** `5581995207521` (Vitoria4U)
- **Token:** `NEXT_PUBLIC_WHATSAPP_API_TOKEN` (do `.env`)
- **API:** UazAPI `/send/text`

---

### **Controle de Duplicação:**

- ✅ O sistema salva `last_expiration_notification` no Firestore
- ✅ Não envia a mesma notificação 2x no mesmo dia
- ✅ Cada dia (3, 2, 1, 0) recebe mensagem única

---

### **Garantia de Deleção de Instância:**

Quando o plano expira:
1. ✅ Sistema tenta deletar instância WhatsApp via UazAPI
2. ✅ Mesmo se falhar, downgrade continua
3. ✅ Campos são zerados: `whatsappConectado: false`, `tokenInstancia: null`
4. ✅ Recursos são liberados

---

## ⚙️ Agendar em Produção

**Recomendado:** Rodar **1x por dia às 9h da manhã**

```json
{
  "crons": [
    {
      "path": "/api/cron/check-expirations",
      "schedule": "0 12 * * *"
    }
  ]
}
```

**Schedule:** `0 12 * * *` = Todo dia às 9h (horário Brasil, UTC-3)

---

✅ **Pronto para testar!**
