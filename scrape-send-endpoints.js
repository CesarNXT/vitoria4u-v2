/**
 * Script para extrair documentação de endpoints de envio da UazAPI
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const endpoints = [
  { url: 'https://docs.uazapi.com/endpoint/post/send~text', name: 'POST /send/text - Enviar mensagem de texto' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~media', name: 'POST /send/media - Enviar mídia' },
  { url: 'https://docs.uazapi.com/endpoint/post/message~presence', name: 'POST /message/presence - Presença de mensagem' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~status', name: 'POST /send/status - Enviar status' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~menu', name: 'POST /send/menu - Enviar menu' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~location-button', name: 'POST /send/location-button - Enviar botão de localização' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~request-payment', name: 'POST /send/request-payment - Solicitar pagamento' },
  { url: 'https://docs.uazapi.com/endpoint/post/send~pix-button', name: 'POST /send/pix-button - Enviar botão PIX' }
];

async function extractEndpointDocs(page, url, name) {
  console.log(`\n📄 Acessando: ${name}`);
  await page.goto(url, { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const content = await page.evaluate(() => {
    const getText = (selector) => {
      const el = document.querySelector(selector);
      return el ? el.textContent.trim() : '';
    };
    
    const getAll = (selector) => {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).map(el => el.textContent.trim());
    };
    
    // Extrair todo o HTML para análise
    const root = document.querySelector('#root') || document.body;
    return root.innerText;
  });
  
  return content;
}

async function main() {
  console.log('🚀 Iniciando extração de documentação de endpoints de envio...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  
  let markdown = '# UazAPI - Endpoints de Envio\n\n';
  markdown += `Documentação extraída em: ${new Date().toLocaleString('pt-BR')}\n\n`;
  markdown += '---\n\n';
  markdown += '## 📑 Índice\n\n';
  
  endpoints.forEach((endpoint, i) => {
    markdown += `${i + 1}. [${endpoint.name}](#endpoint-${i + 1})\n`;
  });
  
  markdown += '\n---\n\n';
  
  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i];
    
    try {
      const content = await extractEndpointDocs(page, endpoint.url, endpoint.name);
      
      markdown += `## Endpoint ${i + 1}\n\n`;
      markdown += `### ${endpoint.name}\n\n`;
      markdown += `**URL:** ${endpoint.url}\n\n`;
      markdown += '```\n';
      markdown += content;
      markdown += '\n```\n\n';
      markdown += '---\n\n';
      
      console.log(`✅ Extraído com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao extrair ${endpoint.name}:`, error.message);
      markdown += `## Endpoint ${i + 1}\n\n`;
      markdown += `### ${endpoint.name}\n\n`;
      markdown += `❌ Erro ao extrair: ${error.message}\n\n`;
      markdown += '---\n\n';
    }
  }
  
  await browser.close();
  
  console.log('\n💾 Salvando documentação...');
  fs.writeFileSync('UazAPI-Send-Endpoints.md', markdown);
  
  console.log('✅ Documentação salva em: UazAPI-Send-Endpoints.md');
  console.log(`📄 Total de caracteres: ${markdown.length}`);
  console.log('\n🎉 Extração concluída!');
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
