# 🔧 Guia de Debug do Webhook MercadoPago

## 🚨 Problema Atual
Webhook está chegando mas sendo rejeitado por assinatura inválida.

---

## ✅ SOLUÇÃO RÁPIDA (Desbloquear Agora)

### 1. Adicione no `.env`:
```env
SKIP_WEBHOOK_VALIDATION=true
```

### 2. Reinicie o servidor:
```bash
Ctrl+C
npm run dev
```

### 3. Faça novo teste de pagamento
O acesso será liberado imediatamente após o pagamento.

---

## 🔍 INVESTIGAR O SECRET (Depois dos Testes)

### Passo 1: Verificar o Secret no MercadoPago

1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Vá em: **Webhooks** → Sua integração
3. Na seção de configuração, procure por **"Secret"**
4. **COPIE O SECRET EXATAMENTE** (sem espaços extras)

### Passo 2: Verificar o Secret no .env

Abra o arquivo `.env` e confirme a linha:
```env
MERCADOPAGO_WEBHOOK_SECRET=71dffd7cd18fc8f0266467342f08fc6d82669acb555eae7e72ccab6832
```

**IMPORTANTE:**
- ✅ Sem espaços antes ou depois
- ✅ Sem aspas extras
- ✅ Copiado exatamente como está no MercadoPago

### Passo 3: Testar com Logs Detalhados

1. **Remova** `SKIP_WEBHOOK_VALIDATION=true` do `.env`
2. Reinicie o servidor
3. Faça um novo pagamento teste
4. **Procure nos logs** por: `🔍 DEBUG da assinatura:`
5. Verifique se o **Secret usado** começa com os mesmos caracteres do seu `.env`

---

## 📋 Checklist de Troubleshooting

- [ ] Secret copiado corretamente do MercadoPago Dashboard
- [ ] Sem espaços extras no .env
- [ ] Servidor reiniciado após alterar .env
- [ ] ngrok está rodando na mesma porta (3000)
- [ ] URL do webhook no MercadoPago termina com `/api/pagamentos/webhook`
- [ ] Webhook está configurado para eventos de `payment`

---

## 🎯 Próximos Passos Após Resolver

1. ✅ Testar pagamento completo
2. ✅ Verificar se acesso foi liberado
3. ❌ **REMOVER** `SKIP_WEBHOOK_VALIDATION=true` antes do deploy em produção
4. ✅ Deploy no Vercel com webhook configurado

---

## 📞 Se o Problema Persistir

O MercadoPago pode ter mudado o formato da assinatura. Nesse caso:
1. Documentar o problema
2. Verificar documentação atualizada: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
3. Considerar usar IPN (Instant Payment Notification) como alternativa
