import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, Database, FileText, Mail } from 'lucide-react';

export default function PoliticaPrivacidadePage() {
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
          {/* Header Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Política de Privacidade
                </h1>
                <p className="text-muted-foreground">
                  Última atualização: {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm text-muted-foreground leading-relaxed">
                A Vitoria4u está comprometida em proteger sua privacidade e seus dados pessoais. Esta política 
                explica como coletamos, usamos, armazenamos e protegemos suas informações em conformidade com 
                a <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong>.
              </p>
            </div>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            {/* Seção 1 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">1. Dados que Coletamos</h2>
              </div>
              
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <h3 className="font-semibold text-foreground">1.1 Dados Fornecidos por Você</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Cadastro:</strong> nome completo, e-mail, telefone/WhatsApp, CPF/CNPJ</li>
                  <li><strong>Dados do negócio:</strong> nome da empresa, endereço, horários de funcionamento</li>
                  <li><strong>Pagamento:</strong> informações processadas pelo Mercado Pago (não armazenamos dados de cartão)</li>
                  <li><strong>Clientes e agendamentos:</strong> dados dos clientes do seu negócio gerenciados por você</li>
                </ul>

                <h3 className="font-semibold text-foreground mt-4">1.2 Dados Coletados Automaticamente</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Endereço IP e localização aproximada</li>
                  <li>Tipo de navegador e dispositivo</li>
                  <li>Páginas visitadas e tempo de uso</li>
                  <li>Cookies essenciais para funcionamento da plataforma</li>
                </ul>

                <h3 className="font-semibold text-foreground mt-4">1.3 Dados de Integração com WhatsApp</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Mensagens trocadas através da IA de atendimento</li>
                  <li>Números de telefone dos seus clientes</li>
                  <li>Histórico de conversas e agendamentos</li>
                </ul>
              </div>
            </section>

            {/* Seção 2 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">2. Como Usamos Seus Dados</h2>
              </div>
              
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>Utilizamos seus dados pessoais para:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Prestação do serviço:</strong> gerenciar sua conta, processar agendamentos e automatizar atendimentos</li>
                  <li><strong>Comunicação:</strong> enviar notificações sobre agendamentos, atualizações e suporte</li>
                  <li><strong>Pagamentos:</strong> processar assinaturas e emitir notas fiscais</li>
                  <li><strong>Melhorias:</strong> analisar o uso da plataforma para aprimorar funcionalidades</li>
                  <li><strong>Segurança:</strong> detectar e prevenir fraudes e uso indevido</li>
                  <li><strong>Cumprimento legal:</strong> atender obrigações legais e regulatórias</li>
                </ul>
              </div>
            </section>

            {/* Seção 3 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">3. Compartilhamento de Dados</h2>
              </div>
              
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>Podemos compartilhar seus dados com:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Mercado Pago:</strong> para processamento de pagamentos</li>
                  <li><strong>Firebase/Google Cloud:</strong> para armazenamento e autenticação</li>
                  <li><strong>WhatsApp/Meta:</strong> para integração do serviço de mensagens</li>
                  <li><strong>Google AI (Gemini):</strong> para processamento da inteligência artificial</li>
                  <li><strong>Autoridades:</strong> quando exigido por lei ou ordem judicial</li>
                </ul>
                <p className="mt-3">
                  <strong>Importante:</strong> Nunca vendemos seus dados pessoais para terceiros.
                </p>
              </div>
            </section>

            {/* Seção 4 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">4. Segurança dos Dados</h2>
              </div>
              
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>Implementamos medidas de segurança para proteger seus dados:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
                  <li>Criptografia de dados em repouso no Firebase</li>
                  <li>Autenticação segura com Firebase Auth</li>
                  <li>Controle de acesso baseado em funções</li>
                  <li>Monitoramento e logs de segurança</li>
                  <li>Backups regulares e redundância de dados</li>
                </ul>
              </div>
            </section>

            {/* Seção 5 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">5. Seus Direitos (LGPD)</h2>
              </div>
              
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>De acordo com a LGPD, você tem direito a:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Confirmação:</strong> saber se processamos seus dados pessoais</li>
                  <li><strong>Acesso:</strong> solicitar cópia dos seus dados</li>
                  <li><strong>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados</li>
                  <li><strong>Anonimização ou exclusão:</strong> solicitar remoção de dados desnecessários</li>
                  <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado</li>
                  <li><strong>Revogação:</strong> retirar consentimento a qualquer momento</li>
                  <li><strong>Oposição:</strong> se opor ao tratamento de dados</li>
                  <li><strong>Revisão:</strong> solicitar revisão de decisões automatizadas</li>
                </ul>
                <p className="mt-3">
                  Para exercer seus direitos, entre em contato através do e-mail: <strong>privacidade@vitoria4u.com.br</strong>
                </p>
              </div>
            </section>

            {/* Seção 6 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">6. Cookies</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>Utilizamos cookies essenciais para:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Manter você conectado após fazer login</li>
                  <li>Lembrar suas preferências (tema claro/escuro)</li>
                  <li>Garantir a segurança da plataforma</li>
                  <li>Analisar o uso da plataforma para melhorias</li>
                </ul>
                <p className="mt-3">
                  Você pode gerenciar suas preferências de cookies através do banner ao acessar o site pela primeira vez.
                </p>
              </div>
            </section>

            {/* Seção 7 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">7. Retenção de Dados</h2>
              <p className="text-muted-foreground leading-relaxed">
                Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir as finalidades descritas 
                nesta política ou conforme exigido por lei. Após o cancelamento da conta, seus dados serão mantidos 
                por até 5 anos para fins de auditoria e cumprimento de obrigações legais, após os quais serão 
                permanentemente excluídos ou anonimizados.
              </p>
            </section>

            {/* Seção 8 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">8. Menores de Idade</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nossos serviços não são direcionados a menores de 18 anos. Se tomarmos conhecimento de que 
                coletamos dados de menores sem o consentimento parental adequado, tomaremos medidas para excluir 
                essas informações o mais rápido possível.
              </p>
            </section>

            {/* Seção 9 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">9. Alterações nesta Política</h2>
              <p className="text-muted-foreground leading-relaxed">
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre alterações 
                significativas por e-mail ou através de aviso na plataforma. A versão mais recente estará sempre 
                disponível nesta página com a data da última atualização.
              </p>
            </section>

            {/* Seção 10 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">10. Contato</h2>
              </div>
              
              <div className="space-y-2 text-muted-foreground leading-relaxed bg-muted/50 rounded-lg p-4 border">
                <p>Para dúvidas sobre esta Política de Privacidade ou para exercer seus direitos:</p>
                <ul className="space-y-1 mt-2">
                  <li><strong>E-mail:</strong> privacidade@vitoria4u.com.br</li>
                  <li><strong>WhatsApp:</strong> (31) 97922-538</li>
                  <li><strong>Encarregado de Dados (DPO):</strong> dpo@vitoria4u.com.br</li>
                </ul>
              </div>
            </section>

            {/* Seção 11 */}
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">11. Base Legal (LGPD)</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>O tratamento de dados pessoais é realizado com base nas seguintes hipóteses legais:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Execução de contrato:</strong> para prestação dos serviços contratados</li>
                  <li><strong>Consentimento:</strong> quando você nos autoriza expressamente</li>
                  <li><strong>Legítimo interesse:</strong> para melhorias e segurança da plataforma</li>
                  <li><strong>Cumprimento de obrigação legal:</strong> quando exigido por lei</li>
                </ul>
              </div>
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
