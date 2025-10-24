# 🧹 Gestão de Recursos - Instâncias WhatsApp

**Objetivo:** Garantir que NENHUMA instância fique abandonada na UazAPI, economizando recursos e respeitando limites.

---

## 🎯 **Regra de Ouro:**

> **Instância desconectada = Instância deletada**  
> **Instância não usada = Instância deletada**

**Por quê?**
- ✅ Economia de recursos na UazAPI
- ✅ Respeitar limite de instâncias simultâneas
- ✅ Liberar espaço para novos usuários
- ✅ Manter sistema limpo e eficiente

---

## 🚫 **Situações que DELETAM Instância:**

### **1. Timeout - Não Conectou**

| Método | Timeout | Motivo | Ação |
|--------|---------|--------|------|
| **Pair Code** | **60 segundos** | Código muda a cada 60s | Deleta instância |
| **QR Code** | **60 segundos** | Código muda a cada 60s | Deleta instância |

**Por que 60 segundos?**
- ✅ QR Code **muda** a cada 60s
- ✅ Pair Code **muda** a cada 60s
- ✅ Se não conectou em 60s, código já é **inválido**
- ✅ Usuário precisa **gerar novo** código (= nova instância)

**Fluxo:**
```
1. Usuário solicita conexão
2. Instância criada: status = "criando"
3. Gera Pair Code ou QR Code
4. Sistema aguarda 60s em background
5. Se NÃO conectar no tempo → DELETA instância ✅
6. Firestore: { tokenInstancia: '', whatsappStatus: 'timeout' }
7. SMS: "⚠️ Tempo esgotado. Tente novamente."
8. Usuário clica novamente → CRIA NOVA instância ✅
```

---

### **2. Desconexão - Usuário Desconectou**

**Webhook recebe:**
```json
{
  "EventType": "connection",
  "instance": {
    "status": "disconnected",
    "lastDisconnectReason": "401: logged out from another device"
  }
}
```

**Ação imediata:**
```
1. Detecta desconexão
2. DELETA instância na UazAPI ✅
3. Limpa Firestore: { tokenInstancia: '', whatsappStatus: 'desconectado' }
4. Notifica usuário: "⚠️ WhatsApp Desconectado. Motivo: ..."
```

---

### **3. Erro na Conexão**

**Quando:**
- API falha ao criar instância
- Token inválido
- Erro ao conectar

**Ação:**
```
1. Detecta erro
2. DELETA instância (se existir) ✅
3. Limpa Firestore: { tokenInstancia: '', whatsappStatus: 'erro' }
```

---

### **4. Limpeza Manual/Automática**

**Endpoint:** `GET /api/admin/cleanup-instances`

**Deleta instâncias:**
- Status "connecting" há mais de 10 minutos
- Status "desconectado" (já deveria ter sido deletado)
- Status "timeout"
- Status "erro"
- Status "criando" há mais de 10 minutos

**Uso:**
```bash
# Verificar e limpar todas as instâncias abandonadas
curl https://seu-dominio.com/api/admin/cleanup-instances

# Deletar instância específica
curl -X POST https://seu-dominio.com/api/admin/cleanup-instances?businessId=xxx
```

---

## ✅ **Garantias do Sistema:**

### **1. Timeout Automático**

```typescript
// AMBOS: 60 segundos (código muda a cada 60s)
waitAndCheckConnection(api, businessId, phone, 60)

// Após 60s:
if (!connected) {
  await api.deleteInstance() // ✅ Deleta instância
  await updateFirestore({ 
    tokenInstancia: '',         // ✅ Limpa token
    whatsappStatus: 'timeout'   // ✅ Marca como timeout
  })
  await notifyUser("⚠️ Tempo esgotado. Tente novamente.")
}

// Usuário clica novamente → CRIA NOVA instância com código novo ✅
```

---

### **2. Webhook Monitora Tudo**

```typescript
// Qualquer desconexão:
if (status === 'disconnected') {
  await api.deleteInstance() // ✅ Deleta imediatamente
  await updateFirestore({ tokenInstancia: '' })
  await notifyUser("Desconectado")
}
```

---

### **3. Limpeza Periódica (Opcional)**

**Opção A: Cron Job (Vercel)**

```json
// vercel.json
{
  "crons": [{
    "path": "/api/admin/cleanup-instances",
    "schedule": "0 */6 * * *"  // A cada 6 horas
  }]
}
```

**Opção B: GitHub Actions**

