/**
 * 🔇 Supressor de erros de desenvolvimento
 * Remove warnings não críticos do console durante desenvolvimento
 */

(function() {
  'use strict';
  
  if (typeof window === 'undefined') {
    return;
  }

  // Lista de mensagens para suprimir
  const suppressPatterns = [
    /WebSocket connection.*failed/i,
    /Fast Refresh/i,
    /Could not establish connection/i,
    /Receiving end does not exist/i,
    /ERR_BLOCKED_BY_CLIENT/i,
    /Failed to load resource/i,
  ];

  // Salvar funções originais
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  // Filtrar console.error
  console.error = function(...args) {
    const message = args.join(' ');
    
    // Verificar se deve suprimir
    for (const pattern of suppressPatterns) {
      if (pattern.test(message)) {
        return; // Suprimir
      }
    }
    
    // Chamar original se não for suprimido
    originalConsoleError.apply(console, args);
  };

  // Filtrar console.warn
  console.warn = function(...args) {
    const message = args.join(' ');
    
    // Verificar se deve suprimir
    for (const pattern of suppressPatterns) {
      if (pattern.test(message)) {
        return; // Suprimir
      }
    }
    
    // Chamar original se não for suprimido
    originalConsoleWarn.apply(console, args);
  };

  // Capturar unhandled promise rejections relacionadas a desenvolvimento
  window.addEventListener('unhandledrejection', function(event) {
    const message = event.reason?.message || String(event.reason);
    
    // Suprimir erros de WebSocket/HMR
    for (const pattern of suppressPatterns) {
      if (pattern.test(message)) {
        event.preventDefault();
        return;
      }
    }
  });

  console.log('🔇 Console error suppressor ativo (apenas desenvolvimento)');
})();
