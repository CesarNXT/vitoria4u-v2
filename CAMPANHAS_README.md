# 📢 Sistema de Campanhas - WhatsApp

Sistema completo de envio de mensagens em massa via WhatsApp com intervalos anti-ban.

## ✨ Funcionalidades

- ✅ **Agendamento de Campanhas**: Agende envios para data/hora específica
- ✅ **Múltiplos Tipos**: Texto, Imagem, Áudio e Vídeo
- ✅ **Seleção Inteligente**: Selecione até 200 contatos por campanha
- ✅ **Intervalos Anti-Ban**: 80-120 segundos aleatórios entre envios
- ✅ **Upload via Catbox**: Suporte a mídias até 200MB
- ✅ **Rastreamento em Tempo Real**: Veja o progresso de cada envio
- ✅ **Proteção contra Inativos**: Contatos inativos destacados e desmarcados por padrão

## 🏗️ Arquitetura

```
src/
├── app/(dashboard)/campanhas/
│   ├── page.tsx                   # Página principal com listagem
│   ├── campaign-form.tsx          # Formulário de criação
│   ├── media-upload.tsx           # Upload de mídias
│   ├── columns.tsx                # Colunas da tabela
│   └── actions.ts                 # Server actions
│
├── app/api/campanhas/
│   ├── send-message/route.ts      # API interna de envio
│   └── execute/route.ts           # Executor de campanhas (CRON)
│
└── lib/types.ts                    # Tipos TypeScript
```

## 📊 Fluxo de Funcionamento

### 1️⃣ Criação da Campanha

```typescript
// Usuário cria campanha no dashboard
{
  nome: "Promoção Black Friday",
  tipo: "imagem",
  mediaUrl: "https://catbox.moe/...",
  dataAgendamento: Date,
  horaInicio: "08:00",
  contatos: [...] // Até 200 contatos
}
```

### 2️⃣ Armazenamento no Firestore

```
/businesses/{businessId}/campanhas/{campanhaId}
├── nome
├── tipo (texto|imagem|audio|video)
├── mensagem (se tipo === texto)
├── mediaUrl (se tipo !== texto)
├── status (Agendada|Em Andamento|Concluída|Cancelada|Erro)
├── dataAgendamento
├── horaInicio
├── contatos: [...]
├── envios: [
│   {
│     contatoId,
│     telefone,
│     status: (Pendente|Enviado|Erro),
│     enviadoEm?,
│     erro?
│   }
│ ]
├── totalContatos
├── contatosEnviados
└── tempoEstimadoConclusao
```

### 3️⃣ Execução via CRON

O CRON deve executar **a cada minuto**:

```bash
# Vercel cron-jobs (vercel.json)
{
  "crons": [
    {
      "path": "/api/campanhas/execute",
      "schedule": "* * * * *"
    }
  ]
}
```

**Lógica de Execução:**

1. Busca campanhas com status `Agendada` ou `Em Andamento`
2. Verifica se é o dia/hora de iniciar ou continuar
3. Processa **no máximo 5 mensagens** por execução (evita timeout)
4. Aguarda **80-120 segundos** entre cada envio
5. Atualiza status em tempo real no Firestore

### 4️⃣ Envio Anti-Ban

```typescript
// Intervalos aleatórios entre 80-120s
const intervalo = Math.floor(Math.random() * (120 - 80 + 1)) + 80;

// Verifica tempo desde último envio
if (tempoDesdeUltimoEnvio < 80000ms) {
  continue; // Pula e aguarda próxima execução do CRON
}
```

## ⚙️ Configuração

### 1. Variáveis de Ambiente

```env
# .env.local
CRON_SECRET=sua-chave-secreta-aqui
```

### 2. Vercel CRON (vercel.json)

Crie ou atualize `vercel.json` na raiz:

```json
{
  "crons": [
    {
      "path": "/api/campanhas/execute",
      "schedule": "* * * * *"
    }
  ]
}
```

### 3. Configurar CRON Secret no Vercel

```bash
vercel env add CRON_SECRET
# Cole a mesma chave do .env.local
```

### 4. Deploy

```bash
vercel --prod
```

## 🔒 Segurança

### API de Execução

```typescript
// Protegida por secret
const cronSecret = req.headers.get('x-cron-secret');
if (cronSecret !== process.env.CRON_SECRET) {
  return 401;
}
```

### Server Actions

- ✅ Validação de sessão via cookie
- ✅ Verificação de businessId
- ✅ Validação de WhatsApp conectado
- ✅ Limite de 200 contatos por campanha

## 📱 Upload de Mídias

### Tipos Aceitos

```typescript
// Imagem
accept: "image/jpeg,image/jpg,image/png,image/gif,image/webp"

// Vídeo
accept: "video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"

// Áudio
accept: "audio/mpeg,audio/mp3,audio/ogg,audio/wav"
```

### Limite de Tamanho

- ✅ Máximo: **200MB** (limite do Catbox.moe)

### Fluxo de Upload

