# 🧪 TESTE 4: Validação de Expiração de Plano

## Objetivo
Verificar se o sistema bloqueia features quando o plano expira.

## Passos

### 1. Forçar Expiração no Firebase

1. **Abra o Firebase Console**: https://console.firebase.google.com
2. **Navegue**: Firestore Database → `negocios` → Seu documento de usuário
3. **Encontre o campo**: `access_expires_at`
4. **Edite para uma data passada**: 
   - Exemplo: `2024-01-01T00:00:00.000Z` (ano passado)
5. **Salve**

### 2. Testar Bloqueio de Features

#### Opção A: Via Cron Job (Automatizado)
```bash
# Simular o cron que verifica expirações
curl -X GET "http://localhost:3000/api/cron/check-expirations" \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

**Resultado Esperado:**
```
✅ Negócio movido para plano_expirado
⚠️ Acesso expirado para negócio X
```

#### Opção B: Via Webhook (Manual)
1. Tente enviar uma mensagem via WhatsApp
2. Tente usar lembrete de aniversário
3. Tente usar qualquer feature paga

**Resultado Esperado:**
- ❌ Feature bloqueada
- Log: `⚠️ Acesso expirado para negócio`

### 3. Verificar nos Logs

Procure por:
```
⚠️ Acesso expirado para negócio {id} (expirou em {data})
```

## ✅ Teste PASSOU se:
- Features pagas são bloqueadas
- Usuário é movido para `plano_expirado`
- Logs mostram mensagem de expiração

## ❌ Teste FALHOU se:
- Features pagas continuam funcionando após expiração
- Nenhum log de expiração aparece

## 🔄 Reverter Teste
Após testar, restaure a data:
1. Volte ao Firebase
2. Edite `access_expires_at` para uma data futura
3. Exemplo: `2025-11-11T00:00:00.000Z`
