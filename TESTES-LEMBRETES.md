# 🧪 Guia de Testes - Sistema de Lembretes UazAPI

## 📋 Cenários de Teste

### ✅ Teste 1: Criar Agendamento com Lembretes

**Objetivo:** Verificar se lembretes são criados corretamente

**Passos:**
1. Acessar Dashboard → Agendamentos
2. Clicar em "Novo Agendamento"
3. Preencher:
   - Cliente com telefone válido
   - Data: amanhã às 14:00
   - Status: Agendado
4. Salvar

**Resultado Esperado:**
```typescript
// No Firestore (agendamentos/{id}):
{
  reminderCampaigns: [
    { 
      type: '24h', 
      folderId: 'abc123...', 
      scheduledFor: '2024-01-24T14:00:00Z' 
    },
    { 
      type: '2h', 
      folderId: 'def456...', 
      scheduledFor: '2024-01-25T12:00:00Z' 
    }
  ]
}
```

**Verificação:**
```typescript
// Console do navegador:
console.log('Campanhas criadas:', agendamento.reminderCampaigns);

// Verificar na UazAPI:
// GET https://vitoria4u.uazapi.com/sender/listfolders?status=scheduled
// Deve aparecer 2 campanhas com info: "Lembrete 24h" e "Lembrete 2h"
```

---

### ✅ Teste 2: Editar Agendamento (Mudar Horário)

**Objetivo:** Verificar se lembretes antigos são cancelados e novos são criados

**Passos:**
1. Abrir agendamento existente (com reminderCampaigns)
2. Mudar horário de 14:00 para 16:00
3. Salvar

**Resultado Esperado:**
- Campanhas antigas (14:00) são CANCELADAS na UazAPI
- Novas campanhas (16:00) são CRIADAS
- `reminderCampaigns` é atualizado com novos folder_ids

**Verificação:**
```bash
# Antes de editar - listar campanhas ativas:
folder_id: abc123 (14:00)
folder_id: def456 (12:00)

# Depois de editar - campanhas antigas deletadas:
# (não aparecem mais na listagem)

# Novas campanhas criadas:
folder_id: xyz789 (16:00)
folder_id: uvw012 (14:00)
```

---

### ✅ Teste 3: Cancelar Agendamento

**Objetivo:** Verificar se lembretes são cancelados automaticamente

**Passos:**
1. Editar agendamento existente
2. Mudar status de "Agendado" para "Cancelado"
3. Salvar

**Resultado Esperado:**
- Campanhas são DELETADAS na UazAPI via `/sender/edit`
- Cliente NÃO recebe lembretes

**Verificação:**
```typescript
// Antes de cancelar:
GET /sender/listfolders?status=scheduled
// Resposta: [{ id: 'abc123', ... }, { id: 'def456', ... }]

// Depois de cancelar:
GET /sender/listfolders?status=scheduled
// Resposta: [] (vazio - campanhas removidas)
```

---

### ✅ Teste 4: Deletar Agendamento

**Objetivo:** Verificar se lembretes são cancelados ao deletar

**Passos:**
1. Clicar no ícone de lixeira
2. Confirmar exclusão

**Resultado Esperado:**
- Agendamento é deletado do Firestore
- Campanhas são CANCELADAS na UazAPI
- Cliente NÃO recebe lembretes

---

### ✅ Teste 5: Agendamento com WhatsApp Desconectado

**Objetivo:** Garantir que sistema não quebra se WhatsApp offline

**Passos:**
1. Desconectar WhatsApp (Configurações)
2. Criar novo agendamento
3. Salvar

**Resultado Esperado:**
- Agendamento é CRIADO normalmente
- `reminderCampaigns` é VAZIO ou UNDEFINED
- Sistema NÃO trava
- Usuário NÃO vê erro

**Log esperado:**
```
❌ WhatsApp não está conectado
ℹ️ Nenhuma campanha para criar
```

---

### ✅ Teste 6: Agendamento para Hoje (sem tempo para 24h)

**Objetivo:** Verificar lógica de criação de lembretes

**Passos:**
1. Criar agendamento para HOJE às 20:00 (horário atual: 19:00)
2. Salvar

**Resultado Esperado:**
- Lembrete 24h NÃO é criado (já passou)
- Lembrete 2h NÃO é criado (faltam apenas 1h)
- `reminderCampaigns` é VAZIO

**Log esperado:**
```
ℹ️ Horário de lembrete 24h já passou
ℹ️ Horário de lembrete 2h já passou
✅ 0 lembretes criados
```

---

### ✅ Teste 7: Agendamento para Daqui 12h

**Objetivo:** Verificar criação seletiva de lembretes

**Passos:**
1. Criar agendamento para daqui 12 horas
2. Salvar

**Resultado Esperado:**
- Lembrete 24h NÃO é criado (já passou)
- Lembrete 2h É CRIADO (ainda falta tempo)
- `reminderCampaigns` tem APENAS 1 item

```typescript
reminderCampaigns: [
  { type: '2h', folderId: '...', scheduledFor: '...' }
  // Apenas 2h, não tem 24h
]
```

---

## 🔍 Inspeção Manual na UazAPI

