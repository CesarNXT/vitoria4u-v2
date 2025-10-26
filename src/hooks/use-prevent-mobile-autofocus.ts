/**
 * Hook para prevenir autofocus em dispositivos móveis
 * 
 * ⚠️ IMPORTANTE: No mobile, autofocus abre o teclado automaticamente,
 * causando uma péssima UX. Este hook desabilita isso globalmente.
 */

import { useEffect } from 'react';
import { useIsMobile } from './use-mobile';

export function usePreventMobileAutofocus() {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) return;

    // Desabilitar autofocus em todos os inputs no mobile
    const disableAutofocus = () => {
      const elements = document.querySelectorAll('[autofocus]');
      elements.forEach((el) => {
        el.removeAttribute('autofocus');
        // Blur se já estiver com foco
        if (document.activeElement === el) {
          (el as HTMLElement).blur();
        }
      });
    };

    // Executar imediatamente
    disableAutofocus();

    // Observar mudanças no DOM (para modals/dialogs que abrem depois)
    const observer = new MutationObserver(disableAutofocus);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['autofocus']
    });

    return () => {
      observer.disconnect();
    };
  }, [isMobile]);
}
