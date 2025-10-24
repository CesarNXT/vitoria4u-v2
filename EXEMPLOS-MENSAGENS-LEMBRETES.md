# 💬 Exemplos de Mensagens de Lembrete

## 📱 Preview das Mensagens

### 🔔 Lembrete 24h Antes

```
⏰ *Olá, João!* ⏰

🔔 Lembrete: Você tem um agendamento amanhã!

📅 *Data e Hora*
sexta-feira, 26 de outubro de 2025 às 14:00

🏢 *Local*
Clínica Vitória

💼 *Serviço*
Consulta Odontológica

Nos vemos em breve! 😊
```

---

### ⏰ Lembrete 2h Antes

```
⏰ *João, seu horário está chegando!* ⏰

🔔 Seu agendamento é daqui a 2 horas!

📅 *Horário*
sexta-feira, 26 de outubro de 2025 às 14:00

🏢 *Local*
Clínica Vitória

💼 *Serviço*
Consulta Odontológica

Te esperamos! 😊
```

---

## 🎨 Personalização das Mensagens

### Como as Mensagens São Montadas

```typescript
// Código em: src/lib/uazapi-reminders.ts

function createReminderMessage(
  type: '24h' | '2h',
  clienteNome: string,
  nomeEmpresa: string,
  nomeServico: string,
  dataHoraAtendimento: string
): string {
  const firstName = clienteNome.split(' ')[0]; // Pega apenas primeiro nome
  
  if (type === '24h') {
    return `⏰ *Olá, ${firstName}!* ⏰

🔔 Lembrete: Você tem um agendamento amanhã!

📅 *Data e Hora*
${dataHoraAtendimento}

🏢 *Local*
${nomeEmpresa}

💼 *Serviço*
${nomeServico}

Nos vemos em breve! 😊`;
  } else {
    return `⏰ *${firstName}, seu horário está chegando!* ⏰

🔔 Seu agendamento é daqui a 2 horas!

📅 *Horário*
${dataHoraAtendimento}

🏢 *Local*
${nomeEmpresa}

💼 *Serviço*
${nomeServico}

Te esperamos! 😊`;
  }
}
```

---

## 📋 Exemplos por Categoria

### 🦷 Clínica Odontológica

**Cliente:** Maria Silva  
**Serviço:** Limpeza Dental  
**Data:** Amanhã às 09:00  

```
⏰ *Olá, Maria!* ⏰

🔔 Lembrete: Você tem um agendamento amanhã!

📅 *Data e Hora*
sábado, 27 de outubro de 2025 às 09:00

🏢 *Local*
Odonto Center

💼 *Serviço*
Limpeza Dental

Nos vemos em breve! 😊
```

---

### 💇 Salão de Beleza

**Cliente:** Ana Paula  
**Serviço:** Corte + Escova  
**Data:** Hoje às 16:00  

```
⏰ *Ana, seu horário está chegando!* ⏰

🔔 Seu agendamento é daqui a 2 horas!

📅 *Horário*
sexta-feira, 25 de outubro de 2025 às 16:00

🏢 *Local*
Studio Beauty

💼 *Serviço*
Corte + Escova

Te esperamos! 😊
```

---

### 🏥 Clínica Médica

**Cliente:** Carlos Alberto  
**Serviço:** Consulta Cardiologia  
**Data:** Segunda-feira às 10:30  

```
⏰ *Olá, Carlos!* ⏰

🔔 Lembrete: Você tem um agendamento amanhã!

📅 *Data e Hora*
segunda-feira, 28 de outubro de 2025 às 10:30

🏢 *Local*
Clínica Saúde+

💼 *Serviço*
Consulta Cardiologia

Nos vemos em breve! 😊
```

---

### 🐾 Pet Shop / Veterinária

**Cliente:** Fernanda Costa  
**Serviço:** Banho e Tosa - Rex  
**Data:** Amanhã às 15:00  

```
⏰ *Olá, Fernanda!* ⏰

🔔 Lembrete: Você tem um agendamento amanhã!

📅 *Data e Hora*
domingo, 27 de outubro de 2025 às 15:00

🏢 *Local*
Pet Center

💼 *Serviço*
Banho e Tosa - Rex

Nos vemos em breve! 😊
```

---

### 🔧 Oficina Mecânica

**Cliente:** Roberto Souza  
**Serviço:** Revisão Completa  
**Data:** Segunda às 08:00  

```
⏰ *Roberto, seu horário está chegando!* ⏰

🔔 Seu agendamento é daqui a 2 horas!

📅 *Horário*
segunda-feira, 28 de outubro de 2025 às 08:00

🏢 *Local*
Auto Center Silva

💼 *Serviço*
Revisão Completa

Te esperamos! 😊
```

---

## 🎯 Estratégias de Personalização

### Opção 1: Personalizar por Categoria (Futuro)

