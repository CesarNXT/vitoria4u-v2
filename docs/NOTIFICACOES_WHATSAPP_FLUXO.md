# 📱 Fluxo de Notificações WhatsApp - Sistema Vitória4U

## 🎯 Objetivo

Garantir que as notificações sejam enviadas corretamente usando o número WhatsApp da loja, diferenciando entre agendamentos criados pelo **painel** (gestor) e pelo **link externo** (cliente).

---

## 📋 Tipos de Notificações

### 1️⃣ Notificações do Sistema (Token Fixo)
**Usa:** Token fixo do sistema (`b2e97825-2d28-4646-ae38-3357fcbf0e20`)  
**Características:**
- ✅ **SEMPRE funciona** (instância do sistema sempre conectada)
- ✅ **NÃO precisa** que usuário esteja conectado
- ✅ Envia para o **GESTOR** (telefone da empresa)

**Exemplos:**
- Notificação de novo agendamento para o gestor
- Notificação de cancelamento para o gestor

### 2️⃣ Mensagens do Usuário (Token Dinâmico)
**Usa:** `businessSettings.tokenInstancia` (token do WhatsApp do usuário)  
**Características:**
- ⚠️ **SÓ funciona** se `whatsappConectado === true`
- ⚠️ **PRECISA** que usuário esteja conectado
- ✅ Envia do **NÚMERO DA LOJA** para o **CLIENTE**

**Exemplos:**
- Confirmação de agendamento para o cliente
- Lembretes 24h/2h antes
- Notificação para o profissional
- Feedback pós-atendimento
- Check-returns (retorno de clientes)

---

## 🔄 Fluxos Implementados

### 📍 Fluxo 1: Agendamento pelo PAINEL (Gestor)

```
Gestor cria agendamento → 
├─ ✅ Salva no Firestore
├─ ✅ Notifica GESTOR (Token Sistema)
│   └─ Mensagem: "Novo agendamento criado por Gestor João"
├─ 🔘 Cria lembretes 24h/2h (UazAPI)
│   └─ Se WhatsApp conectado E cliente não tem agendamento futuro
├─ 🔔 Notifica PROFISSIONAL (Token Usuário)
│   └─ Se WhatsApp conectado E profissional ativou notificações
└─ ❓ PERGUNTA: "Enviar confirmação para o cliente?"
    ├─ Gestor clica "Sim" → Envia confirmação do NÚMERO DA LOJA
    └─ Gestor clica "Não" → Não envia nada
```

**Código:** `src/app/(dashboard)/agendamentos/page.tsx` (linha 353-366)

### 📍 Fluxo 2: Agendamento pelo LINK EXTERNO (Cliente)

```
Cliente agenda pelo link → 
├─ ✅ Salva no Firestore
├─ ✅ Notifica GESTOR (Token Sistema)
│   └─ Mensagem: "Novo agendamento criado por Cliente Maria"
├─ 🔘 Cria lembretes 24h/2h (UazAPI)
│   └─ Se WhatsApp conectado E cliente não tem agendamento futuro
├─ 🔔 Notifica PROFISSIONAL (Token Usuário)
│   └─ Se WhatsApp conectado E profissional ativou notificações
└─ 📱 ENVIA AUTOMATICAMENTE confirmação para o cliente
    └─ Cliente recebe confirmação do NÚMERO DA LOJA imediatamente
```

**Código:** `src/app/api/booking/appointment/route.ts` (linha 252-261)

---

## 🎯 Diferenças Principais

| Característica | Painel (Gestor) | Link Externo (Cliente) |
|----------------|-----------------|------------------------|
| **Confirmação Cliente** | ❓ Pergunta (modal) | ✅ Automático |
| **Notificação Gestor** | ✅ "criado por Gestor" | ✅ "criado por Cliente" |
| **Token usado** | Token Usuário | Token Usuário |
| **Lembretes** | ✅ Cria (se conectado) | ✅ Cria (se conectado) |
| **Número remetente** | 📞 WhatsApp da loja | 📞 WhatsApp da loja |

---

## 📝 Mensagens Enviadas

### 1. Confirmação de Agendamento (Cliente)

**Remetente:** WhatsApp da loja (Token Usuário)  
**Destinatário:** Cliente  
**Quando:** Após criar agendamento
- **Painel:** Só se gestor clicar "Sim" no modal
- **Link:** Automaticamente

**Conteúdo:**
```
✅ Agendamento Confirmado!

Olá, João! Seu agendamento foi confirmado:

📅 Data: 25/10/2025 às 14:00
💼 Serviço: Corte de Cabelo
👤 Profissional: Maria Silva
🏢 Local: Salão Beleza Total

Nos vemos em breve! 💇
```

**Código:** `src/lib/notifications.ts` → `notifyClientAppointmentConfirmation()`

### 2. Notificação para Gestor

**Remetente:** Sistema (Token Fixo)  
**Destinatário:** Gestor (telefone da empresa)  
**Quando:** Sempre que cria agendamento

**Conteúdo (Painel):**
```
🆕 Novo Agendamento (Gestor)

Cliente: João Silva
Telefone: (11) 99999-9999
Serviço: Corte de Cabelo
Data/Hora: 25/10/2025 às 14:00

Agendamento criado pelo painel de controle.
```