### Listar Campanhas Ativas
```bash
# Via curl/Postman:
GET https://vitoria4u.uazapi.com/sender/listfolders?status=scheduled
Headers:
  token: SEU_TOKEN_INSTANCIA
  
# Resposta esperada:
{
  "folders": [
    {
      "id": "folder_abc123",
      "info": "Lembrete 24h - Agendamento appt-1234",
      "status": "scheduled",
      "scheduledFor": "2024-01-25T14:00:00Z",
      "totalMessages": 1
    },
    {
      "id": "folder_def456",
      "info": "Lembrete 2h - Agendamento appt-1234",
      "status": "scheduled",
      "scheduledFor": "2024-01-26T12:00:00Z",
      "totalMessages": 1
    }
  ]
}
```

### Listar Mensagens de uma Campanha
```bash
POST https://vitoria4u.uazapi.com/sender/listmessages
Headers:
  token: SEU_TOKEN_INSTANCIA
Body:
{
  "folder_id": "folder_abc123",
  "page": 1,
  "pageSize": 10
}

# Resposta:
{
  "messages": [
    {
      "number": "5511999999999@s.whatsapp.net",
      "status": "scheduled",
      "scheduledFor": "2024-01-25T14:00:00Z",
      "message": "⏰ Olá, João! ⏰\n\n🔔 Lembrete: Você tem um agendamento amanhã!..."
    }
  ]
}
```

### Cancelar Campanha Manualmente (Debug)
```bash
POST https://vitoria4u.uazapi.com/sender/edit
Headers:
  token: SEU_TOKEN_INSTANCIA
Body:
{
  "folder_id": "folder_abc123",
  "action": "delete"
}

# Resposta:
{
  "success": true,
  "message": "Campanha deletada com sucesso"
}
```

---

## 📊 Checklist de Validação

Antes de considerar o teste completo, verificar:

### ✅ Criação
- [ ] folder_id é salvo no Firestore
- [ ] Campanha aparece em `/sender/listfolders`
- [ ] Horário agendado está correto (scheduledFor)
- [ ] Mensagem tem texto correto

### ✅ Edição
- [ ] Campanhas antigas são deletadas
- [ ] Novas campanhas são criadas
- [ ] folder_ids são atualizados
- [ ] Não há campanhas duplicadas

### ✅ Cancelamento
- [ ] Campanhas são deletadas via API
- [ ] Não aparecem mais em listfolders
- [ ] Cliente não recebe lembretes

### ✅ Casos Extremos
- [ ] WhatsApp desconectado → não quebra
- [ ] Token inválido → não quebra
- [ ] Horário passado → não cria lembrete
- [ ] Telefone inválido → não quebra

---

## 🐛 Problemas Comuns

### ❌ "folder_id não retornado pela API"
**Causa:** UazAPI mudou formato de resposta
**Solução:** Verificar em `uazapi-reminders.ts` linha ~145:
```typescript
const folderId = result.folder_id || result.folderId || result.id;
```

### ❌ "Campanhas não são canceladas"
**Causa:** tokenInstancia incorreto ou expirado
**Solução:** 
1. Verificar `businessSettings.tokenInstancia`
2. Reconectar WhatsApp

### ❌ "Telefone no formato errado"
**Causa:** Telefone sem código do país
**Solução:** Função `formatWhatsAppNumber` adiciona "55" automaticamente

### ❌ "Lembretes enviados mesmo após cancelamento"
**Causa:** Cancelamento falhou silenciosamente
**Solução:** Verificar logs no console:
```
Erro ao cancelar lembretes: [mensagem de erro]
```

---

## 🎯 Testes de Integração

### Cenário Completo End-to-End

```typescript
// 1. Criar agendamento
const agendamento = await createAppointment({
  cliente: { phone: '11999999999', ... },
  date: tomorrow,
  startTime: '14:00',
  status: 'Agendado'
});

// Verificar:
expect(agendamento.reminderCampaigns).toHaveLength(2);
expect(agendamento.reminderCampaigns[0].type).toBe('24h');
expect(agendamento.reminderCampaigns[1].type).toBe('2h');

// 2. Editar horário
await updateAppointment(agendamento.id, {
  startTime: '16:00' // Mudou de 14:00 para 16:00
});

// Verificar:
const updated = await getAppointment(agendamento.id);
expect(updated.reminderCampaigns[0].folderId).not.toBe(
  agendamento.reminderCampaigns[0].folderId
); // Novo folder_id

// 3. Cancelar
await updateAppointment(agendamento.id, {
  status: 'Cancelado'
});

// Verificar:
const campaigns = await listReminderCampaigns(tokenInstancia);
const hasCampaign = campaigns.some(c => 
  c.info.includes(agendamento.id)
);
expect(hasCampaign).toBe(false); // Não deve existir mais
```

---

## ✅ Aprovação Final

Sistema está pronto quando:

1. ✅ Todos os 7 cenários de teste passam
2. ✅ Checklist de validação completo
3. ✅ Nenhum problema comum encontrado
4. ✅ Testes de integração E2E funcionam
5. ✅ Logs de debug estão claros e informativos

**Status:** 🚀 Pronto para produção!
