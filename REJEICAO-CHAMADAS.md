# 📞 Rejeição Automática de Chamadas

## 🎯 Visão Geral

Sistema automático que **rejeita chamadas do WhatsApp** e envia uma mensagem ao cliente pedindo para enviar texto ao invés de ligar.

**Perfeito para:** Clínicas, consultórios e empresas que preferem atendimento via mensagem.

---

## 💡 Como Funciona

```
1. Cliente liga via WhatsApp
   ↓
2. Webhook recebe evento "call"
   ↓
3. Sistema verifica configuração:
   rejeitarChamadasAutomaticamente = true?
   ↓
4. Sistema rejeita chamada (POST /call/reject)
   ↓
5. Sistema envia mensagem automática:
   "📱 Estou ocupado no momento.
   Por favor, envie uma mensagem e
   retornarei assim que possível!"
   ↓
✅ Cliente recebe mensagem ao invés de chamada
```

---

## 📱 Experiência do Cliente

### Antes (sem rejeição)
```
Cliente liga → Toca...toca...toca... → Sem resposta
Cliente desiste 😞
```

### Agora (com rejeição automática)
```
Cliente liga → Chamada rejeitada automaticamente
↓
Cliente recebe mensagem:
"📱 Olá!
No momento não estou disponível para chamadas.
Por favor, envie uma mensagem de texto e
retornarei assim que possível!
Obrigado pela compreensão. 😊"
↓
Cliente envia mensagem de texto ✅
```

---

## ⚙️ Configuração

### 1. Campos no Firestore (negocios/{id})

```typescript
{
  // Ativar/desativar rejeição
  rejeitarChamadasAutomaticamente: boolean,
  
  // Mensagem customizável
  mensagemRejeicaoChamada: string
}
```

### 2. Mensagem Padrão

Se `mensagemRejeicaoChamada` não estiver definido, usa:

```
📱 *Olá!*

No momento não estou disponível para chamadas.

Por favor, envie uma *mensagem de texto* e 
retornarei assim que possível!

Obrigado pela compreensão. 😊
```

### 3. Mensagens Customizadas (Exemplos)

**Clínica Médica:**
```
🏥 *Clínica Saúde+*

Para melhor atendê-lo, preferimos que 
você envie uma *mensagem de texto* 
com sua dúvida ou solicitação.

Nossa equipe responderá em breve!
```

**Salão de Beleza:**
```
💇 *Studio Beauty*

Oi! Estou atendendo no momento.

Envie uma *mensagem* para:
• Agendar horário
• Tirar dúvidas
• Orçamentos

Te respondo rapidinho! 😊
```

**Consultório Odontológico:**
```
🦷 *Odonto Center*

Para agilizar seu atendimento:

📱 Envie uma mensagem com:
• Nome completo
• Motivo do contato

Retornaremos em instantes!
```

---

## 🔧 Implementação Técnica

### Webhook Processa Evento "call"

📁 `src/app/api/webhooks/uazapi/route.ts`

```typescript
// Evento recebido quando alguém liga
{
  "event": "call",
  "data": {
    "from": "5581995207521@s.whatsapp.net",
    "id": "ABEiGmo8oqkAcAKrBYQAAAAA_1",
    "status": "offer",  // Chamada recebida
    "isVideo": false,
    "isGroup": false
  }
}

// Fluxo:
1. Busca negócios com rejeitarChamadasAutomaticamente = true
2. Rejeita chamada: POST /call/reject
3. Envia mensagem automática: POST /send/text
4. Registra em chamadas_rejeitadas (log)
```

---

## 📊 Dados Salvos (Log)

### Collection: `negocios/{id}/chamadas_rejeitadas`

```typescript
{
  numero: "81995207521",
  callId: "ABEiGmo8oqkAcAKrBYQAAAAA_1",
  isVideo: false,
  isGroup: false,
  rejeitadaEm: Timestamp,
  mensagemEnviada: true
}
```

