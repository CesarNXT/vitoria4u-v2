/**
 * Utilitários para melhorar UX de formulários
 */

/**
 * Rola a página até o primeiro campo com erro de validação
 * @param errors - Objeto de erros do react-hook-form
 */
export function scrollToFirstError(errors: Record<string, any>) {
  const firstErrorKey = Object.keys(errors)[0];
  
  if (!firstErrorKey) return;

  // Tenta encontrar o elemento por diferentes estratégias
  const strategies = [
    // 1. Por name do input
    () => document.querySelector(`[name="${firstErrorKey}"]`),
    // 2. Por ID
    () => document.getElementById(firstErrorKey),
    // 3. Por aria-label com erro
    () => document.querySelector(`[aria-invalid="true"]`),
    // 4. Por classe de erro do shadcn
    () => document.querySelector('.text-destructive')?.closest('[role="alert"]')?.previousElementSibling,
  ];

  let element: Element | null = null;

  for (const strategy of strategies) {
    const result = strategy();
    if (result) {
      element = result;
      break;
    }
  }

  if (element) {
    // Calcula posição considerando header fixo (56px no mobile)
    const headerOffset = 80;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });

    // Foca no elemento após scroll (com delay para animação terminar)
    setTimeout(() => {
      if (element instanceof HTMLElement) {
        element.focus({ preventScroll: true });
        
        // Adiciona feedback visual temporário
        element.classList.add('ring-2', 'ring-destructive', 'ring-offset-2');
        setTimeout(() => {
          element?.classList.remove('ring-2', 'ring-destructive', 'ring-offset-2');
        }, 2000);
      }
    }, 300);
  }
}

/**
 * Hook customizado para usar com react-hook-form
 * Automaticamente rola até o primeiro erro quando há erros de validação
 */
export function useScrollToError(errors: Record<string, any>) {
  if (typeof window === 'undefined') return;
  
  const errorKeys = Object.keys(errors);
  
  if (errorKeys.length > 0) {
    // Aguarda o próximo tick para garantir que os erros foram renderizados
    setTimeout(() => {
      scrollToFirstError(errors);
    }, 100);
  }
}
