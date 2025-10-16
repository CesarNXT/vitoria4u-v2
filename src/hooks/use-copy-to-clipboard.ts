import { useState } from 'react';

export function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      // Usar setTimeout para evitar flushSync durante renderização
      await new Promise((resolve) => {
        setTimeout(async () => {
          try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000); // Reset após 2s
            resolve(true);
          } catch (err) {
            console.error('Failed to copy:', err);
            resolve(false);
          }
        }, 0);
      });
    } catch (error) {
      console.error('Copy to clipboard error:', error);
    }
  };

  return { copyToClipboard, isCopied };
}
