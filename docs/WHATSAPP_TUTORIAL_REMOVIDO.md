# 🎥 Sistema de Tutorial do WhatsApp (REMOVIDO TEMPORARIAMENTE)

> **Status:** Removido temporariamente até obter vídeos corretos  
> **Data remoção:** 27/10/2025  
> **Motivo:** Vídeos de exemplo precisam ser substituídos por vídeos reais do sistema

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquivos Envolvidos](#arquivos-envolvidos)
3. [URLs dos Vídeos](#urls-dos-vídeos)
4. [Fluxo de Funcionamento](#fluxo-de-funcionamento)
5. [Código Completo](#código-completo)
6. [Como Reativar](#como-reativar)

---

## 🎯 Visão Geral

Sistema de tutorial interativo em vídeo que guiava usuários no processo de conexão do WhatsApp ao sistema. Apresentava vídeos diferentes para Android e iOS, com verificação de visualização completa antes de prosseguir.

### **Características:**
- ✅ 2 vídeos tutoriais (Android + iOS)
- ✅ 4 etapas de onboarding interativo
- ✅ Bloqueio até assistir completo
- ✅ Opção de pular tutorial
- ✅ Progresso visual em tempo real
- ✅ Totalmente responsivo (mobile e desktop)
- ✅ Dark mode suportado

---

## 📁 Arquivos Envolvidos

### **1. Componente Principal**
**Localização:** `src/app/(dashboard)/configuracoes/whatsapp-tutorial.tsx`

**Responsabilidades:**
- Dialog com 4 etapas (ask → platform → video → complete)
- Player de vídeo com controles
- Validação de visualização completa
- Callbacks para ações (complete, skip, cancel)

---

### **2. Integrações**

#### **A) WhatsApp Connect Button**
**Arquivo:** `src/components/whatsapp-connect-button.tsx`

**Linhas modificadas:**
```typescript
// Import (linha 9)
import { WhatsAppTutorial } from '@/app/(dashboard)/configuracoes/whatsapp-tutorial'

// State (linha 29)
const [showTutorial, setShowTutorial] = useState(false)

// Handlers (linhas 125-133)
const handleTutorialComplete = () => {
  setShowTutorial(false)
  setShowMethodChoice(true)
}

const handleTutorialSkip = () => {
  setShowTutorial(false)
  setShowMethodChoice(true)
}

// Botão (linha 440)
<Button onClick={() => setShowTutorial(true)}>
  <Smartphone className="mr-2 h-4 w-4" />
  Conectar WhatsApp
</Button>

// Component (linhas 447-452)
<WhatsAppTutorial
  open={showTutorial}
  onComplete={handleTutorialComplete}
  onSkip={handleTutorialSkip}
  onCancel={() => setShowTutorial(false)}
/>
```

---

#### **B) Dashboard WhatsApp Status**
**Arquivo:** `src/app/(dashboard)/dashboard/whatsapp-status.tsx`

**Linha 12:**
```typescript
import { WhatsAppTutorial } from "@/app/(dashboard)/configuracoes/whatsapp-tutorial";
```

---

## 🎬 URLs dos Vídeos

```typescript
const VIDEO_URLS = {
  android: 'https://files.catbox.moe/fdkhgg.mp4',
  ios: 'https://files.catbox.moe/k4lsk4.mp4',
}
```

**Hospedagem:** Catbox.moe (serviço gratuito de hospedagem de arquivos)

**⚠️ IMPORTANTE:** Esses vídeos eram placeholders. Quando reativar, use vídeos reais do sistema!

---

## 🔄 Fluxo de Funcionamento

### **Etapa 1: Pergunta Inicial** (`step: 'ask'`)

**Interface:**
```
┌─────────────────────────────────────────────┐
│  📱 Tutorial de Conexão                     │
│                                             │
│  Antes de conectar seu WhatsApp, você      │
│  gostaria de assistir um tutorial rápido?  │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ ✅ Por que assistir o tutorial?       │ │
│  │ • Aprenda o passo a passo correto     │ │
│  │ • Evite erros na configuração         │ │
│  │ • Conecte em menos de 2 minutos       │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  [▶️ Sim, quero assistir]                   │
│  [✕ Pular tutorial]                         │
└─────────────────────────────────────────────┘
```

**Ações:**
- `handleWatchTutorial()` → Vai para etapa 2
- `handleSkipTutorial()` → Chama `onSkip()` e fecha

---

### **Etapa 2: Seleção de Plataforma** (`step: 'platform'`)

**Interface:**
```
┌─────────────────────────────────────────────┐
│  Selecione seu Sistema                      │
│  Escolha o sistema do seu celular           │
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │   📱         │  │    🍎        │        │
│  │  Android     │  │    iOS       │        │
│  │              │  │              │        │
│  │  Samsung,    │  │   iPhone     │        │
│  │  Xiaomi, etc │  │              │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
│  [← Voltar]                                 │
└─────────────────────────────────────────────┘
```

**Ações:**
- `handlePlatformSelect('android')` → Define plataforma e vai para etapa 3
- `handlePlatformSelect('ios')` → Define plataforma e vai para etapa 3
- `Voltar` → Volta para etapa 1

---

### **Etapa 3: Exibição do Vídeo** (`step: 'video'`)

**Interface:**
```
┌─────────────────────────────────────────────┐
│  📱/🍎 Tutorial Android/iOS                  │
│  Assista até o final para continuar         │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │                                       │ │
│  │     [Player de Vídeo]                 │ │
│  │     ▶️ Controles nativos              │ │
│  │                                       │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  Progresso do vídeo          85%            │
│  ████████████████████░░░░░                  │
│                                             │
│  ⚠️ Atenção: Assista até o final            │
│  para prosseguir                            │
│                                             │
│  [Assista até o final] (desabilitado)      │
│  [← Voltar]                                 │
└─────────────────────────────────────────────┘
```

**Recursos Técnicos:**
```typescript
<video
  ref={videoRef}
  src={VIDEO_URLS[platform]}
  controls
  controlsList="nodownload"     // Impede download
  className="w-full h-full"
  onEnded={handleVideoEnd}       // Detecta fim do vídeo
  onTimeUpdate={handleVideoProgress}  // Atualiza progresso
  playsInline                    // Melhor UX mobile
>
```

**Ações:**
- Vídeo termina → `handleVideoEnd()` → Vai para etapa 4
- `handleVideoProgress()` → Atualiza barra de progresso em tempo real
- Botão "Continuar" **bloqueado** até `videoEnded === true`

---

### **Etapa 4: Conclusão** (`step: 'complete'`)

**Interface:**
```
┌─────────────────────────────────────────────┐
│  ✅ Pronto!                                  │
│  Agora você pode conectar seu WhatsApp      │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ ✅ Próximos passos:                   │ │
│  │ 1. Tenha seu celular em mãos          │ │
│  │ 2. Abra o WhatsApp                    │ │
│  │ 3. Siga os passos do vídeo            │ │
│  │ 4. Escaneie o QR Code                 │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  [✓ Conectar Agora]                         │
│  [Não conectar agora]                       │
└─────────────────────────────────────────────┘
```

**Ações:**
- `Conectar Agora` → `handleComplete()` → Chama `onComplete()`
- `Não conectar agora` → `handleClose()` → Chama `onCancel()`

---

## 💻 Código Completo

### **Props Interface**
```typescript
interface WhatsAppTutorialProps {
  open: boolean              // Controla abertura/fechamento
  onComplete: () => void     // Chamado ao completar tutorial
  onSkip: () => void         // Chamado ao pular tutorial
  onCancel: () => void       // Chamado ao fechar dialog
}
```

### **Types**
```typescript
type TutorialStep = 'ask' | 'platform' | 'video' | 'complete'
type Platform = 'android' | 'ios' | null
```

### **States**
```typescript
const [step, setStep] = useState<TutorialStep>('ask')
const [platform, setPlatform] = useState<Platform>(null)
const [videoEnded, setVideoEnded] = useState(false)
const [videoProgress, setVideoProgress] = useState(0)
const videoRef = useRef<HTMLVideoElement>(null)
```

### **Reset ao Fechar**
```typescript
useEffect(() => {
  if (!open) {
    setStep('ask')
    setPlatform(null)
    setVideoEnded(false)
    setVideoProgress(0)
  }
}, [open])
```

### **Handlers Principais**
```typescript
// Avançar para seleção de plataforma
const handleWatchTutorial = () => {
  setStep('platform')
}

// Selecionar plataforma e mostrar vídeo
const handlePlatformSelect = (selectedPlatform: Platform) => {
  setPlatform(selectedPlatform)
  setStep('video')
}

// Detectar fim do vídeo
const handleVideoEnd = () => {
  setVideoEnded(true)
  setStep('complete')
}

// Atualizar progresso em tempo real
const handleVideoProgress = () => {
  if (videoRef.current) {
    const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100
    setVideoProgress(progress)
  }
}

// Completar tutorial
const handleComplete = () => {
  onComplete()
}

// Pular tutorial
const handleSkipTutorial = () => {
  onSkip()
}

// Fechar dialog
const handleClose = () => {
  onCancel()
}
```

---

## 🎨 Design & UI

### **Responsividade**
```typescript
className="sm:max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6"
```

- 📱 **Mobile:** Padding 4, altura máxima 95vh
- 💻 **Desktop:** Padding 6, max-width 672px (2xl)
- 📜 **Scroll:** Overflow automático quando necessário

### **Cores & Temas**

#### **Cards de Destaque (Verde)**
```typescript
className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
```

#### **Cards de Alerta (Âmbar)**
```typescript
className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
```

#### **Botões Primários**
```typescript
className="bg-green-600 hover:bg-green-700 text-white"
```

### **Animações**
```typescript
className="cursor-pointer transition-all active:scale-95 hover:shadow-lg"
```

- Hover: Sombra aumenta
- Active: Scale 95% (efeito de clique)
- Transições suaves

---

## 🔧 Como Reativar

### **Passo 1: Gravar Novos Vídeos**

**Requisitos:**
- ✅ Vídeo para **Android** (Samsung, Xiaomi, etc.)
- ✅ Vídeo para **iOS** (iPhone)
- ✅ Formato: **MP4** (melhor compatibilidade)
- ✅ Qualidade: **720p ou 1080p**
- ✅ Duração: **1-3 minutos** cada
- ✅ Conteúdo: **Passo a passo completo** de conexão do WhatsApp

**Tópicos a cobrir no vídeo:**
1. Abrir WhatsApp no celular
2. Ir em "Configurações" ou "Ajustes"
3. Selecionar "Aparelhos conectados"
4. Tocar em "Conectar um aparelho"
5. Escanear QR Code do sistema
6. Aguardar confirmação

---

### **Passo 2: Hospedar Vídeos**

**Opções:**

#### **A) Catbox.moe (Gratuito)**
```bash
# Upload via API
curl -F "reqtype=fileupload" -F "fileToUpload=@android.mp4" https://catbox.moe/user/api.php
```

#### **B) Firebase Storage (Recomendado)**
```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const storageRef = ref(storage, 'tutorials/whatsapp-android.mp4');
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
```

#### **C) Vercel Blob Storage**
```typescript
import { put } from '@vercel/blob';

const blob = await put('whatsapp-android.mp4', file, {
  access: 'public',
});
const url = blob.url;
```

---

### **Passo 3: Restaurar Arquivo**

1. **Recriar arquivo:**
   ```bash
   # O código completo está no backup abaixo
   cp backup/whatsapp-tutorial.tsx src/app/(dashboard)/configuracoes/
   ```

2. **Atualizar URLs:**
   ```typescript
   const VIDEO_URLS = {
     android: 'SUA_URL_ANDROID_AQUI',
     ios: 'SUA_URL_IOS_AQUI',
   }
   ```

---

### **Passo 4: Restaurar Imports**

#### **A) whatsapp-connect-button.tsx**
```typescript
import { WhatsAppTutorial } from '@/app/(dashboard)/configuracoes/whatsapp-tutorial'

// Adicionar state
const [showTutorial, setShowTutorial] = useState(false)

// Adicionar handlers
const handleTutorialComplete = () => {
  setShowTutorial(false)
  setShowMethodChoice(true)
}

const handleTutorialSkip = () => {
  setShowTutorial(false)
  setShowMethodChoice(true)
}

// Modificar botão
<Button onClick={() => setShowTutorial(true)}>
  <Smartphone className="mr-2 h-4 w-4" />
  Conectar WhatsApp
</Button>

// Adicionar component antes do Dialog de escolha de método
<WhatsAppTutorial
  open={showTutorial}
  onComplete={handleTutorialComplete}
  onSkip={handleTutorialSkip}
  onCancel={() => setShowTutorial(false)}
/>
```

#### **B) dashboard/whatsapp-status.tsx**
```typescript
import { WhatsAppTutorial } from "@/app/(dashboard)/configuracoes/whatsapp-tutorial";
```

---

### **Passo 5: Testar**

**Checklist de testes:**
- [ ] Tutorial abre ao clicar "Conectar WhatsApp"
- [ ] Seleção de plataforma funciona
- [ ] Vídeo carrega e reproduz
- [ ] Progresso atualiza em tempo real
- [ ] Botão "Continuar" desbloqueia ao fim
- [ ] Callback `onComplete()` funciona
- [ ] Opção "Pular" funciona
- [ ] Reset ao fechar funciona
- [ ] Responsivo em mobile
- [ ] Dark mode funciona

---

## 📦 Backup do Código Original

O código completo está preservado em:
```
docs/backups/whatsapp-tutorial.tsx.backup
```

---

## 📝 Notas Importantes

1. **Não usar vídeos genéricos** - Deve ser do sistema real Vitoria4U
2. **Testar em dispositivos reais** - Android e iOS
3. **Verificar performance** - Vídeos não devem ser muito grandes
4. **Considerar legendas** - Para acessibilidade
5. **Manter responsividade** - Testar em várias resoluções

---

## 🔗 Referências

- **Componente UI:** shadcn/ui Dialog, Card, Button
- **Icons:** Lucide React
- **Player:** HTML5 Video nativo
- **Hospedagem vídeos:** Catbox.moe (temporário)

---

**Data da documentação:** 27/10/2025  
**Versão do sistema:** 2.0  
**Status:** Aguardando vídeos corretos para reativação
