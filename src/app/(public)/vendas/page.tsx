'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './vendas.css';

export default function VendasPage() {
  useEffect(() => {
    // Adiciona classe vendas-page ao body para isolar estilos
    document.body.classList.add('vendas-page');
    
    // Header shrink on scroll
    const header = document.querySelector('.site-header') as HTMLElement;
    const handleScroll = () => {
      header?.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);

    // Progress bar
    const progress = document.querySelector('.read-progress span') as HTMLElement;
    const updateProgress = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
      if (progress) progress.style.width = `${scrolled * 100}%`;
    };
    window.addEventListener('scroll', updateProgress);

    // Mobile menu toggle
    const burger = document.querySelector('.hamburger');
    const mobile = document.querySelector('.mobile-menu') as HTMLElement;
    const toggleMenu = () => {
      if (mobile) {
        mobile.style.display = mobile.style.display === 'block' ? 'none' : 'block';
        burger?.classList.toggle('open');
      }
    };
    burger?.addEventListener('click', toggleMenu);

    // Scroll reveal
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visible');
        io.unobserve(e.target);
      });
    }, { threshold: 0.18 });

    document.querySelectorAll('[data-reveal]').forEach(el => {
      io.observe(el);
    });

    document.querySelectorAll('[data-cascade]').forEach(group => {
      const items = Array.from(group.querySelectorAll('.reveal'));
      items.forEach((el: any, i) => {
        el.style.transitionDelay = `${i * 80}ms`;
        io.observe(el);
      });
    });

    // Sticky CTA
    const sticky = document.querySelector('.sticky-cta');
    const handleSticky = () => {
      sticky?.classList.toggle('show', window.scrollY > 640);
    };
    window.addEventListener('scroll', handleSticky);

    // Smooth anchors
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e: any) => {
        const id = a.getAttribute('href');
        if (id && id.length > 1) {
          e.preventDefault();
          document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (mobile) mobile.style.display = 'none';
        }
      });
    });

    // Ambient parallax
    const hosts = Array.from(document.querySelectorAll('.hero, .section, .promo-light, .diff-section, .cta')) as HTMLElement[];
    const applyParallax = () => {
      const y = window.scrollY;
      const baseTx = Math.sin(y * 0.0015) * 45;
      const baseTy = Math.cos(y * 0.0012) * 60;
      const baseR = y * 0.035;
      hosts.forEach((el, i) => {
        let k = 0.75 - i * 0.05;
        if (el.classList.contains('hero')) k = 1.0;
        if (el.classList.contains('cta')) k = 0.6;
        k = Math.max(k, 0.45);
        el.style.setProperty('--amb-tx', (baseTx * k) + 'px');
        el.style.setProperty('--amb-ty', (baseTy * k) + 'px');
        el.style.setProperty('--amb-r', (baseR * k) + 'deg');
      });
    };
    applyParallax();
    window.addEventListener('scroll', applyParallax, { passive: true });

    // Carousel auto-scroll
    document.querySelectorAll('.carousel').forEach((car: any) => {
      const track = car.querySelector('.track') as HTMLElement;
      if (!track) return;

      // Duplicar conteúdo para loop contínuo
      if (!track.dataset.cloned) {
        track.innerHTML = track.innerHTML + track.innerHTML;
        track.dataset.cloned = 'true';
      }

      let half = track.scrollWidth / 2;
      const recalc = () => { half = track.scrollWidth / 2; };
      window.addEventListener('resize', recalc);

      // Velocidade suave (px por segundo)
      const speed = 50;
      let rafId: number | null = null;
      let last: number | undefined;
      
      const step = (t: number) => {
        if (last == null) last = t;
        const dt = (t - last) / 1000;
        last = t;
        track.scrollLeft += speed * dt;
        if (track.scrollLeft >= half) track.scrollLeft -= half;
        rafId = requestAnimationFrame(step);
      };
      
      const start = () => { 
        if (rafId) cancelAnimationFrame(rafId); 
        last = undefined; 
        rafId = requestAnimationFrame(step); 
      };
      
      const stop = () => { 
        if (rafId) { 
          cancelAnimationFrame(rafId); 
          rafId = null; 
        } 
      };

      // Autoplay
      const shouldAuto = (car.dataset.autoplay ?? 'true') === 'true';
      if (shouldAuto) start();

      // Pausas ao interagir
      car.addEventListener('mouseenter', stop);
      car.addEventListener('mouseleave', start);
      car.addEventListener('touchstart', stop, { passive: true });
      car.addEventListener('touchend', start, { passive: true });
    });

    // Pink orb parallax
    const orbs = document.querySelectorAll('.pink-orb') as NodeListOf<HTMLElement>;
    let raf: number | null = null;
    const handlePointerMove = (e: PointerEvent) => {
      if (!orbs.length) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 16;
      const y = (e.clientY / window.innerHeight - 0.5) * 10;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        orbs.forEach((o, i) => {
          const k = i ? 0.6 : 1;
          o.style.transform = `translate3d(${x * k}vw, ${y * k}vh, 0)`;
        });
      });
    };
    window.addEventListener('pointermove', handlePointerMove);

    // Cleanup
    return () => {
      // Remove classe vendas-page do body ao sair da página
      document.body.classList.remove('vendas-page');
      
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('scroll', handleSticky);
      window.removeEventListener('scroll', applyParallax);
      window.removeEventListener('pointermove', handlePointerMove);
      burger?.removeEventListener('click', toggleMenu);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="vendas-page">
      {/* Pink orbs */}
      <div className="pink-orb" aria-hidden="true"></div>
      <div className="pink-orb small" aria-hidden="true"></div>

      {/* Progress bar */}
      <div className="read-progress"><span></span></div>

      {/* Header */}
      <header className="site-header fancy">
        <div className="container header-inner">
          <Link href="/" className="brand" aria-label="Vitória4U">
            <Image className="logo-img" src="https://files.catbox.moe/05oapo.png" alt="Vitória4U" width={120} height={30} />
          </Link>
          <nav className="nav">
            <a href="#features" className="nav-link">Recursos</a>
            <a href="#como" className="nav-link">Como funciona</a>
            <a href="#planos" className="nav-link">Planos</a>
            <a href="#faq" className="nav-link">FAQ</a>
            <Link href="/login" className="btn btn-ghost">Login</Link>
            <Link href="/login?mode=register" className="btn btn-gradient">Teste grátis</Link>
          </nav>
          <button className="hamburger" aria-label="Abrir menu">
            <span></span><span></span><span></span>
          </button>
        </div>
        <div className="mobile-menu">
          <a href="#features">Recursos</a>
          <a href="#como">Como funciona</a>
          <a href="#planos">Planos</a>
          <a href="#faq">FAQ</a>
          <Link href="/login">Login</Link>
          <Link href="/login?mode=register" className="btn btn-gradient full mt8">Teste grátis</Link>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="bg-blobs" aria-hidden="true">
            <span className="blob b1"></span>
            <span className="blob b2"></span>
          </div>
          <div className="container hero-inner">
            <div className="hero-left reveal" data-reveal="">
              <h1 className="hero-title">
                Transforme o <span className="gradient-text">WhatsApp</span> em um
                <span className="badge-tilt">atendente 24/7</span> com IA.
              </h1>
              <p className="lead">
                Respostas humanizadas, <strong>agendamentos automáticos</strong>, lembretes 24h/2h e funil de vendas — tudo com a personalidade da sua marca.
              </p>
              <div className="hero-ctas reveal" data-reveal="">
                <Link href="/login?mode=register" className="btn btn-xl btn-gradient pulse-gradient">Começar teste grátis</Link>
                <a href="#chatgpt" className="btn btn-xl btn-soft">Ver como funciona</a>
              </div>
            </div>
            <div className="hero-right reveal" data-reveal="">
              <div className="device">
                <video 
                  className="device-media" 
                  autoPlay 
                  playsInline 
                  loop 
                  muted
                  preload="auto"
                  poster="data:image/gif;base64,R0lGODlhAQABAAAAACw="
                >
                  <source src="https://files.catbox.moe/gwj0eu.mp4#t=0.001" type="video/mp4" />
                </video>
                <div className="glass"></div>
              </div>
              <div className="floating-note">
                <span className="dot"></span> Atendimento em média <b>7x</b> mais rápido
              </div>
            </div>
          </div>
        </section>

        {/* ChatGPT Section */}
        <section id="chatgpt" className="promo-light">
          <div className="container simple-hero-grid">
            <div>
              <h2 className="big-title">
                E se o <span className="pill">ChatGPT</span> fosse o<br />
                Atendente Inteligente da sua empresa?
              </h2>
              <p className="big-sub">
                Crie uma inteligência especialista no seu negócio, com linguagem conversacional, que atende 24 horas por dia, 7 dias por semana.
              </p>
              <Link href="/login?mode=register" className="btn btn-lg-pill">
                COMECE AGORA <span className="arr">→</span>
              </Link>
            </div>
            <div className="side-ill" aria-hidden="true">
              <Image src="https://files.catbox.moe/cnltor.png" alt="Demonstração do chatbot" width={380} height={400} loading="lazy" />
            </div>
          </div>
        </section>

        {/* Diferenciais */}
        <section className="section diff-section">
          <div className="container center">
            <h2 className="title-lg"><span className="pill-badge">Diferenciais</span> da Nossa IA</h2>
            <p className="muted max800">Uma solução completa que entende seu negócio e resolve os problemas dos seus clientes de forma autônoma.</p>
          </div>
          <div className="container diffs-grid" data-cascade="">
            {[
              { title: 'Atendimento Humanizado', desc: 'Nossa IA utiliza linguagem natural e empática, garantindo que seus clientes se sintam ouvidos e bem atendidos.' },
              { title: 'Idealizado para WhatsApp', desc: 'Integração total ao WhatsApp para uma experiência fluida, sem precisar de outros apps.' },
              { title: 'Busca Informações', desc: 'Acessa serviços, preços e horários do seu negócio para responder a qualquer dúvida.' },
              { title: 'Resolve problemas', desc: 'De agendamentos a cancelamentos e reagendamentos — tudo de forma autônoma e eficiente.' }
            ].map((item, i) => (
              <article key={i} className="diff-item reveal">
                <div className="diff-icon">
                  <svg><use href={`#i-icon-${i}`} /></svg>
                </div>
                <h3>{item.title}</h3>
                <p className="muted">{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="section">
          <div className="container center">
            <h2 className="title-lg">Funcionalidades da <span className="gradient-text">Vitoria4u</span></h2>
            <p className="muted max800">Automatize lembretes, personalize a experiência e acompanhe tudo em tempo real.</p>
          </div>
          <div className="container feats-grid" data-cascade="">
            {[
              { title: 'Lembrete 24h', desc: 'Mensagem automática 24 horas antes do compromisso para reduzir faltas.' },
              { title: 'Lembrete 2h', desc: 'Confirmação final 2 horas antes, mantendo o cliente aquecido e presente.' },
              { title: 'Feedback pós-atendimento', desc: 'Após o serviço finalizado, envia uma mensagem de como foi o atendimento.' },
              { title: 'Lembrete de aniversário', desc: 'Parabeniza com uma oferta personalizada para aumentar a fidelização.' },
              { title: 'Lembrete profissional', desc: 'Mensagens com o nome do profissional e instruções específicas do serviço.' },
              { title: 'Disparo de mensagens', desc: 'Campanhas segmentadas para promoção, reativação e novidades.' },
              { title: 'Retorno de manutenção', desc: 'Lembretes automáticos para revisões periódicas e manutenções.' },
              { title: 'Notificação ao gestor', desc: 'Alertas imediatos de novos agendamentos e alterações no calendário.' },
              { title: 'Atendimento WhatsApp com IA', desc: 'Responde dúvidas, agenda e resolve solicitações 24/7 com linguagem natural.' },
              { title: 'Manual ou automatizado', desc: 'Escolha entre atendimento humano, IA ou híbrido conforme sua operação.' }
            ].map((feat, i) => (
              <article key={i} className="feat reveal card3d">
                <div className="f-icon">
                  <svg><use href={`#i-feat-${i}`} /></svg>
                </div>
                <h3>{feat.title}</h3>
                <p className="muted">{feat.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Como Funciona */}
        <section id="como" className="section alt">
          <div className="container center">
            <h2 className="title-lg">Como <span className="badge-tilt">funciona</span></h2>
            <p className="muted max800">Em minutos, sua IA começa a atender no WhatsApp.</p>
          </div>
          <div className="container steps" data-cascade="">
            {[
              { n: '1', title: 'Conecte o WhatsApp', desc: 'Integração guiada e segura.' },
              { n: '2', title: 'Treine a IA', desc: 'Cadastre serviços, preços, horários e políticas.' },
              { n: '3', title: 'Atenda 24/7', desc: 'A IA responde, agenda e envia lembretes.' }
            ].map((step, i) => (
              <div key={i} className="step reveal">
                <span className="n">{step.n}</span>
                <h4>{step.title}</h4>
                <p className="muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Depoimentos */}
        <section className="section">
          <div className="container center">
            <h2 className="title-lg">Clientes <span className="gradient-text">felizes</span></h2>
            <p className="muted max800">Quem usa, recomenda.</p>
          </div>
          <div className="container">
            <div className="carousel reveal" data-autoplay="true" data-reveal="">
              <div className="track">
                {[
                  { name: 'Marina', role: 'Clínica Sorrir+', avatar: 'https://randomuser.me/api/portraits/women/68.jpg', text: 'Reduzimos as faltas e padronizamos o atendimento. Gostei muito e recomendo!' },
                  { name: 'Lucas', role: 'Barbearia Nord', avatar: 'https://randomuser.me/api/portraits/men/12.jpg', text: 'O cliente é respondido na hora e já sai com horário marcado. Simplesmente perfeito.' },
                  { name: 'Ana', role: 'Studio Rub', avatar: 'https://randomuser.me/api/portraits/women/32.jpg', text: 'Configuramos em 5 minutos. A IA resolve 80% das conversas sozinha.' },
                  { name: 'Paula', role: 'Dermaclin', avatar: 'https://randomuser.me/api/portraits/women/5.jpg', text: 'Equipe focada no atendimento presencial e agenda toda lotada kkk.' },
                  { name: 'Guilherme', role: 'AutoCenter Norte', avatar: 'https://randomuser.me/api/portraits/men/15.jpg', text: 'Foi tiro e queda. Lembrete de 2h salvou vários horários que o povo furava. Top demais.' },
                  { name: 'Renata', role: 'Espaço Bela', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', text: 'A Vitória desenrola as dúvidas e já agenda. Ficou bem mais de boa pra equipe.' }
                ].map((t, i) => (
                  <article key={i} className="t-card">
                    <div className="t-head">
                      <Image className="avatar" src={t.avatar} alt={t.name} width={52} height={52} loading="lazy" />
                      <div className="t-id">
                        <strong>{t.name}</strong>
                        <span className="role">{t.role}</span>
                      </div>
                    </div>
                    <p>{t.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="section alt">
          <div className="container center">
            <h2 className="title-lg">Escolha seu <span className="gradient-text">plano</span></h2>
            <p className="muted max900">Comece grátis e evolua quando quiser.</p>
          </div>
          <div className="container plans" data-cascade="">
            {/* Básico */}
            <article className="plan card3d reveal">
              <h3>Básico</h3>
              <p className="muted">Funcionalidades essenciais para o seu negócio.</p>
              <div className="price">
                <span className="old">R$ 99,90</span>
                <span className="now">R$ <b>79,90</b></span>
                <span className="per">/mês</span>
              </div>
              <ul className="plist">
                <li>✓ Lembrete 24h</li>
                <li>✓ Lembrete 2h</li>
                <li>✓ Notificação Gestor Agendamento</li>
                <li>✓ Feedback Pós Atendimento</li>
              </ul>
              <Link href="/login?mode=register" className="btn btn-outline full">Assinar Agora</Link>
            </article>

            {/* Profissional */}
            <article className="plan featured card3d reveal">
              <div className="ribbon">Mais Popular</div>
              <h3>Profissional</h3>
              <p className="muted">Mais poder e automações para escalar seu atendimento.</p>
              <div className="price">
                <span className="now">R$ <b>149,90</b></span>
                <span className="per">/mês</span>
              </div>
              <ul className="plist">
                <li>✓ Lembrete 24h</li>
                <li>✓ Lembrete 2h</li>
                <li>✓ Feedback Pós Atendimento</li>
                <li>✓ Lembrete Profissional</li>
                <li>✓ Disparo de Mensagens</li>
                <li>✓ Notificação Gestor Agendamento</li>
              </ul>
              <Link href="/login?mode=register" className="btn btn-gradient full">Assinar Agora</Link>
            </article>

            {/* Premium */}
            <article className="plan card3d reveal">
              <h3>Premium</h3>
              <p className="muted">Acesso total a todas as funcionalidades da plataforma.</p>
              <div className="price">
                <span className="now">R$ <b>179,90</b></span>
                <span className="per">/mês</span>
              </div>
              <ul className="plist">
                <li>✓ Lembrete 24h</li>
                <li>✓ Lembrete 2h</li>
                <li>✓ Feedback Pós Atendimento</li>
                <li>✓ Lembrete Aniversário</li>
                <li>✓ Lembrete Profissional</li>
                <li>✓ Disparo de Mensagens</li>
                <li>✓ Retorno Manutenção</li>
                <li>✓ Notificação Gestor Agendamento</li>
                <li>✓ Atendimento Whatsapp IA</li>
                <li>✓ Atendimento Manual ou Automatizado</li>
              </ul>
              <Link href="/login?mode=register" className="btn btn-outline full">Assinar Agora</Link>
            </article>
          </div>
          <p className="tiny center">Teste grátis de 3 dias incluído em todos os planos.</p>
        </section>

        {/* FAQ */}
        <section id="faq" className="section">
          <div className="container center">
            <h2 className="title-lg">Perguntas <span className="gradient-text">frequentes</span></h2>
          </div>
          <div className="container faq" data-cascade="">
            <details className="faq-item reveal">
              <summary>Preciso saber programar?</summary>
              <p>Não. O Dashboard é super intuitivo e em poucos minutos sua IA já estará atendendo.</p>
            </details>
            <details className="faq-item reveal">
              <summary>Funciona com meu número atual?</summary>
              <p>Sim. Conectamos ao seu número atual de forma rápida e segura.</p>
            </details>
            <details className="faq-item reveal">
              <summary>Posso personalizar as respostas?</summary>
              <p>Total. Você define tudo, serviços, preços e políticas.</p>
            </details>
            <details className="faq-item reveal">
              <summary>O teste grátis tem cobrança?</summary>
              <p>Zero cobrança. Cancele quando quiser, sem fidelidade.</p>
            </details>
          </div>
        </section>

        {/* CTA Final */}
        <section className="cta">
          <div className="container cta-inner reveal" data-reveal="">
            <h2>Pronto para encantar seus clientes?</h2>
            <p className="muted">Atendimento 24/7 com a personalidade da sua marca — direto no WhatsApp.</p>
            <div className="cta-actions">
              <Link href="/login?mode=register" className="btn btn-xl btn-gradient pulse-gradient">Começar agora</Link>
              <a href="https://wa.me/553197922538?text=Quero%20conhecer%20a%20Vitória4U" target="_blank" rel="noopener" className="btn btn-xl btn-soft">
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container footer-inner">
          <Link className="brand" href="/">
            <Image className="logo-img small" src="https://files.catbox.moe/05oapo.png" alt="Vitória4U" width={88} height={22} />
          </Link>
          <p className="fine">© {new Date().getFullYear()} Vitória. Todos os direitos reservados.</p>
          <div className="footer-links">
            <a href="#">Termos</a>
            <a href="#">Privacidade</a>
            <a href="#faq">Ajuda</a>
          </div>
        </div>
      </footer>

      {/* Sticky CTA */}
      <div className="sticky-cta">
        <div className="container s-cta-inner">
          <span>Transforme seu WhatsApp em um atendente 24/7</span>
          <Link href="/login?mode=register" className="btn btn-gradient">Testar grátis</Link>
        </div>
      </div>

      {/* WhatsApp Float */}
      <a 
        className="whatsapp" 
        href="https://wa.me/553197922538?text=Olá!%20Quero%20saber%20mais%20sobre%20a%20Vitória4U" 
        target="_blank" 
        rel="noopener" 
        aria-label="WhatsApp"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="currentColor"/>
        </svg>
        <span className="wa-tip">Atendimento 24/7</span>
      </a>
    </div>
  );
}
