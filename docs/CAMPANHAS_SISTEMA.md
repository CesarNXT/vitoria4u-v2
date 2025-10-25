# 📤 Sistema de Campanhas - Documentação Completa

## 🎯 Visão Geral

O sistema de campanhas permite envio em massa de mensagens via WhatsApp com controle inteligente de quota diária (200/dia) e rastreamento completo de cada envio.

---

## ✅ Funcionalidades Implementadas

### 1. **Controle de Quota Diária (200 envios/dia)**
- ✅ Rastreamento em tempo real de quantas mensagens foram enviadas hoje
- ✅ Validação antes de criar campanha (não permite ultrapassar 200)
- ✅ Exibição de quota disponível na interface
- ✅ Atualização automática após cada campanha

### 2. **Rastreamento de Histórico**
- ✅ Cada cliente registra quais campanhas recebeu (`campanhas_recebidas[]`)
- ✅ Data da última campanha recebida (`ultima_campanha`)
- ✅ Filtros opcionais: "Excluir quem já recebeu nos últimos X dias"
- ✅ Status individual de cada envio (pending/sent/failed)

### 3. **Gerenciamento Completo**
- ✅ Criar campanhas (texto, imagem, áudio, vídeo)
- ✅ Agendar para data/hora específica
- ✅ Pausar/Continuar campanhas via UazAPI
- ✅ Deletar campanhas (cancela envios pendentes)
- ✅ Ver detalhes e progresso em tempo real

### 4. **Interface Otimizada**
- ✅ Removida tab duplicada "Envio em Massa"
- ✅ Exibição de quota no topo da página
- ✅ Alertas quando quota está baixa (< 50)
- ✅ Validações em tempo real no formulário

---

## 📊 Estrutura Firestore

### Campanhas
```
negocios/{businessId}/campanhas/{campaignId}
├── folder_id (string) - ID da campanha na UazAPI
├── nome (string)
├── tipo ('texto' | 'imagem' | 'audio' | 'video')
├── mensagem (string) - Apenas para texto
├── mediaUrl (string) - URL da mídia
├── status ('scheduled' | 'sending' | 'paused' | 'done' | 'failed')
├── total_contacts (number)
├── sent_count (number)
├── failed_count (number)
├── scheduled_for (timestamp)
├── created_at (timestamp)
├── updated_at (timestamp)
└── contatos (array)
    ├── clienteId (string)
    ├── nome (string)
    ├── telefone (string | number)
    ├── status ('pending' | 'sent' | 'failed')
    ├── sent_at (timestamp)
    └── error (string)
```

### Estatísticas Diárias
```
negocios/{businessId}/daily_stats/{YYYY-MM-DD}
├── date (string) - Ex: "2025-01-25"
├── sent_count (number) - Total enviado hoje
├── campaign_ids (array) - IDs das campanhas do dia
└── last_updated (timestamp)
```

### Histórico no Cliente
```
negocios/{businessId}/clientes/{clienteId}
├── ... (campos existentes)
├── campanhas_recebidas (array<string>) - IDs das campanhas
└── ultima_campanha (timestamp)
```

---

## 🔄 Fluxo de Criação de Campanha

```mermaid
1. Usuário preenche formulário
   ↓
2. Sistema valida quota disponível hoje
   ↓
3. Se quota insuficiente → ERRO (mostra quantos faltam)
   ↓
4. Prepara payload para UazAPI:
   - numbers: ["5511999999999@s.whatsapp.net", ...]
   - delayMin: 80 (segundos)
   - delayMax: 120 (segundos)
   - scheduled_for: timestamp
   - type, text/file
   ↓
5. Envia para UazAPI /sender/simple
   ↓
6. Recebe folder_id
   ↓
7. Salva no Firestore com todos os detalhes
   ↓
8. Incrementa daily_stats do dia
   ↓
9. Registra em cada cliente.campanhas_recebidas[]
   ↓
10. UazAPI envia automaticamente no horário agendado
```

---

## 🛡️ Regras Anti-Ban

### Implementadas na UazAPI
1. **Intervalo aleatório:** 80-120 segundos entre cada mensagem
2. **Limite diário:** Máximo 200 mensagens/dia
3. **Horário comercial:** Apenas entre 8h-18h (opcional, via config negócio)
4. **Sem domingos:** Não envia domingos por padrão

### Validações no Frontend
- ❌ Bloqueia se tentar enviar mais que quota disponível
- ❌ Bloqueia se data/hora é passado
- ⚠️ Alerta quando quota < 50
- ✅ Mostra previsão de término baseada no intervalo

---

## 🎨 Interface - Principais Melhorias

### Antes ❌
- 2 tabs confusas (Firestore vs Massa)
- Sem controle de 200/dia
- Permitia criar 10 campanhas de 200 = 2000/dia
- Sem rastreamento de quem já recebeu

