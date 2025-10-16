# 🔐 VARIÁVEIS DE AMBIENTE - TEMPLATE

## 📝 INSTRUÇÕES

1. Copie este conteúdo para um arquivo `.env.local` (desenvolvimento)
2. Configure as variáveis no **Vercel Dashboard** para produção
3. **NUNCA** commite arquivos `.env*` no Git

---

## ⚙️ CONFIGURAÇÃO

### 1️⃣ Firebase Client (PÚBLICAS - Podem ser expostas)

```bash
# Obter em: Firebase Console → Project Settings → General
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
```

**Como obter:**
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Project Settings** (ícone de engrenagem)
4. Role até **Your apps** → **Web app**
5. Copie os valores do `firebaseConfig`

---

### 2️⃣ Firebase Admin (SECRETA - Servidor apenas)

```bash
# Obter em: Firebase Console → Project Settings → Service Accounts
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"..."}
```

**Como obter:**
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. **Project Settings** → **Service Accounts**
3. Clique em **Generate New Private Key**
4. Baixa um arquivo JSON
5. **Atenção:** Minifique o JSON em uma linha única (sem quebras de linha)

**Converter JSON para uma linha:**
```bash
# Linux/Mac
cat serviceAccountKey.json | jq -c

# Windows PowerShell
Get-Content serviceAccountKey.json | ConvertFrom-Json | ConvertTo-Json -Compress

# Online
# https://www.text-utils.com/json-formatter/
# Cole o JSON → Clique "Minify" → Copie resultado
```

**⚠️ IMPORTANTE:**
- A variável deve ter todo o JSON em UMA ÚNICA LINHA
- Aspas duplas dentro do JSON devem estar escapadas (\" em alguns casos)
- No Vercel, cole diretamente (ele lida com as aspas)

---

### 3️⃣ MercadoPago (SECRETAS)

```bash
# Obter em: MercadoPago → Credenciais
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1234567890-123456-abcdef1234567890abcdef1234567890-123456789

# Webhook secret (gerado no painel de webhooks)
MERCADOPAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui
```

**Como obter Access Token:**
1. Acesse [MercadoPago Developers](https://www.mercadopago.com.br/developers/panel)
2. Vá em **Credenciais**
3. Copie o **Access Token de Produção** (APP_USR-...)

**Como obter Webhook Secret:**
1. No painel do MercadoPago → **Webhooks**
2. Configure o webhook para: `https://seu-dominio.com/api/pagamentos/webhook`
3. Copie o **Secret** gerado

**⚠️ Teste em Sandbox primeiro:**
- Use **Access Token de Teste** durante desenvolvimento
- Mude para **Produção** apenas quando estiver pronto

---

### 4️⃣ Cron Jobs (SECRETA)

```bash
# Gerar um token aleatório seguro (32 caracteres base64)
CRON_SECRET=xyz123abc456def789...
```

**Como gerar:**

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32|%{Get-Random -Min 0 -Max 256}))

# Online
# https://generate-secret.now.sh/32
```

**Uso:**
- Vercel Cron envia este secret no header `Authorization: Bearer xyz123...`
- APIs cron validam antes de executar

---

### 5️⃣ Admin (SECRETAS E PÚBLICAS)

```bash
# SECRETA (Server-side) - Validação real de permissões
ADMIN_EMAILS=seu-email@gmail.com,outro-admin@gmail.com

# PÚBLICA (Client-side) - Apenas para UI (esconder botões)
NEXT_PUBLIC_ADMIN_EMAILS=seu-email@gmail.com,outro-admin@gmail.com
```

**⚠️ Importante:**
- `ADMIN_EMAILS` (sem NEXT_PUBLIC_) = Validação server-side (SEGURA)
- `NEXT_PUBLIC_ADMIN_EMAILS` = Apenas UI (pode ser burlada, NÃO usar para segurança)
- Sempre validar server-side usando `ADMIN_EMAILS`

**Formato:**
- Emails separados por vírgula (sem espaços)
- Sensível a maiúsculas/minúsculas (use lowercase)

---

## 📄 ARQUIVO COMPLETO (.env.local)

```bash
# =============================================================================
# FIREBASE CLIENT (PÚBLICAS)
# =============================================================================
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=

