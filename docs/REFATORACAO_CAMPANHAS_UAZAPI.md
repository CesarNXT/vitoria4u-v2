# Refatoração do Sistema de Campanhas - UAZAPI Sender Nativo

**Data:** 25/10/2025  
**Autor:** Sistema

## 📋 Resumo da Mudança

O sistema de campanhas foi completamente refatorado para usar o **UAZAPI Sender** nativo ao invés de gerenciar manualmente via CRON e Firestore.

---

## 🔥 O que foi REMOVIDO

### Arquivos Deletados:
1. ❌ `/src/app/(dashboard)/campanhas/actions.ts` - Actions antigas com Firestore
2. ❌ `/src/app/(dashboard)/campanhas/columns.tsx` - Colunas antigas
3. ❌ `/src/app/api/campanhas/execute/route.ts` - CRON de execução de campanhas

### Collections Firestore Removidas:
- ❌ `active_campaigns` - Não é mais necessária
- ⚠️ `negocios/{businessId}/campanhas` - Substituída por `campanhas_historico` (apenas histórico local)

---

## ✅ O que foi CRIADO

### Novos Arquivos:
1. ✅ `/src/app/(dashboard)/campanhas/uazapi-sender-actions.ts` - Actions usando UAZAPI
2. ✅ `/src/app/(dashboard)/campanhas/uazapi-columns.tsx` - Colunas para dados UAZAPI

### Novas Functions:

#### `uazapi-sender-actions.ts`:
- `getClientesAction()` - Buscar clientes (mantido igual)
- `createCampanhaAction()` - Criar campanha via `/sender/simple`
- `getCampanhasAction()` - Listar campanhas via `/sender/listfolders`
- `getCampanhaDetailsAction()` - Detalhes via `/sender/listmessages`
- `pauseCampanhaAction()` - Pausar via `/sender/edit` (action: stop)
- `continueCampanhaAction()` - Continuar via `/sender/edit` (action: continue)
- `deleteCampanhaAction()` - Deletar via `/sender/edit` (action: delete)

---

## 🔄 Mudanças de Status

### Status Antigos (Firestore):
- `Agendada`
- `Em Andamento`
- `Concluída`
- `Cancelada`
- `Expirada`
- `Erro`

### Status Novos (UAZAPI):
- `scheduled` - Agendada
- `sending` - Enviando
- `paused` - Pausada
- `done` - Concluída
- `deleting` - Sendo deletada

---

## 🎯 Benefícios da Refatoração

### 1. **Simplicidade**
- ❌ Antes: CRON + Firestore + Lógica complexa de envio
- ✅ Agora: 1 chamada de API para criar campanha

### 2. **Confiabilidade**
- ❌ Antes: Dependia de CRON rodando a cada minuto
- ✅ Agora: UAZAPI gerencia tudo automaticamente

### 3. **Manutenibilidade**
- ❌ Antes: ~800 linhas de código para gerenciar
- ✅ Agora: ~400 linhas de código (50% redução)

### 4. **Performance Firestore**
- ❌ Antes: Múltiplas leituras/escritas por execução
- ✅ Agora: Apenas histórico local (opcional)

### 5. **Recursos Nativos**
- ✅ Agendamento via timestamp ou minutos
- ✅ Delays anti-ban automáticos (80-120s)
- ✅ Controle de status automático
- ✅ Pausar/Continuar campanhas
- ✅ Paginação de mensagens

---

## 🔧 Como Funciona Agora

### Criar Campanha:
```typescript
// Frontend chama:
createCampanhaAction({
  nome: "Black Friday 2025",
  tipo: "texto",
  mensagem: "Ofertas imperdíveis!",
  dataAgendamento: new Date("2025-11-29"),
  horaInicio: "08:00",
  contatos: [...],
});

// Action faz:
POST /sender/simple {
  numbers: ["5511999999999@s.whatsapp.net"],
  type: "text",
  text: "Ofertas imperdíveis!",
  delayMin: 80,
  delayMax: 120,
  scheduled_for: 1732881600000,
  info: "Black Friday 2025"
}

// UAZAPI:
// ✅ Agenda automaticamente
// ✅ Envia com intervalos anti-ban
// ✅ Atualiza status automaticamente
```

### Listar Campanhas:
```typescript
// Frontend chama:
getCampanhasAction();

// Action faz:
GET /sender/listfolders

// Retorna:
{
  folders: [
    {
      folder_id: "abc123",
      info: "Black Friday 2025",
      status: "sending",
      total_messages: 100,
      sent_messages: 45
    }
  ]
}
```

### Controlar Campanha:
```typescript
// Pausar
POST /sender/edit { folder_id: "abc123", action: "stop" }

// Continuar  
POST /sender/edit { folder_id: "abc123", action: "continue" }

// Deletar
POST /sender/edit { folder_id: "abc123", action: "delete" }
```

---

## 🚨 Breaking Changes

### Para Desenvolvedores:
1. **Imports mudaram:**
   ```typescript
   // ❌ Antes
   import { createCampanhaAction } from './actions';
   
   // ✅ Agora
   import { createCampanhaAction } from './uazapi-sender-actions';
   ```

2. **Status mudaram:**
   ```typescript
   // ❌ Antes
   campanha.status === 'Em Andamento'
   
   // ✅ Agora  
   campanha.status === 'sending'
   ```

3. **Estrutura de dados mudou:**
   ```typescript
   // ❌ Antes
   {
     id: "firestore-id",
     dataAgendamento: Timestamp,
     envios: [...],
     ...
   }
   
   // ✅ Agora
   {
     id: "folder_id",
     nome: string,
     status: string,
     totalContatos: number,
     contatosEnviados: number,
     criadaEm: number
   }
   ```

---

## 📝 Notas Importantes

1. **Histórico local é opcional:**
   - Campanhas antigas no Firestore ainda estão lá
   - Novas campanhas salvam apenas referência em `campanhas_historico`

2. **CRON de campanhas NÃO é mais necessário:**
   - Remover do Vercel Cron Jobs
   - Remover variável `CRON_SECRET` se não usada em outros lugares

3. **Limite de 200 contatos permanece:**
   - Validação mantida no frontend e backend

4. **Agendamento funciona via timestamp:**
   - Mais preciso que antes
   - Não depende de comparação de hora/minuto

---

## ✅ Checklist de Deploy

- [ ] Deletar arquivos antigos
- [ ] Remover CRON `/api/campanhas/execute` do Vercel
- [ ] Testar criação de campanha
- [ ] Testar listagem de campanhas  
- [ ] Testar pausar/continuar
- [ ] Testar deletar
- [ ] Verificar se `NEXT_PUBLIC_WHATSAPP_API_URL` está configurada
- [ ] Deploy em produção

---

## 🐛 Troubleshooting

### Erro: "WhatsApp não conectado"
- Verificar se `whatsappConectado === true` no Firestore
- Verificar se `tokenInstancia` existe

### Erro: "Erro ao criar campanha na UAZAPI"
- Verificar `NEXT_PUBLIC_WHATSAPP_API_URL`
- Verificar se token está válido
- Verificar logs da UAZAPI

### Campanhas não aparecem:
- Verificar se `/sender/listfolders` retorna dados
- Verificar se token está correto
- Tentar criar nova campanha de teste

---

## 📚 Referências

- [UAZAPI Documentação Completa](./UAZAPI_DOCUMENTACAO_COMPLETA.md)
- Seção: **Sender** (linha 7413+)
- Endpoints usados:
  - POST `/sender/simple`
  - GET `/sender/listfolders`
  - POST `/sender/listmessages`
  - POST `/sender/edit`
