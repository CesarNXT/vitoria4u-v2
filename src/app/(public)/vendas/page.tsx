"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Check, Star, ArrowRight, X, Zap, Shield, Volume2, VolumeX, Play } from 'lucide-react';
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

export default function VendasPage() {
  const [plans, setPlans] = useState<Plano[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

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
  const whatsappMessage = "Quero testar a IA grátis por 3 dias!";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header Fixo */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <Button size="sm" variant="gradient" asChild>
            <Link href="/login?mode=register">Começar Grátis</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section - SIMPLIFICADO */}
      <section className="pt-24 pb-12 md:pt-32 md:pb-16 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full text-sm font-medium text-primary mb-6">
            <Zap className="w-4 h-4" />
            <span>Teste Grátis por 3 Dias</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Pare de perder clientes por falta de atendimento
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Nossa IA atende seus clientes 24/7, agenda automaticamente e nunca deixa ninguém sem resposta. Tudo pelo WhatsApp.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" variant="gradient" className="text-lg h-14 px-8" asChild>
              <Link href="/login?mode=register">
                Testar Grátis Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg h-14 px-8" asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <WhatsappIcon className="mr-2 w-5 h-5" />
                Falar com Vendas
              </a>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex items-center gap-6 justify-center text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-background" />
                ))}
              </div>
              <span className="text-muted-foreground">+200 empresas</span>
            </div>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-1 text-muted-foreground">4.9/5</span>
            </div>
          </div>
        </div>
      </section>

      {/* Vídeo de Demonstração */}
      <section className="py-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Veja a IA em ação</h2>
            <p className="text-muted-foreground">Assista como funciona na prática</p>
          </div>
          
          <div className="relative max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl bg-black group">
            <video
              className="w-full cursor-pointer"
              autoPlay
              loop
              playsInline
              muted={isMuted}
              preload="auto"
              onClick={() => isMuted && setIsMuted(false)}
            >
              <source src="https://files.catbox.moe/gwj0eu.mp4" type="video/mp4" />
              Seu navegador não suporta vídeos.
            </video>
            
            {/* Overlay clicável - Cobre todo o vídeo quando está mudo */}
            {isMuted && (
              <div 
                onClick={() => setIsMuted(false)}
                className="absolute inset-0 cursor-pointer z-10"
                aria-label="Clique para ativar o som"
              >
                {/* Botão visual no centro */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 hover:bg-black text-white rounded-full p-6 transition-all backdrop-blur-sm shadow-2xl pointer-events-none">
                  <VolumeX className="w-8 h-8" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Problema/Solução - NOVO */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Quantos clientes você está perdendo <span className="text-primary">agora</span>?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Sem atendimento 24h, você perde vendas todos os dias para concorrentes que respondem na hora.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* SEM a solução */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <X className="w-6 h-6 text-destructive" />
                <h3 className="text-xl font-bold">Sem nossa IA</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Clientes sem resposta à noite/finais de semana',
                  'Perda de agendamentos por demora',
                  'Funcionários ocupados com mensagens repetitivas',
                  'Vendas perdidas para concorrência'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <X className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* COM a solução */}
            <div className="bg-primary/5 border-2 border-primary/30 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Check className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold">Com nossa IA</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Atendimento 24/7 sem parar nunca',
                  'Agendamentos automáticos em segundos',
                  'Equipe livre para tarefas importantes',
                  'Mais vendas, mais satisfação'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona - NOVO */}
      <section className="py-16">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              3 passos para <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">automatizar tudo</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '1',
                title: 'Conecte seu WhatsApp',
                description: 'QR Code e pronto. Leva menos de 2 minutos.'
              },
              {
                step: '2',
                title: 'Configure a IA',
                description: 'Adicione seus serviços e horários. A IA aprende seu negócio.'
              },
              {
                step: '3',
                title: 'Deixe ela trabalhar',
                description: 'Sua IA atende, agenda e confirma. Você só aparece no horário.'
              }
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos - REDESENHADO */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Escolha seu plano
            </h2>
            <p className="text-lg text-muted-foreground">
              <span className="font-bold text-primary">3 dias grátis</span> para testar. Cancele quando quiser.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card p-6 animate-pulse">
                  <div className="h-6 bg-muted rounded w-1/2 mb-4" />
                  <div className="h-10 bg-muted rounded w-1/3 mb-6" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded" />
                  </div>
                </div>
              ))
            ) : (
              plans.map((plan) => (
                <div 
                  key={plan.id}
                  className={cn(
                    "rounded-xl border bg-card p-6 relative",
                    plan.isFeatured && "border-primary shadow-xl scale-105"
                  )}
                >
                  {plan.isFeatured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent px-4 py-1 rounded-full text-sm font-bold text-white">
                      Mais Vendido
                    </div>
                  )}

                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-6 min-h-[40px]">{plan.description}</p>

                  <div className="mb-6">
                    {plan.oldPrice && (
                      <p className="text-muted-foreground line-through text-sm">
                        R$ {plan.oldPrice.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                    <p className="text-4xl font-bold">
                      R$ {plan.price.toFixed(2).replace('.', ',')}
                      <span className="text-base font-normal text-muted-foreground">/mês</span>
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {(plan.features as string[]).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full" 
                    variant={plan.isFeatured ? 'gradient' : 'outline'}
                    size="lg"
                    asChild
                  >
                    <Link href="/login?mode=register">Começar Agora</Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Garantia - NOVO */}
      <section className="py-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/20 rounded-2xl p-8 md:p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-6 text-primary" />
            <h2 className="text-3xl font-bold mb-4">
              Garantia de 3 Dias Grátis
            </h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Teste tudo sem compromisso. Se não gostar, cancele antes dos 3 dias e não pague nada. Sem pegadinhas.
            </p>
            <Button size="lg" variant="gradient" asChild>
              <Link href="/login?mode=register">
                Começar Teste Grátis
                <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <Logo className="mx-auto mb-4" />
          <p>© {new Date().getFullYear()} Vitoria4u. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* WhatsApp Floating com texto */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 group">
        <div className="bg-background border rounded-lg shadow-lg px-4 py-2 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Fale com nossa equipe de atendimento 😊
        </div>
        <a 
          href={whatsappUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="relative w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        >
          <WhatsappIcon className="w-8 h-8 text-white" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">2</span>
        </a>
      </div>
    </div>
  );
}
