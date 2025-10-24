# ✅ Validação Sistema Atual - 100% Funcional

**Data:** 24/10/2025  
**Objetivo:** Garantir que tudo funcione perfeitamente DO JEITO QUE ESTÁ

---

## 🏗️ Arquitetura Atual (NÃO MEXER!)

```
┌─────────────────────────────────────────────────────────────┐
│                       UazAPI                                │
│                 (vitoria4u.uazapi.com)                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Webhook Global
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            Next.js - /api/whatsapp/webhook                  │
│                                                             │
│  Processa:                                                  │
│  ├─ CONNECTION → Atualiza status conexão                   │
│  ├─ SENDER → Atualiza campanhas lembretes                  │
│  ├─ MESSAGES_UPDATE → Status entrega/leitura               │
│  ├─ CALL → Rejeição automática                             │
│  ├─ BUTTON → Confirmação agendamentos                      │
│  └─ MESSAGE → Encaminha APENAS para n8n                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ (apenas mensagens de conversa)
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    n8n (IA)                                 │
│    https://n8n.vitoria4u.site/webhook/                     │
│           c0b43248-7690-4273-af55-8a11612849da             │
│                                                             │
│  Processa apenas conversas com IA                          │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Validação

### **1. Webhook Global UazAPI**

- [ ] Configurado em: `https://vitoria4u.uazapi.com/webhooks`
- [ ] URL: `https://seu-dominio.com/api/whatsapp/webhook`
- [ ] Eventos ativos:
  - [ ] `connection`
  - [ ] `message`
  - [ ] `call`
  - [ ] `sender`
  - [ ] `messages_update`

**Como verificar:**
```bash
# Acessar painel UazAPI
https://vitoria4u.uazapi.com/webhooks

# Ver se webhook está ativa e recebendo eventos
```

---

### **2. Webhook Por Instância (para IA)**

**Configuração atual:**
- URL n8n: `https://n8n.vitoria4u.site/webhook/c0b43248-7690-4273-af55-8a11612849da`
- Configurado em: `whatsapp-actions.ts` (linhas 135, 181, 245)
- Apenas para clientes com `iaAtiva: true`

**Quando é configurado:**
1. Ao conectar WhatsApp
2. Apenas se plano tem feature `atendimento_whatsapp_ia`

**Código responsável:**
```typescript
// src/app/(dashboard)/configuracoes/whatsapp-actions.ts
if (hasIAFeature) {
  const webhookUrl = 'https://n8n.vitoria4u.site/webhook/c0b43248-7690-4273-af55-8a11612849da'
  await api.setupWebhook(webhookUrl)
}
```

- [ ] Verificar se URL n8n está acessível
- [ ] Testar se webhook responde

---

### **3. Processamento de Eventos**

#### **3.1 CONNECTION (Conexão WhatsApp)**

**Arquivo:** `src/app/api/whatsapp/webhook/route.ts` (linhas 373-433)

**O que faz:**
- Atualiza status no Firestore
- Notifica gestor se desconectar

**Campos atualizados:**
```typescript
{
  whatsappConectado: true/false,
  whatsappStatus: 'conectado'|'conectando'|'desconectado',
  whatsappQR: null,
  whatsappUltimaAtualizacao: Date
}
```

**Testar:**
- [ ] Conectar WhatsApp → Verifica se `whatsappConectado` vira `true`
- [ ] Desconectar → Verifica se vira `false` e notifica gestor

---

#### **3.2 CALL (Chamadas)**

**Arquivo:** `src/app/api/whatsapp/webhook/route.ts` (linhas 471-544)

**O que faz:**
- Rejeita chamadas se configurado
- Envia mensagem automática

**Configuração necessária:**
```typescript
{
  rejeitarChamadasAutomaticamente: true,
  mensagemRejeicaoChamada: "..."
}
```

**Testar:**
- [ ] Ativar rejeição automática
- [ ] Fazer chamada teste
- [ ] Verificar se rejeitou e enviou mensagem

---

#### **3.3 SENDER (Campanhas)**

**Arquivo:** `src/app/api/whatsapp/webhook/route.ts` (linhas 616-671)

**O que faz:**
- Atualiza status de campanhas de lembrete
- Marca quando iniciou/concluiu

**Campos atualizados:**
```typescript
{
  lembrete24hCampanhaIniciada: true,
  lembrete24hCampanhaIniciadaEm: Date,
  lembrete24hCampanhaConcluida: true,
  lembrete24hCampanhaConcluidaEm: Date
}
```

**Testar:**
- [ ] Criar agendamento com lembrete
- [ ] Verificar se campos foram atualizados

---

#### **3.4 MESSAGES_UPDATE (Status Mensagens)**

**Arquivo:** `src/app/api/whatsapp/webhook/route.ts` (linhas 677-755)

**O que faz:**
- Atualiza status de entrega/leitura
- ACK codes: 1=enviado, 2=entregue, 3=lido, -1=erro

**Campos atualizados:**
```typescript
{
  lembrete24hEnviado: true,
  lembrete24hEntregue: true,
  lembrete24hLido: true,
  lembrete24hErro: true
}
```

**Testar:**
- [ ] Enviar lembrete
- [ ] Verificar se status atualiza (enviado → entregue → lido)

---

#### **3.5 MESSAGE (Conversas → IA)**

**Arquivo:** `src/app/api/whatsapp/webhook/route.ts` (linhas 301-367)

**O que faz:**
- Encaminha APENAS mensagens de texto para n8n
- Apenas se `iaAtiva: true`
- Ignora grupos

**Filtros aplicados:**
```typescript
if (isGroup) return;                                    // Ignora grupos
if (type !== 'conversation' && type !== 'extendedTextMessage') return;  // Só texto
if (!body || body.trim() === '') return;                // Ignora vazio
if (!negocio.iaAtiva) return;                           // Só se IA ativa
```

