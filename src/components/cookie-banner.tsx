'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie, X, Shield } from 'lucide-react';
import Link from 'next/link';

// Helper para gerenciar cookie de consentimento
const getCookieConsent = () => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/cookie_consent=([^;]+)/);
  return match ? match[1] : null;
};

const setCookieConsent = (value: string) => {
  if (typeof document === 'undefined') return;
  // Cookie válido por 1 ano
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `cookie_consent=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
};

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) {
      // Delay para não aparecer imediatamente
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    setCookieConsent('accepted');
    setShowBanner(false);
  };

  const rejectCookies = () => {
    setCookieConsent('rejected');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="relative rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl ring-1 ring-black/5">
        {/* Close button */}
        <button
          onClick={rejectCookies}
          className="absolute -top-2 -right-2 rounded-full bg-background border border-border shadow-md p-1.5 hover:bg-muted transition-all hover:scale-110"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 p-2.5 shrink-0">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold mb-1">
                Cookies & Privacidade
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Usamos cookies essenciais para melhorar sua experiência.
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-2 mb-4 text-xs">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <Link 
              href="/politica-privacidade" 
              className="text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
            >
              Política de Privacidade
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link 
              href="/termos-uso"
              className="text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
            >
              Termos de Uso
            </Link>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="gradient" 
              onClick={acceptCookies}
              className="flex-1 h-9 text-sm"
            >
              Aceitar
            </Button>
            <Button 
              variant="outline" 
              onClick={rejectCookies}
              className="flex-1 h-9 text-sm"
            >
              Recusar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