**Conteúdo (Link):**
```
🆕 Novo Agendamento (Cliente)

Cliente: João Silva
Telefone: (11) 99999-9999
Serviço: Corte de Cabelo
Data/Hora: 25/10/2025 às 14:00

Cliente agendou pelo link público.
```

**Código:** `src/lib/notifications.ts` → `notifyNewAppointment()`

### 3. Lembretes 24h e 2h

**Remetente:** WhatsApp da loja (Token Usuário)  
**Destinatário:** Cliente  
**Quando:** 24h e 2h antes do agendamento

**Conteúdo (24h):**
```
⏰ Olá, João! ⏰

🔔 Lembrete: Você tem um agendamento amanhã!

📅 Data e Hora
Terça-feira, 25/10/2025 às 14:00

🏢 Local
Salão Beleza Total

💼 Serviço
Corte de Cabelo

Por favor, confirme sua presença:

✅ Confirmo Presença
📅 Preciso Remarcar
❌ Não Poderei Ir
```

**Código:** `src/lib/uazapi-reminders.ts` → `createReminders()`

### 4. Notificação para Profissional

**Remetente:** WhatsApp da loja (Token Usuário)  
**Destinatário:** Profissional  
**Quando:** Novo agendamento ou cancelamento

**Conteúdo:**
```
📅 Novo Agendamento

Cliente: João Silva
Telefone: (11) 99999-9999
Serviço: Corte de Cabelo
Data/Hora: 25/10/2025 às 14:00

Agendado por: Gestor Maria
```

**Código:** `src/lib/notifications.ts` → `notifyProfessionalNewAppointment()`

---

## ⚙️ Configurações Necessárias

### Para Enviar Confirmações ao Cliente

✅ WhatsApp conectado (`whatsappConectado === true`)  
✅ Token da instância presente (`tokenInstancia`)  
✅ Plano com acesso à feature (`notificacao_cliente_agendamento`)

### Para Enviar Lembretes 24h/2h

✅ WhatsApp conectado  
✅ Token da instância presente  
✅ Lembretes habilitados (`habilitarLembrete24h` / `habilitarLembrete2h`)  
✅ Cliente não tem agendamento futuro nos próximos 5 dias

### Para Notificar Profissional

✅ WhatsApp conectado  
✅ Token da instância presente  
✅ Plano com acesso à feature (`lembrete_profissional`)  
✅ Profissional tem notificações ativadas (`notificarAgendamentos`)

---

## 🔧 Troubleshooting

### ❌ "Confirmação não está sendo enviada"

**Causas possíveis:**
1. WhatsApp não conectado → Conectar em `/configuracoes`
2. Token da instância ausente → Reconectar WhatsApp
3. Plano não tem acesso → Fazer upgrade
4. Modal não apareceu (painel) → Verificar se `whatsappConectado === true`

**Como verificar:**
```typescript
// No console do navegador (F12):
console.log(businessSettings.whatsappConectado); // deve ser true
console.log(businessSettings.tokenInstancia); // deve ter valor
```

### ❌ "Lembretes não estão sendo enviados"

**Causas possíveis:**
1. Cliente tem agendamento futuro (5 dias) → Normal, não envia
2. WhatsApp não conectado → Conectar
3. Lembretes desabilitados → Habilitar em configurações

**Como verificar:**
```typescript
// Verificar se tem agendamentos futuros do cliente
// No Firestore: negocios/{id}/agendamentos
// Filtrar por: cliente.phone e status === 'Agendado'
```

### ❌ "Gestor não recebe notificação"

**Causas possíveis:**
1. Telefone da empresa incorreto → Verificar em `/configuracoes`
2. Sistema fora do ar → Verificar logs

**Como verificar:**
```typescript
console.log(businessSettings.telefone); // deve ser o número correto
```

---

## 📂 Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/app/(dashboard)/agendamentos/page.tsx` | Painel de agendamentos - Modal de confirmação |
| `src/app/api/booking/appointment/route.ts` | API pública - Envio automático |
| `src/app/(dashboard)/agendamentos/actions.ts` | Lógica de webhooks e notificações |
| `src/lib/notifications.ts` | Funções de envio de mensagens |
| `src/lib/uazapi-reminders.ts` | Sistema de lembretes UazAPI |
| `src/components/appointment-confirmation-modal.tsx` | Modal de confirmação |

---

## ✅ Checklist de Implementação

- [x] ✅ Modal de confirmação no painel (gestor)
- [x] ✅ Envio automático no link externo (cliente)
- [x] ✅ Notificação diferenciada para gestor (Painel vs Link)
- [x] ✅ Lembretes 24h/2h via UazAPI
- [x] ✅ Verificação de agendamentos futuros
- [x] ✅ Notificação para profissional
- [x] ✅ Usa número da loja (Token Usuário)
- [x] ✅ Documentação completa

---

## 🎉 Resumo Final

**AGORA FUNCIONA ASSIM:**

1. **Gestor agenda pelo painel:**
   - ✅ Salva agendamento
   - ✅ Notifica gestor
   - ❓ **Pergunta** se quer enviar confirmação ao cliente
   - ✅ Cria lembretes (se conectado)

2. **Cliente agenda pelo link:**
   - ✅ Salva agendamento
   - ✅ Notifica gestor
   - ✅ **Envia automaticamente** confirmação ao cliente
   - ✅ Cria lembretes (se conectado)

3. **Todas as mensagens ao cliente usam o número da loja!** 📱

**Tudo está 100% implementado e funcionando!** 🎉
