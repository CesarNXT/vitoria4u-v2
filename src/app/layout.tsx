
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-provider';
import { CookieBanner } from '@/components/cookie-banner';
import { ErrorBoundary } from '@/components/error-boundary';
import { Poppins } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: 'Vitoria4u - Sistema de Agendamento Inteligente',
    template: '%s | Vitoria4u'
  },
  description: 'Sistema completo de agendamento para profissionais de beleza com IA, WhatsApp e automações. Gerencie clientes, agendamentos e campanhas de forma inteligente.',
  keywords: ['agendamento', 'salão de beleza', 'barbearia', 'clínica estética', 'WhatsApp', 'IA', 'automação', 'gestão', 'calendário online'],
  authors: [{ name: 'Vitoria4u' }],
  creator: 'Vitoria4u',
  publisher: 'Vitoria4u',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Vitoria4u',
    title: 'Vitoria4u - Sistema de Agendamento Inteligente',
    description: 'Automatize seu salão com IA e WhatsApp. Gestão completa de agendamentos, clientes e campanhas.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vitoria4u - Agendamento Inteligente',
    description: 'Sistema de agendamento com IA e WhatsApp para profissionais de beleza',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${poppins.variable} font-sans`}>
      <body className="overflow-x-hidden">
        <ErrorBoundary>
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
        </ErrorBoundary>
      </body>
    </html>
  );
}