**Encaminha para:**
```typescript
POST https://n8n.vitoria4u.site/webhook/c0b43248-7690-4273-af55-8a11612849da
{
  event: 'message',
  data: {
    from, body, type, instance, businessId
  }
}
```

**Testar:**
- [ ] Enviar mensagem de texto
- [ ] Verificar se chegou no n8n
- [ ] IA respondeu?

---

#### **3.6 BUTTON (Confirmação Agendamento)**

**Arquivo:** `src/app/api/whatsapp/webhook/route.ts` (linhas 761-874)

**O que faz:**
- Processa respostas de botões (Confirmar/Remarcar/Cancelar)
- Atualiza status do agendamento
- Notifica gestor se necessário

**Botões:**
- `confirm` → Status: Confirmado
- `reschedule` → Marca para remarcação
- `cancel` → Status: Cancelado

**Testar:**
- [ ] Enviar lembrete com botões
- [ ] Clicar em botão
- [ ] Verificar se agendamento atualizou

---

### **4. Integração n8n**

**Workflow:** `vitoria4u.json` (66 nós)

**URL Webhook:**
```
https://n8n.vitoria4u.site/webhook/c0b43248-7690-4273-af55-8a11612849da
```

**O que o n8n processa:**
1. Identifica empresa e cliente
2. Verifica se IA está ativa
3. Controle de atendimento humano
4. Processa áudio/imagem
5. Sistema de fila anti-spam
6. IA responde com Gemini
7. Ferramentas (consultar serviços, agendamentos)

**Testar:**
- [ ] n8n está online?
- [ ] Workflow está ativo?
- [ ] Redis está funcionando?
- [ ] Gemini API está configurada?
- [ ] Firebase conectado?

---

### **5. Variáveis de Ambiente**

**Necessárias:**

```env
# UazAPI
NEXT_PUBLIC_WHATSAPP_API_URL=https://vitoria4u.uazapi.com
NEXT_PUBLIC_WHATSAPP_API_TOKEN=seu-admin-token

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...

# URLs
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

**Verificar:**
- [ ] Todas as variáveis estão definidas
- [ ] Tokens estão válidos
- [ ] URLs estão corretas

---

### **6. Features por Plano**

**IA ativa apenas se:**
```typescript
planId exists && 
feature 'atendimento_whatsapp_ia' disponível
```

**Verificar:**
- [ ] Plano tem feature de IA
- [ ] `iaAtiva: true` no negócio
- [ ] Webhook configurada

---

## 🔧 Scripts de Teste

### **Teste 1: Webhook Global Recebe Eventos**

```bash
# Ver logs em tempo real
vercel logs --follow

# Ou no servidor
tail -f /var/log/app.log
```

**Envie uma mensagem teste e veja se aparece:**
```
[WEBHOOK] Recebido da UazAPI: { event: 'message', data: {...} }
```

---

### **Teste 2: n8n Recebe Mensagens**

```bash
# Acessar n8n
https://n8n.vitoria4u.site

# Ver execuções
Workflows → vitoria4u → Executions

# Ver se chegou evento
```

---

### **Teste 3: IA Responde**

1. Enviar mensagem: "Olá"
2. Verificar logs n8n
3. IA deve responder

---

## 📊 Dashboard de Validação

### **Status Atual:**

| Componente | Status | Último Teste |
|-----------|--------|--------------|
| Webhook Global | 🟡 Verificar | - |
| CONNECTION events | 🟡 Verificar | - |
| CALL events | 🟡 Verificar | - |
| SENDER events | 🟡 Verificar | - |
| MESSAGE → n8n | 🟡 Verificar | - |
| n8n Workflow | 🟡 Verificar | - |
| IA Responde | 🟡 Verificar | - |

**Legenda:**
- 🟢 Funcionando
- 🟡 Não testado
- 🔴 Com problema

---

## 🚨 Problemas Comuns

### **1. IA não responde**

**Causas:**
- [ ] `iaAtiva: false` no negócio
- [ ] Plano sem feature de IA
- [ ] Webhook da instância não configurada
- [ ] n8n offline
- [ ] Redis offline
- [ ] Gemini API sem crédito

**Solução:**
1. Verificar `iaAtiva` no Firestore
2. Verificar plano
3. Reconfigurar webhook
4. Verificar n8n está rodando

---

### **2. Lembretes não atualizam status**

**Causas:**
- [ ] Webhook global não configurada
- [ ] `folder_id` não salvo no agendamento
- [ ] Formato de dados errado

**Solução:**
1. Verificar webhook global ativa
2. Ver se `reminderCampaigns` array existe

---

### **3. Chamadas não rejeitam**

**Causas:**
- [ ] `rejeitarChamadasAutomaticamente: false`
- [ ] Token instância inválido
- [ ] Webhook global não configurada

**Solução:**
1. Ativar nas configurações
2. Verificar token
3. Testar manualmente

---

## ✅ Próximos Passos

1. [ ] Executar todos os testes
2. [ ] Marcar status de cada componente
3. [ ] Corrigir problemas encontrados
4. [ ] Documentar configuração correta
5. [ ] Criar guia de troubleshooting

---

## 📝 Notas Importantes

### **NÃO MUDAR:**
- ❌ Arquitetura atual (está correta!)
- ❌ Webhook global (precisa dos eventos)
- ❌ Lógica de filtros
- ❌ Integração n8n

### **PODE FAZER:**
- ✅ Melhorar logs
- ✅ Adicionar monitoramento
- ✅ Criar dashboard de status
- ✅ Otimizar performance

---

**Última atualização:** 24/10/2025  
**Status:** Validação pendente