1. Usuário seleciona arquivo
2. Frontend faz upload via `/api/upload`
3. API valida autenticação
4. Faz proxy para Catbox.moe
5. Retorna URL pública

## 🎯 Casos de Uso

### Campanha de Texto

```typescript
{
  tipo: "texto",
  mensagem: "🎉 Black Friday! 50% OFF em todos os serviços. Agende agora!"
}
```

### Campanha com Imagem

```typescript
{
  tipo: "imagem",
  mediaUrl: "https://files.catbox.moe/abc123.jpg"
}
```

### Campanha com Vídeo

```typescript
{
  tipo: "video",
  mediaUrl: "https://files.catbox.moe/xyz789.mp4"
}
```

## 📈 Monitoramento

### Dashboard

- Total de campanhas
- Agendadas / Em andamento / Concluídas
- Progresso em tempo real
- Detalhes de cada envio

### Logs

```typescript
console.log('✅ Campanha criada: {id}');
console.log('▶️ Campanha iniciada');
console.log('📤 Mensagem enviada: {telefone}');
console.log('✅ Campanha concluída');
console.log('❌ Erro ao enviar');
```

## ⚠️ Limitações e Boas Práticas

### Limitações Técnicas

- ✅ Máximo **200 contatos** por campanha
- ✅ Máximo **5 envios** por execução do CRON
- ✅ Intervalo mínimo **80 segundos** entre envios
- ✅ Mídia até **200MB**

### Boas Práticas

1. **Não enviar no mesmo horário todos os dias**: Variar horários evita padrões
2. **Evitar fins de semana/feriados**: Menor taxa de visualização
3. **Mensagens curtas e objetivas**: Melhor engajamento
4. **Testar com poucos contatos**: Validar antes de envio massivo
5. **Monitorar taxa de erro**: Se >10%, revisar configuração

### O Que Evitar

❌ **Não altere os intervalos para menos de 80s**: Alto risco de ban
❌ **Não envie spam**: Respeite seus clientes
❌ **Não use números de terceiros**: Apenas sua instância
❌ **Não ultrapasse 200 contatos**: Criar múltiplas campanhas se necessário

## 🔧 Troubleshooting

### Campanha não inicia

1. Verificar se WhatsApp está conectado
2. Conferir data/hora de agendamento
3. Verificar CRON está rodando
4. Checar logs no Vercel

### Envios com erro

1. Verificar token da instância
2. Confirmar número no formato correto (55XXXXXXXXXXX)
3. Testar envio manual via UAZAPI
4. Verificar status da instância

### CRON não executa

1. Confirmar vercel.json está correto
2. Verificar CRON_SECRET configurado
3. Checar logs do Vercel Functions
4. Validar plano Vercel suporta CRON

## 📞 API UAZAPI

### Envio de Texto

```bash
curl -X POST https://{instancia}.uazapi.com/send/text \
  -H "Content-Type: application/json" \
  -H "token: {token}" \
  -d '{
    "number": "5511999999999",
    "text": "Sua mensagem aqui"
  }'
```

### Envio de Mídia

```bash
curl -X POST https://{instancia}.uazapi.com/send/media \
  -H "Content-Type: application/json" \
  -H "token: {token}" \
  -d '{
    "number": "5511999999999",
    "type": "image",
    "file": "https://catbox.moe/abc123.jpg"
  }'
```

## 🎓 Exemplo Completo

```typescript
// 1. Usuário cria campanha
await createCampanhaAction({
  nome: "Promoção de Natal",
  tipo: "imagem",
  mediaUrl: "https://files.catbox.moe/natal.jpg",
  dataAgendamento: new Date("2024-12-15"),
  horaInicio: "09:00",
  contatos: [
    { clienteId: "1", nome: "João", telefone: 5511999999999, selecionado: true, status: "Ativo" },
    { clienteId: "2", nome: "Maria", telefone: 5511888888888, selecionado: true, status: "Ativo" },
    // ... até 200 contatos
  ]
});

// 2. CRON executa a cada minuto
// Dia 15/12 às 09:00 - Primeiro envio
// Dia 15/12 às 09:01 - Aguarda (não passou 80s)
// Dia 15/12 às 09:02 - Segundo envio (passou 80s+)
// ... continua até completar todos

// 3. Campanha marca como "Concluída"
// Status final visível no dashboard
```

## 📝 Checklist de Deploy

- [ ] Adicionar `CRON_SECRET` no .env.local
- [ ] Criar/atualizar vercel.json com CRON
- [ ] Configurar `CRON_SECRET` no Vercel
- [ ] Fazer deploy com `vercel --prod`
- [ ] Criar campanha de teste com 2-3 contatos
- [ ] Monitorar logs no Vercel Functions
- [ ] Validar envios chegando no WhatsApp
- [ ] Confirmar intervalos sendo respeitados

## 🎉 Resultado Final

Sistema completo de campanhas com:

✅ Interface intuitiva
✅ Proteção anti-ban
✅ Upload de mídias
✅ Rastreamento em tempo real
✅ Execução automática via CRON
✅ Segurança e validações

**Pronto para uso em produção!** 🚀
