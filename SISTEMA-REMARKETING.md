# 🎯 Sistema de Remarketing - Expiração de Planos

## ✅ Sistema Implementado e Testado

### 📱 Configuração
- **Endpoint:** `/api/cron/check-expirations`
- **Método:** `GET`
- **Autenticação:** `Authorization: Bearer {CRON_SECRET}`
- **Token WhatsApp:** `b2e97825-2d28-4646-ae38-3357fcbf0e20` (fixo)
- **API:** UazAPI (`https://vitoria4u.uazapi.com`)

---

## 🔔 Mensagens Automáticas

O sistema envia **4 mensagens** automaticamente:

### 1️⃣ D-3 (3 dias antes)
```
⚠️ Atenção [Nome do Negócio]!

Seu plano [Nome do Plano] expira em 3 dias!

📅 Não perca o acesso a:
✅ Lembretes automáticos 24h e 2h
✅ Notificações de aniversário
✅ Feedback automatizado
✅ Inteligência Artificial

💳 Renove agora e mantenha suas automações ativas!

Acesse: https://vitoria4u.com.br/planos
```

### 2️⃣ D-2 (2 dias antes)
```
⏰ [Nome do Negócio], faltam apenas 2 dias!

Seu plano [Nome do Plano] está prestes a expirar.

❌ Após a expiração você perderá:
• Todas as automações de WhatsApp
• Conexão com sua instância
• Lembretes de agendamentos
• Histórico de campanhas

💎 Renove hoje e evite interrupções!

Acesse: https://vitoria4u.com.br/planos
```

### 3️⃣ D-1 (1 dia antes - ÚLTIMO DIA)
```
🚨 ÚLTIMO DIA, [Nome do Negócio]!

Seu plano [Nome do Plano] expira HOJE!

⚠️ A partir de amanhã:
❌ Sua instância WhatsApp será desconectada
❌ Todas as automações serão desativadas
❌ Lembretes não serão mais enviados

💳 Esta é sua última chance de renovar sem perder nada!

Acesse AGORA: https://vitoria4u.com.br/planos
```

### 4️⃣ D-0 (Dia da expiração)
```
😔 [Nome do Negócio], seu plano expirou

Infelizmente seu plano [Nome do Plano] expirou hoje.

📋 O que aconteceu:
✅ Você foi migrado para o Plano Gratuito
✅ Sua instância WhatsApp foi desconectada
✅ Todas as automações foram desativadas

💡 Quer reativar seus recursos?
Renove seu plano e recupere tudo instantaneamente!

🎯 OFERTA ESPECIAL DE REATIVAÇÃO:
Renove agora e volte a ter:
• Automações de WhatsApp
• Lembretes inteligentes
• IA para atendimento
• Gestão completa de agendamentos

Acesse agora: https://vitoria4u.com.br/planos
```

---

## 🔧 Funcionalidades

### ✅ Anti-Spam
- Não envia mensagem duplicada no mesmo dia
- Salva `last_expiration_notification` no Firestore
- Cada período (D-3, D-2, D-1, D-0) recebe apenas 1 mensagem

### ✅ Downgrade Automático
Quando o plano expira (D-0):
1. Deleta instância WhatsApp via UazAPI
2. Migra para `plano_gratis`
3. Desabilita todos os recursos premium:
   - `habilitarLembrete24h: false`
   - `habilitarLembrete2h: false`
   - `habilitarFeedback: false`
   - `habilitarAniversario: false`
   - `iaAtiva: false`
4. Envia mensagem de expiração + oferta de reativação

### ✅ Normalização de Datas
- Usa `startOfDay()` para cálculo preciso
- Evita problemas com timezones e horários

---

## 🚀 Como Agendar em Produção

### Vercel Cron
Adicione ao `vercel.json`:

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

### Alternativa: Cron-job.org
1. Acesse https://cron-job.org
2. **URL:** `https://seusite.com/api/cron/check-expirations`
3. **Schedule:** `0 9 * * *` (9h da manhã)
4. **Headers:** 
   - `Authorization: Bearer {seu_CRON_SECRET}`

---

## 📊 Logs do Sistema

O cron gera logs limpos e informativos:

```
🔄 [CHECK-EXPIRATIONS] Iniciando verificação de planos expirados
📊 [CHECK-EXPIRATIONS] Total de negócios no banco: 7
📊 [CHECK-EXPIRATIONS] Negócios com planos pagos: 6
📦 [CHECK-EXPIRATIONS] Processando batch 1/1 (6 negócios)
📱 [NOTIFICATION] Enviando notificação de 1 dias para Barbearia JJ
✅ [NOTIFICATION] Notificação enviada com sucesso para Barbearia JJ
📊 [CHECK-EXPIRATIONS] RESUMO FINAL:
   ├─ Total no banco: 7 negócios
   ├─ Com planos pagos: 6 negócios
   ├─ Planos expirados: 0
   └─ Status: ✅ Nenhum plano expirado
```

---

## ✅ Status: PRONTO PARA PRODUÇÃO

Sistema testado e funcionando 100%! 🎉
