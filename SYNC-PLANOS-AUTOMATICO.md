# 🔄 Sistema de Sincronização Automática de Planos

**Arquivo:** `src/lib/sync-plans.ts`  
**Status:** ✅ Ativo  
**Frequência:** Máximo 1x por hora

---

## 🎯 O Que Faz

Sincroniza automaticamente os planos do código (`STANDARD_PLANS`) para o Firestore toda vez que um **admin faz login**.

---

## 📍 Onde Roda

### 1. Dashboard Normal
**Arquivo:** `src/app/(dashboard)/layout.tsx` (Linha 125-131)

```typescript
// 🔄 AUTO-SYNC: Se for admin, sincroniza planos automaticamente
if (adminStatus && firestore) {
  const { syncPlansToFirestore, shouldSyncPlans, markPlansSynced } = 
    await import('@/lib/sync-plans');
  
  if (shouldSyncPlans()) {
    await syncPlansToFirestore(firestore);
    markPlansSynced();
  }
}
```

### 2. Painel Admin
**Arquivo:** `src/app/admin/(dashboard)/layout.tsx` (Linha 50-59)

```typescript
async function syncPlans() {
  if (!user || !firestore) return;
  
  const { syncPlansToFirestore, shouldSyncPlans, markPlansSynced } = 
    await import('@/lib/sync-plans');
  
  if (shouldSyncPlans()) {
    await syncPlansToFirestore(firestore);
    markPlansSynced();
  }
}
```

---

## ⚙️ Como Funciona

### Fluxo Completo

```
1. Admin faz login
   ↓
2. Layout detecta: adminStatus === true
   ↓
3. Chama: shouldSyncPlans()
   ↓
4. Verifica localStorage: 'plans_last_sync'
   - Primeira vez? → SIM
   - Passou 1 hora? → SIM
   - Não passou 1h? → NÃO (pula)
   ↓
5. Se SIM: syncPlansToFirestore(firestore)
   ↓
6. Para cada plano em STANDARD_PLANS:
   doc(firestore, 'planos', planId)
   setDoc(planData, { merge: true })
   ↓
7. Firestore ATUALIZADO:
   - Preços ✅
   - Features ✅
   - Descrições ✅
   - Duração ✅
   ↓
8. Salva timestamp: localStorage.setItem('plans_last_sync', Date.now())
```

---

## 📊 Frequência

| Situação | Sincroniza? | Por quê? |
|----------|-------------|----------|
| Admin faz login pela 1ª vez | ✅ SIM | localStorage vazio |
| Admin faz login 30min depois | ❌ NÃO | Ainda não passou 1h |
| Admin faz login 2h depois | ✅ SIM | Passou 1h |
| Admin atualiza página | ❌ NÃO | Se < 1h |
| Admin em outra aba | ❌ NÃO | localStorage compartilhado |

**Intervalo:** Máximo **1 vez por hora**

---

## 🔄 O Que Sincroniza

### Planos Definidos

```typescript
// src/lib/sync-plans.ts

export const STANDARD_PLANS: Record<string, Omit<Plano, 'id'>> = {
  plano_gratis: {
    name: 'Gratuito',
    price: 0,
    features: ['notificacao_gestor_agendamento']
  },
  
  plano_basico: {
    name: 'Básico',
    price: 89.90,  // ← ATUALIZA AQUI
    features: [
      'lembrete_24h',
      'lembrete_2h',
      // ...
    ]
  },
  
  plano_profissional: {
    name: 'Profissional',
    price: 149.90,  // ← ATUALIZA AQUI
    features: [
      'lembrete_24h',
      'lembrete_2h',
      'rejeicao_chamadas',  // ← NOVA FEATURE
      // ...
    ]
  },
  
  plano_premium: {
    name: 'Premium',
    price: 179.90,  // ← ATUALIZA AQUI
    features: [
      'lembrete_24h',
      'lembrete_2h',
      'rejeicao_chamadas',  // ← NOVA FEATURE
      'atendimento_whatsapp_ia',
      // ...
    ]
  }
};
```

### Para o Firestore

```
Collection: planos/

planos/plano_basico
  ├── name: "Básico"
  ├── price: 89.90
  ├── features: [...]
  ├── description: "..."
  └── durationInDays: 30

planos/plano_profissional
  ├── name: "Profissional"
  ├── price: 149.90
  ├── features: [..., 'rejeicao_chamadas']
  └── ...
```

---

## 🎯 Casos de Uso

### 1. Adicionar Nova Feature

**Antes:**
```typescript
plano_premium: {
  features: [
    'lembrete_24h',
    'lembrete_2h'
  ]
}
```

**Depois:**
```typescript
plano_premium: {
  features: [
    'lembrete_24h',
    'lembrete_2h',
    'rejeicao_chamadas'  // ✅ NOVA
  ]
}
```

**Resultado:**
1. Deploy no Vercel
2. Admin faz login
3. Sync roda automaticamente
4. Firestore atualizado com nova feature ✅

---

### 2. Alterar Preço

**Antes:**
```typescript
plano_basico: {
  price: 89.90
}
```

**Depois:**
```typescript
plano_basico: {
  price: 99.90  // Aumento de R$ 10
}
```

**Resultado:**
1. Deploy no Vercel
2. Admin faz login
3. Sync roda automaticamente
4. Firestore atualizado com novo preço ✅

---

### 3. Remover Feature

**Antes:**
```typescript
plano_basico: {
  features: [
    'lembrete_24h',
    'lembrete_2h',
    'feedback_pos_atendimento'
  ]
}
```