```typescript
// Possível implementação futura:
const emojisPorCategoria = {
  'odontologia': '🦷',
  'medicina': '🏥',
  'beleza': '💇',
  'pet': '🐾',
  'mecanica': '🔧'
};

const mensagemPersonalizada = `
${emojisPorCategoria[categoria]} *Olá, ${nome}!* ${emojisPorCategoria[categoria]}
...
`;
```

### Opção 2: Mensagem Customizável pelo Gestor (Futuro)

```typescript
// Em businessSettings:
{
  mensagemLembrete24h: "Oi {nome}! Não esqueça do seu horário amanhã às {hora} 😊",
  mensagemLembrete2h: "{nome}, te esperamos em 2 horas! Qualquer dúvida, ligue."
}
```

### Opção 3: Incluir Link de Confirmação (Futuro)

```
⏰ *Olá, João!* ⏰

🔔 Lembrete: Você tem um agendamento amanhã!

📅 *Data e Hora*
sexta-feira, 26 de outubro de 2025 às 14:00

🏢 *Local*
Clínica Vitória

💼 *Serviço*
Consulta Odontológica

✅ Confirmar: https://vitoria4u.com/confirmar/abc123
❌ Cancelar: https://vitoria4u.com/cancelar/abc123

Nos vemos em breve! 😊
```

---

## 🔤 Formatação WhatsApp

### Elementos de Formatação Utilizados

| Elemento | Código | Resultado |
|----------|--------|-----------|
| **Negrito** | `*texto*` | **texto** |
| _Itálico_ | `_texto_` | _texto_ |
| ~Riscado~ | `~texto~` | ~~texto~~ |
| `Monoespaçado` | `` `texto` `` | `texto` |
| Emoji | Unicode | 😊 🔔 📅 |

### Emojis Utilizados

- ⏰ = Lembrete/Alarme
- 🔔 = Notificação
- 📅 = Data
- 🏢 = Local/Empresa
- 💼 = Serviço
- 😊 = Sorriso/Positivo

---

## 📱 Como Fica no WhatsApp

### iPhone
```
┌─────────────────────────┐
│  Clínica Vitória        │
│  Agora                  │
├─────────────────────────┤
│                         │
│ ⏰ *Olá, João!* ⏰      │
│                         │
│ 🔔 Lembrete: Você tem  │
│ um agendamento amanhã!  │
│                         │
│ 📅 *Data e Hora*       │
│ sexta-feira, 26 de      │
│ outubro de 2025 às 14:00│
│                         │
│ 🏢 *Local*             │
│ Clínica Vitória         │
│                         │
│ 💼 *Serviço*           │
│ Consulta Odontológica   │
│                         │
│ Nos vemos em breve! 😊 │
│                         │
│         ✓✓ 12:00       │
└─────────────────────────┘
```

### Android
```
╔═════════════════════════╗
║ Clínica Vitória         ║
║ hoje 12:00              ║
╠═════════════════════════╣
║                         ║
║ ⏰ *Olá, João!* ⏰      ║
║                         ║
║ 🔔 Lembrete: Você tem  ║
║ um agendamento amanhã!  ║
║                         ║
║ 📅 *Data e Hora*       ║
║ sexta-feira, 26 de      ║
║ outubro de 2025 às 14:00║
║                         ║
║ 🏢 *Local*             ║
║ Clínica Vitória         ║
║                         ║
║ 💼 *Serviço*           ║
║ Consulta Odontológica   ║
║                         ║
║ Nos vemos em breve! 😊 ║
║                         ║
║        ✓✓ 12:00        ║
╚═════════════════════════╝
```

---

## 🎨 Sugestões de Melhorias Futuras

### 1. Adicionar Botão de Ação
```
[✅ Confirmar Presença]
[❌ Preciso Remarcar]
[📞 Falar com Atendente]
```

### 2. Incluir Mapa/Localização
```
📍 *Como Chegar*
Rua Exemplo, 123 - Centro
[Ver no Google Maps]
```

### 3. Instruções Específicas
```
⚠️ *Importante*
• Chegar 10 minutos antes
• Trazer documento com foto
• Em caso de atraso, avisar
```

### 4. Informações de Contato
```
📞 *Contato*
(11) 99999-9999
comercial@clinica.com
```

---

## ✅ Checklist de Qualidade

Mensagem ideal deve ter:

- [ ] Saudação personalizada (primeiro nome)
- [ ] Emoji contextual (🔔 ⏰)
- [ ] Horário completo e formatado
- [ ] Nome da empresa
- [ ] Nome do serviço
- [ ] Despedida amigável
- [ ] Máximo 5-7 linhas (legibilidade)
- [ ] Formatação WhatsApp (*negrito*)
- [ ] Tom profissional mas amigável

---

**Mensagens criadas automaticamente por:**  
`src/lib/uazapi-reminders.ts` → `createReminderMessage()`
