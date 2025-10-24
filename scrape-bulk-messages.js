/**
 * Script para extrair documentação específica de Mensagem em Massa da UazAPI
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const endpoints = [
  { url: 'https://docs.uazapi.com/endpoint/post/sender~simple', name: 'POST /sender/simple - Enviar mensagem simples em massa' },
  { url: 'https://docs.uazapi.com/endpoint/post/sender~advanced', name: 'POST /sender/advanced - Enviar mensagem avançada em massa' },
  { url: 'https://docs.uazapi.com/endpoint/post/sender~edit', name: 'POST /sender/edit - Editar mensagem em massa' },
  { url: 'https://docs.uazapi.com/endpoint/post/sender~cleardone', name: 'POST /sender/cleardone - Limpar mensagens concluídas' },
  { url: 'https://docs.uazapi.com/endpoint/delete/sender~clearall', name: 'DELETE /sender/clearall - Limpar todas as mensagens' },
  { url: 'https://docs.uazapi.com/endpoint/get/sender~listfolders', name: 'GET /sender/listfolders - Listar pastas' },
  { url: 'https://docs.uazapi.com/endpoint/post/sender~listmessages', name: 'POST /sender/listmessages - Listar mensagens' }
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
  console.log('🚀 Iniciando extração de documentação de Mensagem em Massa...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  
  let markdown = '# UazAPI - Mensagem em Massa (Bulk Messages)\n\n';
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
  fs.writeFileSync('UazAPI-Bulk-Messages-Complete.md', markdown);
  
  console.log('✅ Documentação salva em: UazAPI-Bulk-Messages-Complete.md');
  console.log(`📄 Total de caracteres: ${markdown.length}`);
  console.log('\n🎉 Extração concluída!');
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
