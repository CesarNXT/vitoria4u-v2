/**
 * Script para extrair TODA a documentação da UazAPI - TODOS OS ENDPOINTS
 * Baseado nos scripts existentes, adaptado para extrair CADA PALAVRA
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const endpoints = [
  // === INSTÂNCIAS ===
  { url: 'https://docs.uazapi.com/endpoint/post/instance~init', name: 'Inicializar Instância', category: 'Instâncias' },
  { url: 'https://docs.uazapi.com/endpoint/get/instance~all', name: 'Listar Todas Instâncias', category: 'Instâncias' },
  { url: 'https://docs.uazapi.com/endpoint/post/instance~updateAdminFields', name: 'Atualizar Campos Admin', category: 'Instâncias' },
  { url: 'https://docs.uazapi.com/endpoint/post/instance~connect', name: 'Conectar Instância', category: 'Instâncias' },
  { url: 'https://docs.uazapi.com/endpoint/post/instance~disconnect', name: 'Desconectar Instância', category: 'Instâncias' },
  { url: 'https://docs.uazapi.com/endpoint/get/instance~status', name: 'Status da Instância', category: 'Instâncias' },
  { url: 'https://docs.uazapi.com/endpoint/post/instance~updateInstanceName', name: 'Atualizar Nome Instância', category: 'Instâncias' },
  { url: 'https://docs.uazapi.com/endpoint/delete/instance', name: 'Deletar Instância', category: 'Instâncias' },
  { url: 'https://docs.uazapi.com/endpoint/get/instance~privacy', name: 'Obter Privacidade', category: 'Instâncias' },
  { url: 'https://docs.uazapi.com/endpoint/post/instance~privacy', name: 'Atualizar Privacidade', category: 'Instâncias' },
  { url: 'https://docs.uazapi.com/endpoint/post/instance~presence', name: 'Atualizar Presença', category: 'Instâncias' },
  
  // === WEBHOOKS GLOBAIS ===
  { url: 'https://docs.uazapi.com/endpoint/get/globalwebhook', name: 'Obter Webhook Global', category: 'Webhooks Globais' },
  { url: 'https://docs.uazapi.com/endpoint/post/globalwebhook', name: 'Configurar Webhook Global', category: 'Webhooks Globais' },
  
  // === PERFIL ===
  { url: 'https://docs.uazapi.com/endpoint/post/profile~name', name: 'Atualizar Nome Perfil', category: 'Perfil' },
  { url: 'https://docs.uazapi.com/endpoint/post/profile~image', name: 'Atualizar Foto Perfil', category: 'Perfil' },
  
  // === CHAMADAS ===
  { url: 'https://docs.uazapi.com/endpoint/post/call~make', name: 'Fazer Chamada', category: 'Chamadas' },
  { url: 'https://docs.uazapi.com/endpoint/post/call~reject', name: 'Rejeitar Chamada', category: 'Chamadas' },
  
  // === WEBHOOKS E SSE ===
  { url: 'https://docs.uazapi.com/endpoint/get/webhook', name: 'Obter Webhook Instância', category: 'Webhooks e SSE' },
  { url: 'https://docs.uazapi.com/endpoint/post/webhook', name: 'Configurar Webhook Instância', category: 'Webhooks e SSE' },
  { url: 'https://docs.uazapi.com/endpoint/get/sse', name: 'Server-Sent Events', category: 'Webhooks e SSE' },
  
  // === ENVIO DE MENSAGENS ===
  { url: 'https://docs.uazapi.com/endpoint/post/send~text', name: 'Enviar Texto', category: 'Envio de Mensagens' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~media', name: 'Enviar Mídia', category: 'Envio de Mensagens' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~contact', name: 'Enviar Contato', category: 'Envio de Mensagens' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~location', name: 'Enviar Localização', category: 'Envio de Mensagens' },
  { url: 'https://docs.uazapi.com/endpoint/post/message~presence', name: 'Presença de Mensagem', category: 'Envio de Mensagens' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~status', name: 'Enviar Status', category: 'Envio de Mensagens' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~menu', name: 'Enviar Menu', category: 'Envio de Mensagens' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~carousel', name: 'Enviar Carrossel', category: 'Envio de Mensagens' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~location-button', name: 'Enviar Botão Localização', category: 'Envio de Mensagens' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~pix-button', name: 'Enviar Botão PIX', category: 'Envio de Mensagens' },
  
  // === SENDER (DISPAROS EM MASSA) ===
  { url: 'https://docs.uazapi.com/endpoint/post/sender~simple', name: 'Disparo Simples', category: 'Sender' },
  { url: 'https://docs.uazapi.com/endpoint/post/sender~advanced', name: 'Disparo Avançado', category: 'Sender' },
  { url: 'https://docs.uazapi.com/endpoint/post/sender~edit', name: 'Editar Disparo', category: 'Sender' },
  { url: 'https://docs.uazapi.com/endpoint/post/sender~cleardone', name: 'Limpar Concluídos', category: 'Sender' },
  { url: 'https://docs.uazapi.com/endpoint/delete/sender~clearall', name: 'Limpar Todas', category: 'Sender' },
  { url: 'https://docs.uazapi.com/endpoint/get/sender~listfolders', name: 'Listar Pastas', category: 'Sender' },
  { url: 'https://docs.uazapi.com/endpoint/post/sender~listmessages', name: 'Listar Mensagens', category: 'Sender' }
];

async function extractEndpointDocs(page, endpoint, index, total) {
  console.log(`\n[${index}/${total}] 📄 Extraindo: ${endpoint.name}`);
  console.log(`    URL: ${endpoint.url}`);
  
  try {
    await page.goto(endpoint.url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Aguardar React/JavaScript carregar
    console.log('    ⏳ Aguardando carregamento...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Extrair TODO o conteúdo renderizado
    const content = await page.evaluate(() => {
      const root = document.querySelector('#root') || document.body;
      
      // Função para extrair texto formatado mantendo estrutura
      function extractFormattedText(element) {
        let text = '';
        
        // Pegar todo o conteúdo visível
        const allText = element.innerText || element.textContent;
        
        // Também pegar código fonte se houver
        const codeBlocks = element.querySelectorAll('pre, code');
        let codes = [];
        codeBlocks.forEach(code => {
          codes.push(code.textContent);
        });
        
        return {
          text: allText,
          codes: codes
        };
      }
      
      return extractFormattedText(root);
    });
    
    console.log(`    ✅ Extraído (${content.text.length} caracteres)`);
    return content;
    
  } catch (error) {
    console.error(`    ❌ Erro: ${error.message}`);
    return {
      text: `ERRO AO EXTRAIR: ${error.message}`,
      codes: []
    };
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   EXTRAÇÃO COMPLETA - DOCUMENTAÇÃO UAZAPI                ║');
  console.log('║   Extraindo CADA PALAVRA de todos os endpoints           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  
  // Estrutura para organizar por categoria
  const documentacao = {};
  
  // Extrair cada endpoint
  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i];
    
    if (!documentacao[endpoint.category]) {
      documentacao[endpoint.category] = [];
    }
    
    const content = await extractEndpointDocs(page, endpoint, i + 1, endpoints.length);
    
    documentacao[endpoint.category].push({
      name: endpoint.name,
      url: endpoint.url,
      content: content
    });
    
    // Pequeno delay entre requisições
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  await browser.close();
  
  console.log('\n' + '='.repeat(60));
  console.log('💾 Gerando arquivo Markdown...\n');
  
  // Gerar Markdown organizado
  let markdown = '# UazAPI - Documentação Completa Extraída\n\n';
  markdown += `**Data de Extração:** ${new Date().toLocaleString('pt-BR')}\n\n`;
  markdown += `**Total de Endpoints:** ${endpoints.length}\n\n`;
  markdown += '---\n\n';
  
  // Índice
  markdown += '## 📑 Índice\n\n';
  Object.keys(documentacao).forEach(category => {
    markdown += `### ${category}\n\n`;
    documentacao[category].forEach((endpoint, i) => {
      const anchor = `${category}-${i}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      markdown += `- [${endpoint.name}](#${anchor})\n`;
    });
    markdown += '\n';
  });
  markdown += '---\n\n';
  
  // Conteúdo completo por categoria
  Object.keys(documentacao).forEach(category => {
    markdown += `# ${category}\n\n`;
    
    documentacao[category].forEach((endpoint, i) => {
      const anchor = `${category}-${i}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      markdown += `## ${endpoint.name}\n\n`;
      markdown += `**URL de Referência:** [${endpoint.url}](${endpoint.url})\n\n`;
      markdown += '### Conteúdo Extraído\n\n';
      markdown += '```\n';
      markdown += endpoint.content.text;
      markdown += '\n```\n\n';
      
      if (endpoint.content.codes && endpoint.content.codes.length > 0) {
        markdown += '### Blocos de Código\n\n';
        endpoint.content.codes.forEach((code, idx) => {
          markdown += `#### Código ${idx + 1}\n\n`;
          markdown += '```\n';
          markdown += code;
          markdown += '\n```\n\n';
        });
      }
      
      markdown += '---\n\n';
    });
  });
  
  // Salvar em docs/
  const outputPath = 'docs/UAZAPI_DOCUMENTACAO_COMPLETA.md';
  fs.writeFileSync(outputPath, markdown);
  
  console.log('✅ Documentação salva em:', outputPath);
  console.log(`📄 Total de caracteres: ${markdown.length.toLocaleString('pt-BR')}`);
  console.log(`📦 Total de endpoints: ${endpoints.length}`);
  console.log('\n🎉 EXTRAÇÃO CONCLUÍDA COM SUCESSO!\n');
}

main().catch(error => {
  console.error('❌ ERRO FATAL:', error);
  process.exit(1);
});