# =============================================================================
# FIREBASE ADMIN (SECRETA)
# =============================================================================
FIREBASE_SERVICE_ACCOUNT_KEY=

# =============================================================================
# MERCADOPAGO (SECRETAS)
# =============================================================================
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=

# =============================================================================
# CRON JOBS (SECRETA)
# =============================================================================
CRON_SECRET=

# =============================================================================
# ADMIN (SECRETAS E PÚBLICAS)
# =============================================================================
# Server-side validation (SECURE)
ADMIN_EMAILS=

# Client-side UI only (NOT SECURE)
NEXT_PUBLIC_ADMIN_EMAILS=
```

---

## 🚀 CONFIGURAÇÃO NO VERCEL

### Via Dashboard (Recomendado)

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Clique **Add New**
5. Para cada variável:
   - **Key:** Nome da variável (ex: `FIREBASE_SERVICE_ACCOUNT_KEY`)
   - **Value:** Valor da variável
   - **Environment:** Selecione onde usar:
     - ✅ Production (obrigatório)
     - ✅ Preview (recomendado)
     - ✅ Development (opcional)
6. Clique **Save**

### Via CLI

```bash
# Login
vercel login

# Adicionar variável
vercel env add FIREBASE_SERVICE_ACCOUNT_KEY production
# Cole o valor quando solicitado

# Listar variáveis (não mostra valores)
vercel env ls

# Pull variáveis para desenvolvimento local
vercel env pull .env.local
```

---

## ✅ VALIDAÇÃO

### Testar Localmente

```bash
# 1. Criar .env.local com todas as variáveis
# 2. Rodar servidor de desenvolvimento
npm run dev

# 3. Testar endpoints:
# - http://localhost:3000/login (Firebase deve funcionar)
# - http://localhost:3000/dashboard (após login)
# - Criar agendamento (webhooks devem funcionar)
```

### Testar em Produção

```bash
# 1. Deploy
vercel --prod

# 2. Verificar logs
vercel logs --follow

# 3. Testar funcionalidades críticas:
# - Login/Logout
# - Criar agendamento
# - Webhook MercadoPago
# - Cron jobs (aguardar horário ou trigger manual)
```

---

## 🔒 SEGURANÇA

### ✅ BOM
```bash
# Arquivo .gitignore inclui:
.env*

# Não commitar:
.env
.env.local
.env.production
.env.development
```

### ❌ RUIM
```bash
# NUNCA fazer:
git add .env
git commit -m "Add env"

# Se acidentalmente commitou:
# 1. Revogar TODAS as credenciais
# 2. Limpar histórico Git
# 3. Gerar novas credenciais
```

---

## 🆘 TROUBLESHOOTING

### Firebase Admin não inicializa
```
Erro: Cannot parse Firebase Service Account Key
```

**Solução:**
- Garantir que o JSON está em UMA ÚNICA LINHA
- Remover quebras de linha `\n` do private_key
- No Vercel, colar direto (não precisa escapar aspas)

### MercadoPago 403 Forbidden
```
Erro: Invalid signature
```

**Solução:**
- Verificar se `MERCADOPAGO_WEBHOOK_SECRET` está correto
- Verificar URL do webhook no painel MP
- Verificar que está usando credenciais de produção

### Cron retorna 401 Unauthorized
```
Erro: Unauthorized
```

**Solução:**
- Verificar `CRON_SECRET` configurado no Vercel
- Verificar que `vercel.json` tem os crons configurados
- Aguardar deploy finalizar antes de testar

---

## 📞 SUPORTE

- **Firebase:** https://firebase.google.com/support
- **MercadoPago:** https://www.mercadopago.com.br/developers/pt/support
- **Vercel:** https://vercel.com/support

**Última atualização:** 16/10/2025