```yaml
# .github/workflows/cleanup.yml
name: Cleanup Instances

on:
  schedule:
    - cron: '0 */6 * * *'  # A cada 6 horas

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup
        run: |
          curl https://seu-dominio.com/api/admin/cleanup-instances
```

---

## 📊 **Monitoramento**

### **Logs Importantes:**

```bash
# Timeout (não conectou)
[WHATSAPP-CONNECT] ⚠️ Timeout: Instância xxx não conectou em 300s
[WHATSAPP-CONNECT] ✅ Instância xxx deletada

# Desconexão
[WEBHOOK-CONNECTION] 🗑️ Desconexão detectada: xxx
[WEBHOOK-CONNECTION] ✅ Instância xxx deletada

# Limpeza manual
[CLEANUP] 🗑️ Deletando instância: xxx (status: connecting, 15min atrás)
[CLEANUP] ✅ Instância xxx deletada
```

---

### **Verificar Status:**

```bash
# Ver quantas instâncias estão abandonadas
curl https://seu-dominio.com/api/admin/cleanup-instances

# Resposta:
{
  "success": true,
  "checked": 10,        // Total verificado
  "deleted": 3,         // Deletadas
  "deletedInstances": ["id1", "id2", "id3"],
  "errors": 0
}
```

---

## 🎯 **Estados no Firestore:**

| Status | Significado | Tem Token? | Ação |
|--------|-------------|------------|------|
| `criando` | Criando instância | ✅ Sim | Timeout 10min → Deleta |
| `conectando` | Aguardando conexão | ✅ Sim | Timeout 2-5min → Deleta |
| `conectado` | Conectado ✅ | ✅ Sim | Manter |
| `desconectado` | Desconectou | ❌ Não | Já foi deletada |
| `timeout` | Não conectou a tempo | ❌ Não | Já foi deletada |
| `erro` | Erro na conexão | ❌ Não | Já foi deletada |
| `limpo` | Limpeza automática | ❌ Não | OK |

---

## ⚠️ **Situações Críticas:**

### **Problema: Usuário abandona a tela**

**Cenário:**
```
1. Usuário clica "Conectar WhatsApp"
2. Sistema gera QR Code
3. Usuário FECHA a aba sem conectar
4. Instância fica "connecting"...
```

**Solução:**
```
✅ Background timeout (120s) deleta automaticamente
✅ Limpeza periódica (6h) pega qualquer resto
✅ Próxima tentativa cria nova instância limpa
```

---

### **Problema: Webhook não chega**

**Cenário:**
```
1. Usuário desconecta do celular
2. Webhook não chega (problema de rede/UazAPI)
3. Instância fica "conectado" no Firestore mas desconectada na UazAPI
```

**Solução:**
```
✅ Validação periódica de webhook (opcional)
✅ Limpeza manual quando usuário tentar reconectar
✅ Sistema detecta token inválido e cria nova instância
```

---

## 🚀 **Boas Práticas:**

### **1. Sempre Deletar na Desconexão**
```typescript
if (status === 'disconnected') {
  await api.deleteInstance() // Nunca deixar instância desconectada
}
```

### **2. Timeout Adequado**
- QR Code: 2 minutos (doc diz que expira em 2min)
- Pair Code: 5 minutos (doc diz que expira em 5min)

### **3. Limpeza Periódica**
- Rodar a cada 6 horas
- Pega qualquer instância esquecida
- Garante que limite não é ultrapassado

### **4. Logs Detalhados**
```typescript
console.log(`[CLEANUP] 🗑️ Deletando: ${businessId} (status: ${status})`)
console.log(`[CLEANUP] ✅ Deletada: ${businessId}`)
```

---

## 📋 **Checklist de Economia:**

- [x] Timeout de 120s para QR Code
- [x] Timeout de 300s para Pair Code
- [x] Deletar ao desconectar
- [x] Deletar em erro
- [x] Endpoint de limpeza manual
- [ ] Cron job periódico (opcional)
- [x] Logs detalhados
- [x] Notificar usuário

---

## 🎯 **Resumo:**

```
┌─────────────────────────────────────────┐
│     INSTÂNCIA FICA DESCONECTADA?        │
│             ❌ NUNCA!                   │
│                                         │
│   Instância NÃO conectada = DELETADA   │
│   Instância desconectada = DELETADA    │
│   Instância com erro = DELETADA         │
│                                         │
│   🧹 Sistema mantém TUDO limpo         │
│   💰 Economia máxima de recursos       │
│   ✅ Respeita limites da UazAPI        │
└─────────────────────────────────────────┘
```

---

**Última atualização:** 24/10/2025  
**Status:** ✅ Implementado e funcionando
