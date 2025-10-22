# 🔄 Tratamento de Reinício do Servidor

## Problema Original

Quando o servidor Next.js reinicia (durante desenvolvimento ou deploy):

1. **Server actions falham** com erro: `Error: An unexpected response was received from the server`
2. O sistema tentava **autenticar automaticamente** um usuário que estava logado antes
3. Cookies de sessão ficavam **órfãos** (sem estado válido no servidor)
4. Usuário via **tela de loading infinito** ou erros na interface

## Solução Implementada

### 1. Detecção de Erro de Servidor Reiniciado

Criamos uma função utilitária que detecta quando o erro é causado por reinício do servidor:

```typescript
// src/lib/server-error-handler.ts
export function isServerRestartError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  const digest = error?.digest?.toLowerCase() || '';
  
  return (
    message.includes('unexpected response') ||
    message.includes('fetch failed') ||
    message.includes('network error') ||
    digest.includes('next')
  );
}
```

### 2. Limpeza Automática e Redirecionamento

Quando detectado reinício do servidor:

1. **Limpa localStorage e sessionStorage**
2. **Faz logout do Firebase Auth**
3. **Limpa todos os cookies de sessão**
4. **Redireciona para `/login`**

```typescript
export async function handleServerRestartError() {
  console.warn('🔄 Servidor reiniciado detectado. Limpando sessão...');
  
  // Limpar storages
  localStorage.clear();
  sessionStorage.clear();
  
  // Logout Firebase
  const auth = getAuth();
  await signOut(auth);
  
  // Limpar cookies
  await fetch('/api/auth/logout', { method: 'POST' });
  
  // Redirecionar
  window.location.href = '/login';
}
```

### 3. Aplicação nos Layouts

#### Dashboard Layout (`src/app/(dashboard)/layout.tsx`)

```typescript
useEffect(() => {
  getCurrentImpersonation()
    .then(id => {
      setImpersonatedId(id);
      setImpersonationChecked(true);
    })
    .catch(error => {
      // 🔥 Detecta e trata reinício do servidor
      if (isServerRestartError(error)) {
        handleServerRestartError();
      } else {
        // Erro normal
        setImpersonatedId(null);
        setImpersonationChecked(true);
      }
    });
}, []);
```

### 4. Middleware Robusto

O middleware agora **limpa cookies inválidos** automaticamente:

```typescript
if (!sessionCookie) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete('session');
  response.cookies.delete('admin-session');
  response.cookies.delete('impersonating');
  return response;
}
```

### 5. Hook Customizado

Criamos um hook para facilitar o uso em componentes:

```typescript
import { useServerAction } from '@/hooks/use-server-action';

function MyComponent() {
  const executeServerAction = useServerAction();
  
  const handleClick = async () => {
    const result = await executeServerAction(
      () => myServerAction(params)
    );
    
    if (result) {
      // Sucesso!
    }
  };
}
```

## Benefícios

✅ **Experiência consistente**: Usuário sempre sabe onde está após reinício  
✅ **Sem estados órfãos**: Cookies e storages sempre sincronizados  
✅ **Código reutilizável**: Funções utilitárias podem ser usadas em qualquer lugar  
✅ **Debugging facilitado**: Logs claros indicando quando servidor reiniciou  
✅ **Comportamento igual ao Supabase**: Mesma experiência de outros sistemas modernos

## Fluxo Após Reinício

```
Servidor reinicia
    ↓
Server action falha
    ↓
isServerRestartError() detecta
    ↓
handleServerRestartError() executa
    ↓
Limpa localStorage
    ↓
Faz logout Firebase
    ↓
Limpa cookies
    ↓
Redireciona para /login
    ↓
Usuário loga novamente
    ↓
Sessão válida restabelecida ✅
```

## Onde Foi Aplicado

1. ✅ `src/app/(dashboard)/layout.tsx` - Verificação de impersonation
2. ✅ `src/app/(dashboard)/layout.tsx` - Verificação de expiração
3. ✅ `src/middleware.ts` - Limpeza de cookies inválidos
4. ✅ `src/lib/server-error-handler.ts` - Função utilitária
5. ✅ `src/hooks/use-server-action.ts` - Hook customizado

## Manutenção Futura

Para adicionar o tratamento em novos lugares:

```typescript
import { isServerRestartError, handleServerRestartError } from '@/lib/server-error-handler';

try {
  const result = await myServerAction();
} catch (error) {
  if (isServerRestartError(error)) {
    await handleServerRestartError();
  } else {
    // Tratar erro normalmente
  }
}
```

Ou usar o hook:

```typescript
const executeServerAction = useServerAction();
const result = await executeServerAction(() => myServerAction());
```
