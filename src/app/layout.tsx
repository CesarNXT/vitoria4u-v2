
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-provider';
import { CookieBanner } from '@/components/cookie-banner';
import { Poppins } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700'],
});


export const metadata: Metadata = {
  title: 'Vitoria4u',
  description: 'Sistema de agendamento para profissionais de beleza.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${poppins.variable} font-sans`}>
      <head>
        {process.env.NODE_ENV === 'development' && (
          <script dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const suppressPatterns = [
                  /WebSocket connection.*failed/i,
                  /Fast Refresh/i,
                  /Could not establish connection/i,
                  /Receiving end does not exist/i,
                  /connect.*is not a function/i,
                  /Erro capturado/i,
                  /Token.*instância/i,
                  /Request URL/i,
                  /Request Method/i,
                  /Request Headers/i,
                  /Request Body/i,
                  /Instance Token/i,
                  /Admin Token/i,
                  /━━━━━━/,
                ];
                const originalError = console.error;
                const originalWarn = console.warn;
                const originalLog = console.log;
                
                console.error = function(...args) {
                  const msg = String(args[0] || '');
                  if (!suppressPatterns.some(p => p.test(msg))) originalError.apply(console, args);
                };
                console.warn = function(...args) {
                  const msg = String(args[0] || '');
                  if (!suppressPatterns.some(p => p.test(msg))) originalWarn.apply(console, args);
                };
                console.log = function(...args) {
                  const msg = String(args[0] || '');
                  if (!suppressPatterns.some(p => p.test(msg))) originalLog.apply(console, args);
                };
              })();
            `
          }} />
        )}
      </head>
      <body className="overflow-x-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            {children}
            <Toaster />
            <CookieBanner />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
