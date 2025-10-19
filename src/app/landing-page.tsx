"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Bot, MessageCircle, Check, Smartphone, Search, WandSparkles } from 'lucide-react';
import Image from 'next/image';
import type { Plano } from '@/lib/types';
import { cn } from '@/lib/utils';
import { collection, onSnapshot } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

function WhatsappIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export default function LandingPage() {
  const [plans, setPlans] = useState<Plano[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { firestore } = initializeFirebase();
    const plansRef = collection(firestore, 'planos');
    
    const unsubscribe = onSnapshot(plansRef, (snapshot) => {
        const plansData = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
            }) as Plano)
            .filter(plan => plan.id !== 'plano_gratis' && plan.id !== 'plano_expirado')
            .sort((a, b) => a.price - b.price);
        setPlans(plansData);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const whatsappNumber = "553197922538";
  const whatsappMessage = "Olá! Tenho interesse em conhecer mais sobre a IA e o sistema da Vitoria4u.";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Logo />
          <nav className="flex flex-1 items-center justify-end gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button variant="gradient" asChild>
              <Link href="/login?mode=register">Criar Conta</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative w-full py-12 md:py-20">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
              <div className="flex flex-col justify-center space-y-4 lg:flex-1">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Automatize</span> seu atendimento com uma IA que trabalha por você.
                  </h1>
                  <p className="text-muted-foreground md:text-xl">
                    Transforme seu WhatsApp em uma ferramenta de agendamento inteligente, disponível 24/7 para seus clientes, com a personalidade da sua marca.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" variant="gradient" asChild>
                    <Link href="/login?mode=register">
                      Faça seu teste grátis de 3 dias!
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center lg:flex-1">
                <Image 
                  src="https://files.catbox.moe/cnltor.png"
                  alt="Demonstração IA"
                  width={400}
                  height={800}
                  className="rounded-xl shadow-2xl"
                  style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '80vh' }}
                  priority
                  unoptimized
                />
              </div>
            </div>
          </div>
        </section>

        {/* Seção ChatGPT */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center space-y-4 max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                E se o <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">ChatGPT</span> fosse o Atendente Inteligente da sua empresa?
              </h2>
              <p className="text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Crie uma inteligência especialista no seu negócio, com linguagem conversacional, que atende 24 horas por dia, 7 dias por semana.
              </p>
              <Button variant="gradient" size="lg" asChild>
                <Link href="/login?mode=register">COMECE AGORA</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Diferenciais */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Diferenciais</span> da Nossa IA
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Uma solução completa que entende seu negócio e resolve os problemas dos seus clientes de forma autônoma.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-7xl items-start gap-8 py-12 lg:grid-cols-4">
              <div className="grid gap-3 text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Atendimento Humanizado</h3>
                <p className="text-sm text-muted-foreground">
                  Nossa IA utiliza uma linguagem natural e empática, garantindo que seus clientes se sintam ouvidos e bem atendidos.
                </p>
              </div>
              <div className="grid gap-3 text-center">
                <Smartphone className="mx-auto h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Idealizado para WhatsApp</h3>
                <p className="text-sm text-muted-foreground">
                  A IA é totalmente integrada ao WhatsApp, proporcionando uma experiência fluida e sem a necessidade de outros apps.
                </p>
              </div>
              <div className="grid gap-3 text-center">
                <Search className="mx-auto h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Busca Informações</h3>
                <p className="text-sm text-muted-foreground">
                  A IA tem acesso a todas as informações do seu negócio, como serviços, preços e horários, para responder a qualquer dúvida.
                </p>
              </div>
              <div className="grid gap-3 text-center">
                <WandSparkles className="mx-auto h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Resolve problemas</h3>
                <p className="text-sm text-muted-foreground">
                  Desde agendamentos até cancelamentos e reagendamentos, a IA resolve tudo de forma autônoma e eficiente.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Planos */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Escolha o <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">plano perfeito</span> para o seu negócio
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                  Comece de graça e evolua conforme seu negócio cresce. Todos os planos incluem um teste grátis de 3 dias.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-7xl items-start gap-8 py-12 lg:grid-cols-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex flex-col rounded-lg border bg-card p-6 space-y-4 animate-pulse">
                    <div className="h-6 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-10 bg-muted rounded w-1/3 mt-4" />
                  </div>
                ))
              ) : (
                plans.map((plan) => (
                  <div 
                    key={plan.id} 
                    className={cn(
                      "relative flex flex-col rounded-lg border bg-card p-6 shadow-lg",
                      plan.isFeatured && "border-primary scale-105"
                    )}
                  >
                    {plan.isFeatured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent px-3 py-1 rounded-full text-xs font-semibold text-white">
                        Mais Popular
                      </div>
                    )}
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                    <div className="mt-4">
                      {plan.oldPrice && (
                        <span className="text-lg text-muted-foreground line-through">
                          R$ {plan.oldPrice.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                      <p className="text-4xl font-bold">
                        R$ {plan.price.toFixed(2).replace('.', ',')}
                        <span className="text-lg font-normal text-muted-foreground">/mês</span>
                      </p>
                    </div>
                    <ul className="mt-6 space-y-2">
                      {(plan.features as string[]).map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      asChild 
                      className="mt-6"
                      variant={plan.isFeatured ? 'gradient' : 'outline'}
                    >
                      <Link href="/login?mode=register">Assinar Agora</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:py-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
            <div className="flex flex-col items-center gap-4 md:flex-row md:gap-2">
              <Logo />
              <p className="text-center text-sm leading-loose md:text-left">
                © {new Date().getFullYear()} Vitoria4u. Todos os direitos reservados.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link href="/termos-uso" className="text-muted-foreground hover:text-primary transition-colors">
                Termos de Uso
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/politica-privacidade" className="text-muted-foreground hover:text-primary transition-colors">
                Política de Privacidade
              </Link>
            </div>
          </div>
        </div>
      </footer>
      
      {/* WhatsApp Button com texto */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 group">
        <div className="bg-background border rounded-lg shadow-lg px-4 py-2 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Fale com nossa equipe de atendimento 😊
        </div>
        <a 
          href={whatsappUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:scale-110 transition-transform"
        >
          <WhatsappIcon className="h-7 w-7" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">2</span>
        </a>
      </div>
    </div>
  );
}