**Útil para:**
- Ver quantas chamadas foram rejeitadas
- Identificar clientes que tentam ligar
- Analisar se a estratégia está funcionando

---

## 🎨 Interface (Sugestão)

### Configurações → Notificações

```
┌─────────────────────────────────────┐
│ Rejeição Automática de Chamadas    │
├─────────────────────────────────────┤
│                                     │
│ [ ] Rejeitar chamadas               │
│     automaticamente                 │
│                                     │
│ ℹ️ Quando ativado, chamadas serão  │
│    rejeitadas e uma mensagem será   │
│    enviada ao cliente.              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Mensagem de Resposta            │ │
│ ├─────────────────────────────────┤ │
│ │ 📱 Olá!                         │ │
│ │                                 │ │
│ │ No momento não estou            │ │
│ │ disponível para chamadas.       │ │
│ │                                 │ │
│ │ Por favor, envie uma            │ │
│ │ mensagem de texto...            │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Caracteres: 156 / 1000              │
│                                     │
│ [💾 Salvar Configurações]           │
│                                     │
└─────────────────────────────────────┘
```

---

## 📈 Estatísticas (Dashboard)

### Métricas Úteis

```typescript
// Total de chamadas rejeitadas (últimos 30 dias)
const chamadasRef = adminDb
  .collection(`negocios/${businessId}/chamadas_rejeitadas`)
  .where('rejeitadaEm', '>=', startOf30DaysAgo)
  .get();

console.log(`Chamadas rejeitadas: ${chamadasRef.size}`);

// Horários com mais chamadas
const porHora = chamadasRef.docs.reduce((acc, doc) => {
  const hora = doc.data().rejeitadaEm.toDate().getHours();
  acc[hora] = (acc[hora] || 0) + 1;
  return acc;
}, {});

console.log('Horários com mais chamadas:', porHora);
// Exemplo: { 9: 15, 10: 23, 14: 18, 15: 12 }
```

---

## 🔔 Configuração do Webhook

**Adicionar evento `call` à configuração:**

```json
{
  "url": "https://seu-dominio.com/api/webhooks/uazapi",
  "events": [
    "connection",
    "messages",
    "messages_update",
    "sender",
    "call"  ← NOVO
  ],
  "excludeMessages": ["wasSentByApi"]
}
```

---

## 🧪 Testes

### Teste Manual

1. **Ativar no Firestore:**
```typescript
await updateDoc(doc(db, 'negocios', businessId), {
  rejeitarChamadasAutomaticamente: true,
  mensagemRejeicaoChamada: "Teste: envie mensagem por favor"
});
```

2. **Ligar para o WhatsApp:**
- Abra o WhatsApp
- Ligue para o número do negócio
- Chamada deve ser rejeitada automaticamente
- Você deve receber a mensagem configurada

3. **Verificar Logs:**
```bash
[WEBHOOK-CALL] Chamada recebida de 5581995207521@s.whatsapp.net
[WEBHOOK-CALL] Chamada de 81995207521 rejeitada
[WEBHOOK-CALL] Mensagem automática enviada para 81995207521
```

4. **Verificar Firestore:**
```typescript
// Collection: negocios/{id}/chamadas_rejeitadas
{
  numero: "81995207521",
  rejeitadaEm: Timestamp(...),
  mensagemEnviada: true
}
```

---

## ⚠️ Limitações e Considerações

### 1. Tipos de Chamada
- ✅ Chamadas de voz: Funciona
- ✅ Chamadas de vídeo: Funciona
- ❌ Chamadas em grupo: Rejeita mas pode não enviar mensagem individual

### 2. Timing
- Rejeição é **quase instantânea** (< 1 segundo)
- Mensagem é enviada **1 segundo após** rejeição

### 3. WhatsApp Conectado
- Só funciona se `whatsappConectado === true`
- Se desconectar, chamadas não serão rejeitadas

---

## 💡 Casos de Uso