### Depois ✅
- Interface única e clara
- Quota visível sempre
- Validação real de 200/dia
- Filtros: "Excluir quem já recebeu"
- Status detalhado de cada envio

---

## 📁 Arquivos Principais

### Backend (Server Actions)
```
src/app/(dashboard)/campanhas/uazapi-sender-actions.ts
├── getClientesAction() - Com filtros opcionais
├── createCampanhaAction() - Cria + valida quota
├── getCampanhasAction() - Lista do Firestore
├── getQuotaAction() - Quota disponível
├── pauseCampanhaAction()
├── continueCampanhaAction()
└── deleteCampanhaAction()
```

### Sistema de Rastreamento
```
src/lib/campaign-tracking.ts
├── getDailyStats() - Stats do dia
├── getAvailableQuota() - Quota restante
├── splitContactsByDays() - Divide em múltiplos dias
├── saveCampaign() - Salva no Firestore
├── incrementDailyStats() - Atualiza contador
├── addCampaignToClientHistory() - Registra no cliente
└── getClientsWithCampaignHistory() - Filtrar histórico
```

### Frontend
```
src/app/(dashboard)/campanhas/
├── page.tsx - Página principal (sem tabs duplicadas)
├── campaign-form.tsx - Formulário com validações
├── uazapi-columns.tsx - Colunas da tabela
└── media-upload.tsx - Upload de mídias
```

---

## 🚀 Como Usar

### 1. Criar Campanha
```typescript
1. Clique em "Nova Campanha"
2. Preencha:
   - Nome
   - Tipo (texto/imagem/áudio/vídeo)
   - Conteúdo
   - Data e hora
3. Selecione contatos
   - Checkbox: "Excluir quem já recebeu nos últimos 30 dias"
4. Valida automaticamente:
   - Se tem quota disponível
   - Se não ultrapassou 200/dia
5. Agendar → UazAPI envia automaticamente
```

### 2. Gerenciar Campanhas
- **Ver detalhes**: Status individual de cada envio
- **Pausar**: Para uma campanha em andamento
- **Continuar**: Retoma campanha pausada  
- **Deletar**: Cancela todos os envios pendentes

### 3. Monitorar Quota
- Exibida no topo: "150 de 200 envios disponíveis (50 já usados)"
- Atualiza automaticamente
- Alerta vermelho se < 50

---

## 🔧 Configurações

### Variáveis de Ambiente
```env
NEXT_PUBLIC_WHATSAPP_API_URL=https://vitoria4u.uazapi.com
NEXT_PUBLIC_WHATSAPP_API_TOKEN=seu-token-admin
```

### Limites
```typescript
const DAILY_LIMIT = 200; // Envios por dia
const DELAY_MIN = 80;    // Segundos mínimo
const DELAY_MAX = 120;   // Segundos máximo
```

---

## 🐛 Tratamento de Erros

### Validações Implementadas
1. ✅ Quota insuficiente → Mostra quantos faltam
2. ✅ Nenhum contato selecionado → Alerta
3. ✅ Data/hora passada → Bloqueia
4. ✅ Mensagem vazia → Valida
5. ✅ WhatsApp desconectado → Aviso claro

### Retry Automático
- UazAPI: 3 tentativas com backoff exponencial
- Firestore: Tratamento de erros de conexão

---

## 📈 Estatísticas

### Disponíveis na Interface
- Total de campanhas
- Campanhas agendadas
- Campanhas enviando
- Campanhas concluídas
- Quota do dia

### Via API
```typescript
const stats = await getCampaignStats(businessId);
// Retorna:
{
  total_campaigns: 42,
  total_sent: 8400,
  total_failed: 12,
  active_campaigns: 3
}
```

---

## 🔒 Segurança

1. **Server Actions**: Todas as operações validam sessão
2. **Firestore Rules**: Apenas dono do negócio pode criar campanhas
3. **Quota Firestore**: Impossível burlar via frontend
4. **Token WhatsApp**: Validado a cada request

---

## ✨ Próximas Melhorias (Futuro)

- [ ] Dividir automaticamente em múltiplos dias se > 200
- [ ] Templates de mensagens salvos
- [ ] Personalização por variáveis ({{nome}}, {{data}}, etc)
- [ ] Estatísticas de entrega e visualização
- [ ] Campanhas recorrentes (mensal, semanal)
- [ ] A/B testing de mensagens
- [ ] Integração com relatórios

---

## 📞 Suporte

**Dúvidas sobre o sistema?**
- Documentação UazAPI: Ver `docs/UAZAPI_DOCUMENTACAO_COMPLETA.md`
- Firebase: Firestore rules em `/firestore.rules`
- Tipos: `src/lib/types.ts`

**Desenvolvedor:** Cesar (Windsurf AI + Claude 3.5 Sonnet)
**Versão:** 2.0 (Refatorado em 25/01/2025)
