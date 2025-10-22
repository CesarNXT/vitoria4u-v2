import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermosUsoPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Logo />
          <nav className="flex flex-1 items-center justify-end gap-2">
            <Button variant="ghost" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container py-8 md:py-12 max-w-4xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Termos de Uso
            </h1>
            <p className="text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">1. Aceitação dos Termos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Ao acessar e usar a plataforma Vitoria4u, você concorda em cumprir e estar vinculado aos seguintes 
                termos e condições de uso. Se você não concordar com qualquer parte destes termos, não deverá usar 
                nossos serviços.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">2. Descrição do Serviço</h2>
              <p className="text-muted-foreground leading-relaxed">
                O Vitoria4u é uma plataforma de automação de atendimento via WhatsApp com inteligência artificial, 
                oferecendo sistema de agendamento inteligente, gestão de clientes, profissionais e serviços para 
                negócios de beleza e bem-estar.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">3. Cadastro e Conta do Usuário</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>Para usar o Vitoria4u, você deve:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Fornecer informações verdadeiras, precisas e atualizadas durante o registro</li>
                  <li>Manter a segurança de sua senha e conta</li>
                  <li>Notificar imediatamente sobre qualquer uso não autorizado da sua conta</li>
                  <li>Ser responsável por todas as atividades que ocorram sob sua conta</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">4. Planos e Pagamentos</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <h3 className="font-semibold text-foreground">4.1 Período de Teste</h3>
                <p>
                  Oferecemos um período de teste gratuito de 3 dias para novos usuários. Após esse período, 
                  será necessário assinar um plano pago para continuar usando os serviços.
                </p>
                
                <h3 className="font-semibold text-foreground mt-4">4.2 Assinaturas</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>As assinaturas são cobradas mensalmente</li>
                  <li>O pagamento é processado automaticamente através do Mercado Pago</li>
                  <li>Você pode cancelar sua assinatura a qualquer momento</li>
                  <li>Não há reembolso proporcional em caso de cancelamento</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">5. Uso Aceitável</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>Você concorda em NÃO usar a plataforma para:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Violar qualquer lei ou regulamento aplicável</li>
                  <li>Enviar spam ou mensagens não solicitadas</li>
                  <li>Tentar obter acesso não autorizado a sistemas ou redes</li>
                  <li>Interferir no funcionamento adequado da plataforma</li>
                  <li>Usar conteúdo ofensivo, difamatório ou ilegal</li>
                  <li>Revender ou redistribuir os serviços sem autorização</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">6. Propriedade Intelectual</h2>
              <p className="text-muted-foreground leading-relaxed">
                Todo o conteúdo, design, código e funcionalidades da plataforma Vitoria4u são de propriedade 
                exclusiva da empresa e estão protegidos por leis de direitos autorais e outras leis de propriedade 
                intelectual. Você não pode copiar, modificar, distribuir ou criar trabalhos derivados sem permissão 
                expressa por escrito.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">7. Privacidade e Proteção de Dados</h2>
              <p className="text-muted-foreground leading-relaxed">
                Levamos sua privacidade a sério. Coletamos e processamos seus dados de acordo com nossa{' '}
                <Link href="/politica-privacidade" className="text-primary hover:underline font-medium">
                  Política de Privacidade
                </Link>
                {' '}e em conformidade com a Lei Geral de Proteção de Dados (LGPD).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">8. Limitação de Responsabilidade</h2>
              <p className="text-muted-foreground leading-relaxed">
                O Vitoria4u é fornecido &quot;como está&quot; sem garantias de qualquer tipo. Não garantimos que o serviço 
                será ininterrupto, livre de erros ou seguro. Em nenhuma circunstância seremos responsáveis por 
                danos diretos, indiretos, incidentais, especiais ou consequenciais resultantes do uso ou 
                incapacidade de usar nossos serviços.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">9. Modificações dos Termos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Reservamos o direito de modificar estes termos a qualquer momento. As alterações entrarão em 
                vigor imediatamente após a publicação. O uso continuado da plataforma após as alterações constitui 
                sua aceitação dos novos termos.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">10. Rescisão</h2>
              <p className="text-muted-foreground leading-relaxed">
                Podemos suspender ou encerrar sua conta imediatamente, sem aviso prévio, se você violar estes 
                termos ou se houver suspeita de uso fraudulento ou abusivo da plataforma.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">11. Lei Aplicável</h2>
              <p className="text-muted-foreground leading-relaxed">
                Estes termos serão regidos e interpretados de acordo com as leis da República Federativa do Brasil, 
                sem considerar conflitos de provisões legais.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">12. Contato</h2>
              <p className="text-muted-foreground leading-relaxed">
                Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco através do WhatsApp 
                (31) 97922-538 ou pelo e-mail suporte@vitoria4u.com.br
              </p>
            </section>
          </div>

          <div className="pt-6 border-t">
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Home
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Vitoria4u. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