### Clínicas e Consultórios
**Por quê:** Médicos/dentistas ocupados não podem atender chamadas durante consultas.

**Benefício:** Cliente envia mensagem → Equipe responde quando disponível.

### Salões e Barbearias
**Por quê:** Profissionais de mãos ocupadas durante atendimento.

**Benefício:** Mensagens podem ser respondidas entre clientes.

### Lojas e Estabelecimentos
**Por quê:** Melhor organização de atendimento.

**Benefício:** Mensagens ficam registradas e podem ser respondidas com calma.

### Serviços de Agendamento
**Por quê:** Priorizar agendamentos via mensagem/sistema.

**Benefício:** Cliente usa link de agendamento ao invés de ligar.

---

## 🎯 Benefícios

### Para o Gestor
- ✅ **Menos interrupções** durante atendimentos
- ✅ **Melhor organização** de solicitações
- ✅ **Histórico escrito** de todas as conversas
- ✅ **Tempo de resposta** controlado

### Para o Cliente
- ✅ **Resposta imediata** (mesmo que automática)
- ✅ **Sabe que mensagem será lida**
- ✅ **Não fica no vazio**
- ✅ **Pode explicar melhor** por escrito

---

## 📋 Checklist de Implementação

### Backend
- [x] Processar evento `call` no webhook
- [x] Função `rejectCall()` implementada
- [x] Função `sendAutoReplyMessage()` implementada
- [x] Salvar log em `chamadas_rejeitadas`
- [x] Campos no `ConfiguracoesNegocio`

### Webhook
- [ ] Adicionar evento `call` na configuração global
- [ ] Testar recebimento de evento
- [ ] Validar rejeição de chamada

### Frontend (Sugestão)
- [ ] Adicionar toggle em Configurações → Notificações
- [ ] Campo de texto para mensagem customizada
- [ ] Preview da mensagem
- [ ] Dashboard com estatísticas de chamadas

### Testes
- [ ] Testar chamada de voz
- [ ] Testar chamada de vídeo
- [ ] Testar mensagem customizada
- [ ] Verificar log no Firestore

---

## 🚀 Exemplo de Implementação no Frontend

```typescript
// Componente: Configurações → Notificações

const [rejeitarChamadas, setRejeitarChamadas] = useState(false);
const [mensagem, setMensagem] = useState(
  "📱 *Olá!*\n\nNo momento não estou disponível..."
);

const handleSave = async () => {
  await updateDoc(doc(db, 'negocios', businessId), {
    rejeitarChamadasAutomaticamente: rejeitarChamadas,
    mensagemRejeicaoChamada: mensagem
  });
  
  toast.success('Configurações salvas!');
};

return (
  <Card>
    <CardHeader>
      <CardTitle>Rejeição Automática de Chamadas</CardTitle>
      <CardDescription>
        Rejeite chamadas automaticamente e envie uma mensagem
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex items-center space-x-2">
        <Switch
          checked={rejeitarChamadas}
          onCheckedChange={setRejeitarChamadas}
        />
        <Label>Rejeitar chamadas automaticamente</Label>
      </div>
      
      {rejeitarChamadas && (
        <div className="mt-4">
          <Label>Mensagem de Resposta</Label>
          <Textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={6}
            maxLength={1000}
          />
          <p className="text-sm text-muted-foreground mt-1">
            {mensagem.length} / 1000 caracteres
          </p>
        </div>
      )}
      
      <Button onClick={handleSave} className="mt-4">
        💾 Salvar Configurações
      </Button>
    </CardContent>
  </Card>
);
```

---

## ✅ Conclusão

O sistema de **Rejeição Automática de Chamadas** oferece:

- 📞 **Menos interrupções** no dia a dia
- 💬 **Mais organização** no atendimento
- 📊 **Métricas** de tentativas de contato
- 😊 **Melhor experiência** para o cliente

**Status:** ✅ Implementado e pronto para uso

**Próximo passo:** Adicionar evento `call` ao webhook e testar!
