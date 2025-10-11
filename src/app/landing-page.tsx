
"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Bot, MessageCircle, TwitterIcon, Check, Headset, Smartphone, Search, WandSparkles, Loader2 } from 'lucide-react';
import Image from 'next/image';
import type { Plano, PlanFeature } from '@/lib/types';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, getFirestore } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';


function WhatsappIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
            .filter(plan => plan.id !== 'plano_gratis') // Não mostrar plano gratuito (é um estado, não plano)
            .sort((a, b) => a.price - b.price);
        setPlans(plansData);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const whatsappNumber = "553197922538";
  const whatsappMessage = "Olá! Tenho interesse em conhecer mais sobre a IA e o sistema da Vitoria4u. Poderiam me ajudar?";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/90 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-2">
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
        <section className="relative w-full overflow-hidden">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="animate-blob-move h-[300px] w-[500px] rounded-full bg-primary/20 blur-3xl filter" />
            </div>
          <div className="container relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center text-center">
            <div className="animate-fade-in-up w-full max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tighter md:text-5xl lg:text-7xl">
                <span className="relative inline-block -rotate-1 rounded-md bg-gradient-to-r from-primary to-accent px-4 py-2 text-primary-foreground">
                  Automatize
                </span> seu atendimento com uma IA que trabalha por você.
              </h1>
              <p className="mx-auto mt-6 max-w-[600px] text-lg text-muted-foreground md:text-xl">
                Transforme seu WhatsApp em uma ferramenta de agendamento inteligente, disponível 24/7 para seus clientes, com a personalidade da sua marca.
              </p>
              <div className="mt-8">
                <Button size="lg" variant="gradient" asChild className="animate-pulse-gradient">
                  <Link href="/login?mode=register">
                    Faça seu teste grátis de 3 dias!
                  </Link>
                </Button>
              </div>
            </div>
            
          </div>
        </section>

        <section className="w-full py-20 relative">
          <div className="container grid md:grid-cols-2 gap-12 items-center">
             <div className="flex flex-col items-start text-left">
                <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                  E se o <span className="relative inline-block rotate-1 rounded-md bg-gradient-to-r from-primary to-accent px-4 py-2 text-primary-foreground">ChatGPT</span> fosse o Atendente Inteligente da sua empresa?
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Crie uma inteligência especialista no seu negócio, com linguagem conversacional, que atende 24 horas por dia, 7 dias por semana.
                </p>
                
                <Button asChild size="lg" variant="gradient" className="mt-8 animate-pulse-gradient">
                  <Link href="/login?mode=register">COMECE AGORA</Link>
                </Button>
            </div>
            <div className="relative w-full max-w-sm h-auto mx-auto aspect-[9/16]">
                <Image src="https://files.catbox.moe/cnltor.png" alt="Demonstração do chatbot" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-contain" unoptimized />
            </div>
          </div>
        </section>
        
        <section className="w-full py-20 lg:py-32">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                <span className="relative inline-block -rotate-1 rounded-md bg-gradient-to-r from-primary to-accent px-4 py-2 text-primary-foreground">
                  Diferenciais
                </span> da Nossa IA
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Uma solução completa que entende seu negócio e resolve os problemas dos seus clientes de forma autônoma.
              </p>
            </div>
            <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-start justify-center gap-8 pt-10">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="p-3 rounded-full bg-gradient-to-r from-primary to-accent">
                  <MessageCircle className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold">Atendimento Humanizado</h3>
                <p className="text-sm text-muted-foreground">
                  Nossa IA utiliza uma linguagem natural e empática, garantindo que seus clientes se sintam ouvidos e bem atendidos.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="p-3 rounded-full bg-gradient-to-r from-primary to-accent">
                  <Smartphone className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold">Idealizado para WhatsApp</h3>
                <p className="text-sm text-muted-foreground">
                  A IA é totalmente integrada ao WhatsApp, proporcionando uma experiência fluida e sem a necessidade de outros apps.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="p-3 rounded-full bg-gradient-to-r from-primary to-accent">
                  <Search className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold">Busca Informações</h3>
                <p className="text-sm text-muted-foreground">
                  A IA tem acesso a todas as informações do seu negócio, como serviços, preços e horários, para responder a qualquer dúvida.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="p-3 rounded-full bg-gradient-to-r from-primary to-accent">
                  <WandSparkles className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold">Resolve problemas</h3>
                <p className="text-sm text-muted-foreground">
                  Desde agendamentos até cancelamentos e reagendamentos, a IA resolve tudo de forma autônoma e eficiente.
                </p>
              </div>
            </div>
          </div>
        </section>
        
         <section className="w-full py-20 lg:py-32 relative">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Escolha o <span className="relative inline-block rotate-1 rounded-md bg-gradient-to-r from-primary to-accent px-4 py-2 text-primary-foreground">plano perfeito</span> para o seu negócio
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Comece de graça e evolua conforme seu negócio cresce. Todos os planos incluem um teste grátis de 3 dias.
                </p>
              </div>
            </div>
            <div className="mx-auto mt-16 grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex flex-col rounded-2xl border bg-card/50 p-6 space-y-4 animate-pulse">
                      <div className="h-6 bg-muted rounded w-1/2"></div>
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-10 bg-muted rounded w-1/3 mt-4"></div>
                      <div className="space-y-2 mt-4">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                      </div>
                  </div>
                ))
              ) : (
                plans.map((plan) => (
                  <div key={plan.id} className={cn("relative flex flex-col rounded-2xl border bg-card text-card-foreground shadow-lg transition-all", plan.isFeatured ? 'border-primary/50 -translate-y-4' : 'border-border')}>
                      {plan.isFeatured && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-1 text-sm font-semibold text-primary-foreground">
                          Mais Popular
                          </div>
                      )}
                      <div className="flex-1 p-6">
                          <h3 className="text-2xl font-bold">{plan.name}</h3>
                          <p className="mt-2 text-sm text-muted-foreground min-h-[40px]">{plan.description}</p>
                          <div className="mt-6">
                              {plan.oldPrice && (
                                  <span className="text-lg font-medium text-muted-foreground line-through">
                                      R$ {plan.oldPrice.toFixed(2).replace('.', ',')}
                                  </span>
                              )}
                              <p className="text-4xl font-bold">R$ {plan.price.toFixed(2).replace('.', ',')}<span className="text-lg font-normal text-muted-foreground">/mês</span></p>
                          </div>
                          <ul className="mt-6 space-y-3">
                          {(plan.features as string[]).map((feature, index) => (
                              <li key={index} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500" />
                              <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
                              </li>
                          ))}
                          </ul>
                      </div>
                      <div className="p-6 pt-0">
                          <Button asChild className={cn("w-full", plan.isFeatured && "animate-pulse-gradient")} size="lg" variant={plan.isFeatured ? 'gradient' : 'outline'}>
                              <Link href="/login?mode=register">Assinar Agora</Link>
                          </Button>
                      </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <Logo />
            <p className="text-center text-sm leading-loose md:text-left">
              © {new Date().getFullYear()} Vitoria. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
      
      {/* WhatsApp Floating Button */}
      <div className="group fixed bottom-5 right-5 z-50">
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="relative flex items-center justify-center">
            <div className="absolute right-14 w-max max-w-xs -translate-y-1/2 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:right-20">
                <div className="bg-card text-card-foreground p-3 rounded-lg shadow-lg relative">
                    <p className="text-sm">Fale com nossa equipe de atendimento 😄</p>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-card transform rotate-45"></div>
                </div>
            </div>
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white animate-pulse-whatsapp">
                <WhatsappIcon className="h-8 w-8" />
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">2</span>
            </div>
        </a>
      </div>

    </div>
  );
}
