# 📱 Guia Completo - WhatsApp UazAPI

## 📋 Índice

1. [Lembretes Automáticos (24h e 2h)](#lembretes-automáticos)
2. [Check Returns (Retorno de Clientes)](#check-returns)
3. [Disparo em Massa](#disparo-em-massa)
4. [Regras e Boas Práticas](#regras-e-boas-práticas)

---

## 🔔 Lembretes Automáticos

### Arquivo: `src/lib/uazapi-reminders.ts`

### Como Funciona

Quando um agendamento é criado, o sistema automaticamente:
1. ✅ Cria 2 campanhas na UazAPI (24h e 2h antes do agendamento)
2. ✅ Envia mensagens com botões interativos de confirmação
3. ✅ Verifica se cliente tem agendamento futuro (5 dias) **ANTES** de enviar

### Regras Implementadas

- 🔍 **Não envia se**: Cliente já tem outro agendamento agendado nos próximos 5 dias
- ⏰ **Timing**: Envia 24h e 2h antes do horário agendado
- 🔘 **Interativo**: Botões de confirmação/cancelamento/remarcação
- 📊 **Rastreável**: Salva `folder_id` no agendamento para controle

### Uso

```typescript
import { createReminders, updateReminders, deleteReminders } from '@/lib/uazapi-reminders';

// Criar lembretes ao criar agendamento
const campaigns = await createReminders(
  businessId,
  agendamentoId,
  agendamento,
  businessSettings
);

// Atualizar lembretes ao editar agendamento
const newCampaigns = await updateReminders(
  businessId,
  agendamentoId,
  agendamentoAtualizado,
  businessSettings,
  oldCampaigns // Campanhas antigas para cancelar
);

// Deletar lembretes ao cancelar agendamento
await deleteReminders(
  tokenInstancia,
  campaigns
);
```

### Exemplo de Mensagem de Lembrete

**24h antes:**
```
⏰ *Olá, João!* ⏰

🔔 Lembrete: Você tem um agendamento amanhã!

📅 *Data e Hora*
Terça-feira, 25/10/2025 às 14:00

🏢 *Local*
Clínica Exemplo

💼 *Serviço*
Consulta Dermatológica

Por favor, confirme sua presença:

✅ Confirmo Presença
📅 Preciso Remarcar
❌ Não Poderei Ir
```

---

## 🔄 Check Returns

### Arquivo: `src/app/api/cron/check-returns/route.ts`

### Como Funciona

Verifica diariamente se algum cliente deve retornar baseado no `returnInDays` do serviço.

### Regras Implementadas

- 🔍 **Não envia se**: Cliente já tem agendamento futuro nos próximos 5 dias
- 📅 **Timing**: Envia no dia exato do retorno (`dataAgendamento + returnInDays`)
- ⚡ **Otimizado**: Processa em batches de 15 negócios
- 📊 **Rastreável**: Retorna estatísticas de envios

### Configuração CRON

```bash
# Rodar diariamente às 9h
0 9 * * * curl -X GET https://seu-dominio.com/api/cron/check-returns \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

### Exemplo

```typescript
// No serviço, definir dias para retorno:
const servico = {
  name: 'Limpeza de Pele',
  returnInDays: 30, // Cliente deve retornar em 30 dias
  // ...
};

// O sistema enviará automaticamente mensagem após 30 dias
// SE o cliente não tiver outro agendamento futuro
```

---

## 📤 Disparo em Massa

### Arquivo: `src/lib/uazapi-mass-sender.ts`

### 🚀 Nova Implementação com `/sender/simple`

**VANTAGENS:**
- ✅ UazAPI gerencia fila automaticamente
- ✅ Não precisa de cron rodando constantemente
- ✅ Pode pausar/continuar/cancelar
- ✅ Rastreamento com `folder_id`

### Regras Implementadas

| Regra | Valor | Descrição |
|-------|-------|-----------|
| ⏱️ **Intervalo** | 80-120s aleatório | Entre cada mensagem |
| 📊 **Limite** | 200 contatos | Por campanha |
| 🕐 **Horário** | Comercial | Apenas horário de funcionamento |
| 🚫 **Domingos** | Bloqueado | Não envia em domingos |
| 📅 **Agendamento** | Sim | Pode agendar para futuro |

### Uso Completo

```typescript
import {
  createMassCampaign,
  pauseMassCampaign,
  resumeMassCampaign,
  cancelMassCampaign,
  listActiveCampaigns,
  type MassContacto
} from '@/lib/uazapi-mass-sender';

// 1. CRIAR CAMPANHA DE TEXTO
const contacts: MassContacto[] = [
  { phone: '11999887766', name: 'João Silva' },
  { phone: '11988776655', name: 'Maria Santos' },
  // ... até 200 contatos
];

const result = await createMassCampaign({
  businessId: 'business123',
  tokenInstancia: 'token_da_instancia',
  contacts,
  message: {
    type: 'text',
    content: '🎉 Promoção especial! Agende agora e ganhe 20% de desconto!'
  },
  scheduledFor: new Date('2025-10-26T09:00:00'), // Opcional: agendar para data específica
  info: 'Campanha Black Friday 2025'
});

if (result.success) {
  console.log('Campanha criada:', result.folderId);
}

// 2. CRIAR CAMPANHA COM IMAGEM
const imageResult = await createMassCampaign({
  businessId: 'business123',
  tokenInstancia: 'token_da_instancia',
  contacts,
  message: {
    type: 'image',
    content: 'https://exemplo.com/promo.jpg',
    caption: '🎉 Promoção especial! Confira!'
  }
});

// 3. PAUSAR CAMPANHA
await pauseMassCampaign(tokenInstancia, folderId);

// 4. CONTINUAR CAMPANHA
await resumeMassCampaign(tokenInstancia, folderId);

// 5. CANCELAR CAMPANHA
await cancelMassCampaign(tokenInstancia, folderId);

// 6. LISTAR CAMPANHAS ATIVAS
const campaigns = await listActiveCampaigns(tokenInstancia, 'scheduled');
```

### Horário Comercial Automático

O sistema verifica automaticamente:

```typescript
// Se tentar criar campanha fora do horário comercial:
const result = await createMassCampaign({
  // ... config
  scheduledFor: new Date('2025-10-26T03:00:00') // 3h da manhã
});

// Sistema vai agendar automaticamente para próximo horário comercial
// Ex: Segunda-feira 9h
```

### Divisão Automática em Lotes

Se você tem mais de 200 contatos, divida em múltiplas campanhas:

```typescript
const allContacts = [...]; // 500 contatos

// Dividir em lotes de 200
const batches = [];
for (let i = 0; i < allContacts.length; i += 200) {
  batches.push(allContacts.slice(i, i + 200));
}

// Criar uma campanha para cada lote
for (const batch of batches) {
  const result = await createMassCampaign({
    businessId,
    tokenInstancia,
    contacts: batch,
    message: {...},
    info: `Campanha - Lote ${batches.indexOf(batch) + 1}`
  });
  
  // Aguardar entre cada lote para não sobrecarregar
  await new Promise(r => setTimeout(r, 5000));
}
```

---

## ⚙️ Regras e Boas Práticas

### Anti-Ban (Evitar Bloqueio da Meta/WhatsApp)

✅ **O QUE FAZEMOS:**
- Intervalo aleatório 80-120s entre mensagens
- Máximo 200 contatos por campanha
- Apenas horário comercial
- Não envia domingos
- Simula comportamento humano

❌ **O QUE EVITAR:**
- Enviar mais de 200 mensagens por campanha
- Enviar fora do horário comercial
- Enviar domingos/feriados
- Mensagens idênticas para todos (varie um pouco)
- Enviar para números inválidos/bloqueados

### Verificação de Agendamentos Futuros

**IMPORTANTE:** Lembretes e check-returns verificam se o cliente já tem agendamento futuro (5 dias).

**Por quê?**
- ✅ Evita experiência ruim (cliente recebe lembrete mas já agendou outro horário)
- ✅ Economia (não gasta mensagens desnecessárias)
- ✅ Profissionalismo (não bombardeia o cliente)

### Monitoramento

```typescript
// Verificar status das campanhas de lembrete
import { listReminderCampaigns } from '@/lib/uazapi-reminders';

const active = await listReminderCampaigns(tokenInstancia);
console.log('Campanhas ativas:', active);

// Verificar status das campanhas em massa
import { listActiveCampaigns } from '@/lib/uazapi-mass-sender';

const mass = await listActiveCampaigns(tokenInstancia, 'sending');
console.log('Campanhas em envio:', mass);
```

### Webhook Events

O webhook em `/api/whatsapp/webhook` já está configurado para receber:

- `sender`: Status de envio das campanhas
  - `message_sent`: Mensagem enviada
  - `message_delivered`: Mensagem entregue
  - `message_read`: Mensagem lida
  - `message_failed`: Falha no envio

### Exemplo Completo de Fluxo

```typescript
// 1. Cliente agenda
const agendamento = await createAppointment(...);

// 2. Sistema cria lembretes automaticamente
const reminders = await createReminders(
  businessId,
  agendamento.id,
  agendamento,
  business
);
// Salvar no agendamento
await updateDoc(agendamentoRef, {
  reminderCampaigns: reminders
});

// 3. Cliente comparece e finaliza serviço
await updateDoc(agendamentoRef, {
  status: 'Finalizado'
});

// 4. Após X dias, check-returns envia mensagem
// (se cliente não tiver outro agendamento futuro)

// 5. Cliente recebe mensagem de retorno e agenda novamente
// Ciclo se repete!
```

---

## 🎯 Checklist de Implementação

- [x] ✅ Lembretes 24h e 2h antes
- [x] ✅ Verificação de agendamentos futuros (lembretes)
- [x] ✅ Check-returns com verificação
- [x] ✅ Disparo em massa com `/sender/simple`
- [x] ✅ Intervalo 80-120s aleatório
- [x] ✅ Limite de 200 contatos
- [x] ✅ Horário comercial automático
- [x] ✅ Bloqueio de domingos
- [x] ✅ Pausar/continuar/cancelar campanhas
- [x] ✅ Rastreamento com folder_id

---

## 📞 Suporte

Se precisar de ajuda:
1. Verificar logs no console (buscar por `[REMINDER]`, `[MASS-SENDER]`, `[CHECK-RETURNS]`)
2. Testar com webhook em `https://docs.uazapi.com/`
3. Verificar se WhatsApp está conectado
4. Confirmar que `tokenInstancia` está correto

**UazAPI Docs:** https://docs.uazapi.com/
