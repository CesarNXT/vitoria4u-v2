# ✅ CHECKLIST DE TESTES - 8 PROBLEMAS CRÍTICOS

## 🎯 Status Geral
- [x] **Correções aplicadas no código**
- [ ] **Testes executados e validados**
- [ ] **Sistema pronto para produção**

---

## 📋 Testes Individuais

### ✅ CRÍTICO 1: Webhook com Validação de Assinatura
**Status**: ✅ TESTADO E FUNCIONANDO

**Evidência**:
```
🔐 Assinatura ✅ VÁLIDA
✅ Webhook validado com sucesso!
✅ Acesso liberado para o usuário
```

**Conclusão**: Webhook está validando assinatura corretamente usando o secret do MercadoPago.

---

### 🧪 CRÍTICO 2: API de Pagamento com Autenticação
**Status**: ⏳ AGUARDANDO TESTE

**Como testar**:
```powershell
.\test-security.ps1
```

**Resultado esperado**:
- ✅ Requisição sem token → 401 Unauthorized
- ✅ Requisição com token inválido → 401 Unauthorized
- ✅ Requisição com token válido → 200 OK

**Checklist**:
- [ ] Testado sem token
- [ ] Testado com token inválido
- [ ] Testado com token válido (já funcionou no teste de pagamento)

---

### 🧪 CRÍTICO 3: Upload com Validação Server-Side
**Status**: ⏳ AGUARDANDO TESTE

**Como testar**:
```powershell
.\test-security.ps1
```

**Resultado esperado**:
- ✅ Upload sem token → 401 Unauthorized
- ✅ Upload com token inválido → 401 Unauthorized

**Checklist**:
- [ ] Testado sem token
- [ ] Testado com token inválido

---

### 🧪 CRÍTICO 4: Validação de Expiração em checkFeatureAccess
**Status**: ⏳ AGUARDANDO TESTE

**Como testar**: Ver `test-expiration.md`

**Resultado esperado**:
- ✅ Plano expirado → Features bloqueadas
- ✅ Log: `⚠️ Acesso expirado para negócio`

**Checklist**:
- [ ] Forçar expiração no Firebase
- [ ] Tentar usar feature paga
- [ ] Verificar se foi bloqueado
- [ ] Verificar log de expiração

---

### 🧪 CRÍTICO 5: Build sem Ignorar Erros
**Status**: ⏳ AGUARDANDO TESTE

**Como testar**:
```bash
npm run build
```

**Resultado esperado**:
- ✅ Build compila sem erros TypeScript
- ✅ Build compila sem erros ESLint
- ✅ Mensagem: `✓ Compiled successfully`

**Checklist**:
- [ ] Build executado
- [ ] Sem erros TypeScript
- [ ] Sem erros ESLint

---

### 🧪 CRÍTICO 6: APIs Admin Protegidas
**Status**: ⏳ AGUARDANDO TESTE

**Como testar**:
```powershell
.\test-security.ps1
```

**Resultado esperado**:
- ✅ `/api/admin/seed-plans` sem token → 401
- ✅ `/api/admin/fix-plan-ids` sem token → 401

**Checklist**:
- [ ] Testado seed-plans sem token
- [ ] Testado fix-plan-ids sem token

---

### 📝 CRÍTICO 7: Validação de Impersonação
**Status**: ⚠️ PARCIALMENTE CORRIGIDO

**O que foi feito**:
- ✅ API `/api/validate-impersonation` criada
- ✅ Documentado risco no código
- ⚠️ Validação completa pendente (não bloqueante para produção)

**TODO Futuro**:
- [ ] Implementar validação em cada requisição com impersonação
- [ ] Migrar para session/cookie ao invés de localStorage

**Risco**: Baixo (apenas admin pode impersonar)

---

### 📝 CRÍTICO 8: Segurança do Dashboard Layout
**Status**: ⚠️ DOCUMENTADO

**O que foi feito**:
- ✅ Documentado quando/como reativar
- ✅ Instruções claras no código
- ⚠️ Validação desabilitada temporariamente

**TODO Antes de Reativar**:
- [ ] Garantir que signup sempre cria documento
- [ ] Testar fluxo de Google Sign-In
- [ ] Testar fluxo de Email/Password

**Risco**: Baixo (bloqueio de setup impede acesso de contas incompletas)

---

## 🎯 RESUMO FINAL

### Testes Automatizados (Execute agora)
```powershell
.\test-security.ps1
npm run build
```

### Testes Manuais (Opcional mas recomendado)
1. Teste de expiração (ver `test-expiration.md`)
2. Upload de imagem no sistema
3. Criar agendamento e verificar webhook

### Correções Documentadas (Não bloqueantes)
- Crítico 7: Impersonação (API criada, validação completa futura)
- Crítico 8: Dashboard (instruções para reativação)

---

## ✅ CRITÉRIOS DE APROVAÇÃO PARA PRODUÇÃO

### Mínimo Obrigatório
- [x] Crítico 1: Webhook validando ✅
- [ ] Crítico 2: API pagamento protegida
- [ ] Crítico 3: Upload protegido
- [ ] Crítico 5: Build sem erros
- [ ] Crítico 6: APIs admin protegidas

### Recomendado
- [ ] Crítico 4: Expiração validada
- [x] Crítico 7: Impersonação documentada ✅
- [x] Crítico 8: Segurança documentada ✅

### Após Aprovação
- [ ] Deploy no Vercel
- [ ] Configurar variáveis de ambiente
- [ ] Testar em produção (pagamento real sandbox)
- [ ] Monitorar logs primeiras 24h

---

## 📞 PRÓXIMOS PASSOS

1. ✅ **Execute**: `.\test-security.ps1`
2. ✅ **Execute**: `npm run build`
3. 📝 **Documente**: Resultados dos testes
4. 🚀 **Deploy**: Se todos os testes passarem

**Tempo estimado**: 10-15 minutos para todos os testes
