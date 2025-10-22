# 🔐 Como Desconectar Todos os Usuários

## Quando usar?

Use esta ferramenta quando:
- ✅ Usuários não conseguem fazer login (sessões corrompidas)
- ✅ Após mudanças críticas de segurança
- ✅ Para forçar re-autenticação de todos
- ✅ Limpar sessões antigas/inválidas

## 📋 Passo a Passo

### 1️⃣ Acesse o Painel Administrativo
```
https://seu-dominio.com/admin/desconectar-todos
```

### 2️⃣ Configure a Senha (primeira vez)

Adicione esta variável no arquivo `.env`:
```bash
ADMIN_SECRET_KEY=sua-senha-super-secreta-aqui
```

**⚠️ IMPORTANTE:** Mantenha esta senha SEGURA!

### 3️⃣ Execute a Revogação

1. Digite a senha administrativa
2. Clique em "Desconectar Todos os Usuários"
3. Confirme a ação
4. Aguarde a conclusão

### 4️⃣ Resultado

✅ Todos os usuários serão desconectados  
✅ Tokens de sessão revogados  
✅ Cookies invalidados

## 🧹 Se os usuários ainda tiverem problemas

Instrua-os a:

### Google Chrome / Edge
1. Pressione `Ctrl + Shift + Delete`
2. Selecione "Cookies e outros dados do site"
3. Selecione "Imagens e arquivos em cache"
4. Clique em "Limpar dados"
5. Feche e reabra o navegador
6. Acesse o site e faça login novamente

### Firefox
1. Pressione `Ctrl + Shift + Delete`
2. Selecione "Cookies" e "Cache"
3. Clique em "Limpar agora"
4. Feche e reabra o navegador
5. Acesse o site e faça login novamente

### Safari (Mac)
1. Safari → Preferências
2. Guia "Privacidade"
3. "Gerenciar Dados de Sites"
4. Remover dados do seu domínio
5. Feche e reabra o navegador
6. Acesse o site e faça login novamente

### Mobile (Android/iOS)
1. Configurações do navegador
2. Privacidade/Segurança
3. Limpar dados de navegação
4. Selecionar cookies e cache
5. Confirmar
6. Fechar o app completamente
7. Reabrir e fazer login

## 🔧 Problemas Comuns

### Erro: "Senha administrativa incorreta"
- Verifique o arquivo `.env`
- Confirme que `ADMIN_SECRET_KEY` está definida
- Restart o servidor se necessário

### Erro: "Unauthorized"
- Faça login como admin primeiro
- Verifique suas permissões de admin

### Usuário ainda conectado após revogação
- Peça para limpar cache do navegador
- Verifique se há múltiplas abas abertas
- Force fechamento completo do navegador

## 📊 Monitoramento

A revogação de sessões registra:
- ✅ Número total de usuários
- ✅ Sessões revogadas com sucesso
- ✅ Erros (se houver)
- ✅ Data/hora da operação

## 🚨 ATENÇÃO

⚠️ **VOCÊ TAMBÉM SERÁ DESCONECTADO!**  
Após executar esta ação, você precisará fazer login novamente.

⚠️ **TODOS os usuários serão afetados**  
Use com responsabilidade. Notifique os usuários quando possível.

## 🔗 Links Úteis

- Painel Admin: `/admin/dashboard`
- Desconectar Todos: `/admin/desconectar-todos`
- API Endpoint: `/api/admin/revoke-all-sessions`

## 💡 Alternativa Via API

Você também pode executar via cURL:

```bash
curl -X POST https://seu-dominio.com/api/admin/revoke-all-sessions \
  -H "Content-Type: application/json" \
  -d '{"adminPassword":"sua-senha-secreta"}'
```

Resposta esperada:
```json
{
  "success": true,
  "message": "X sessões foram revogadas com sucesso",
  "revokedCount": 123,
  "errorCount": 0,
  "totalUsers": 123,
  "timestamp": "2025-01-22T18:00:00.000Z"
}
```

## 📝 Logs

Verifique os logs do servidor para detalhes:
- `🔥 [REVOKE ALL] Iniciando revogação global...`
- `⏳ [REVOKE ALL] Progresso: X/Y`
- `✅ [REVOKE ALL] Concluído!`

## 🆘 Suporte

Se precisar de ajuda:
1. Verifique os logs do servidor
2. Confirme as variáveis de ambiente
3. Teste com um usuário primeiro
4. Entre em contato com o suporte técnico

---

**Última atualização:** Janeiro 2025  
**Versão:** 2.0