**Depois:**
```typescript
plano_basico: {
  features: [
    'lembrete_24h',
    'lembrete_2h'
    // 'feedback_pos_atendimento' ❌ REMOVIDO
  ]
}
```

**Resultado:**
1. Deploy no Vercel
2. Admin faz login
3. Sync roda automaticamente
4. Feature removida do Firestore ✅

---

## ⚠️ MERGE MODE

```typescript
setDoc(planRef, planData, { merge: true })
```

**O que significa `merge: true`:**
- ✅ Atualiza campos existentes
- ✅ Adiciona campos novos
- ❌ NÃO deleta campos extras

**Exemplo:**
```
Firestore atual:
{
  name: "Premium",
  price: 199.90,
  customField: "xyz"  // Campo extra
}

STANDARD_PLANS:
{
  name: "Premium",
  price: 179.90,
  features: [...]
}

Após sync:
{
  name: "Premium",
  price: 179.90,        // ✅ Atualizado
  features: [...],      // ✅ Adicionado
  customField: "xyz"    // ✅ Mantido
}
```

---

## 🚨 AVISOS IMPORTANTES

### ❌ NUNCA Editar Planos Direto no Firestore

**ERRADO:**
```
Firebase Console → planos/plano_basico
  ├── price: 150.00  ← Edita aqui

Próximo login do admin:
  ↓
Sync roda → SOBRESCREVE para 89.90
  ↓
Mudança PERDIDA! ❌
```

**CORRETO:**
```
src/lib/sync-plans.ts
  ├── price: 150.00  ← Edita aqui
  ↓
Deploy
  ↓
Admin faz login → Sync roda
  ↓
Firestore atualizado ✅
```

---

### ✅ Sempre Editar em sync-plans.ts

**Processo correto:**
1. Editar `src/lib/sync-plans.ts`
2. Fazer commit e push
3. Deploy no Vercel
4. Admin fazer login
5. Sync roda automaticamente
6. Firestore atualizado ✅

---

## 🔍 Como Verificar

### 1. localStorage

```javascript
// Console do navegador
localStorage.getItem('plans_last_sync')
// "1729781400000" (timestamp)

// Quando foi a última sincronização?
new Date(parseInt(localStorage.getItem('plans_last_sync')))
// "2025-10-24T14:30:00.000Z"
```

### 2. Firestore

```
Firebase Console → Firestore Database → planos/

Verifica se os valores estão atualizados:
- Preços
- Features
- Descrições
```

### 3. Logs do Console

```javascript
// Quando sync roda, vê no console:
// (nenhum log por padrão, mas pode adicionar)

// Se der erro:
console.error('❌ Erro ao sincronizar planos:', error);
```

---

## 🛠️ Customização

### Alterar Frequência de Sync

**Atual:** 1 hora

```typescript
// src/lib/sync-plans.ts
export function shouldSyncPlans(): boolean {
  const ONE_HOUR = 60 * 60 * 1000;  // 1 hora
  
  // Para mudar:
  const THIRTY_MINUTES = 30 * 60 * 1000;  // 30 min
  const FIVE_MINUTES = 5 * 60 * 1000;     // 5 min
  const ONE_DAY = 24 * 60 * 60 * 1000;    // 1 dia
  
  return (now - lastSyncTime) > ONE_HOUR;
}
```

### Forçar Sync Sempre

```typescript
// Para debug/teste
export function shouldSyncPlans(): boolean {
  return true;  // Sempre sincroniza
}
```

### Desativar Sync

```typescript
// Se precisar desativar temporariamente
export function shouldSyncPlans(): boolean {
  return false;  // Nunca sincroniza
}
```

---

## 🎯 Benefícios

### Para Desenvolvimento
- ✅ **Single Source of Truth** - Código é a verdade
- ✅ **Sem inconsistências** - Firestore sempre atualizado
- ✅ **Fácil manutenção** - Edita em 1 lugar só

### Para Produção
- ✅ **Preços sempre corretos** - Sync automático
- ✅ **Features atualizadas** - Deploy e pronto
- ✅ **Sem intervenção manual** - Admin faz login = sync

### Para Admin
- ✅ **Transparente** - Não precisa fazer nada
- ✅ **Confiável** - Roda automaticamente
- ✅ **Performance** - Máximo 1x/hora

---

## 📋 Checklist

### Adicionar Nova Feature
- [ ] Editar `src/lib/types.ts` → Adicionar ao `PlanFeature`
- [ ] Editar `src/lib/sync-plans.ts` → Adicionar aos planos
- [ ] Fazer commit e push
- [ ] Deploy no Vercel
- [ ] Admin faz login → Sync automático ✅
- [ ] Verificar no Firestore

### Alterar Preço
- [ ] Editar `src/lib/sync-plans.ts` → Mudar `price`
- [ ] Fazer commit e push
- [ ] Deploy no Vercel
- [ ] Admin faz login → Sync automático ✅
- [ ] Verificar no Firestore

### Remover Feature
- [ ] Editar `src/lib/sync-plans.ts` → Remover da lista
- [ ] Fazer commit e push
- [ ] Deploy no Vercel
- [ ] Admin faz login → Sync automático ✅
- [ ] Verificar no Firestore

---

## ✅ Resumo

**O sistema de sync automático:**
- 🔄 Roda quando admin faz login
- ⏱️ Máximo 1x por hora
- 📝 Atualiza planos do código → Firestore
- 🎯 Mantém tudo sincronizado
- ✅ Transparente e automático

**Para usar:**
1. Editar `src/lib/sync-plans.ts`
2. Deploy
3. Admin faz login
4. Pronto! ✅

---

**Status:** ✅ Ativo  
**Manutenção:** Automática  
**Documentado em:** 24/10/2025
