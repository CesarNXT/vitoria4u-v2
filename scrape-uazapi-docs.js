/**
 * Script para fazer scraping da documentação UazAPI com Puppeteer
 * 
 * Como executar:
 * 1. npm install puppeteer
 * 2. node scrape-uazapi-docs.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeUazAPIAnálise() {
  console.log('🚀 Iniciando navegador...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Aumentar timeout para páginas que carregam lentamente
  page.setDefaultTimeout(60000);
  
  console.log('📄 Acessando documentação...');
  await page.goto('https://docs.uazapi.com', { waitUntil: 'networkidle2' });
  
  // Aguardar a página carregar completamente (React)
  console.log('⏳ Aguardando carregamento completo...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('🔍 Buscando todos os endpoints...');
  
  // Clicar no botão "Baixar Especificação" se existir
  try {
    const downloadButton = await page.$('a[href*="openapi"], button:has-text("Baixar")');
    if (downloadButton) {
      const href = await page.evaluate(el => el.getAttribute('href'), downloadButton);
      if (href && href.includes('json')) {
        console.log('📥 Encontrado link para download da especificação!');
        console.log(`   URL: ${href}`);
      }
    }
  } catch (e) {
    // Ignora se não encontrar
  }
  
  console.log('🔍 Extraindo conteúdo completo...');
  
  // Extrair todo o conteúdo da documentação
  const content = await page.evaluate(() => {
    let markdown = '# UazAPI - Documentação Completa\n\n';
    markdown += `Extraído em: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    markdown += '---\n\n';
    
    // Pegar todo o conteúdo principal
    const mainContent = document.querySelector('#root') || document.body;
    
    // Função recursiva para extrair texto e estrutura
    function extractContent(element, level = 2) {
      let text = '';
      
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const content = node.textContent.trim();
          if (content) {
            text += content + '\n\n';
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = node.tagName.toLowerCase();
          
          // Cabeçalhos
          if (tag.match(/^h[1-6]$/)) {
            const level = parseInt(tag[1]);
            const hashes = '#'.repeat(level);
            text += `${hashes} ${node.textContent.trim()}\n\n`;
          }
          // Código
          else if (tag === 'pre' || tag === 'code') {
            const code = node.textContent.trim();
            if (code.length > 0) {
              text += '```\n' + code + '\n```\n\n';
            }
          }
          // Parágrafo
          else if (tag === 'p') {
            text += node.textContent.trim() + '\n\n';
          }
          // Lista
          else if (tag === 'li') {
            text += `- ${node.textContent.trim()}\n`;
          }
          // Tabela
          else if (tag === 'table') {
            const rows = node.querySelectorAll('tr');
            if (rows.length > 0) {
              rows.forEach((row, i) => {
                const cells = row.querySelectorAll('th, td');
                const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
                text += '| ' + cellTexts.join(' | ') + ' |\n';
                
                if (i === 0) {
                  text += '|' + cellTexts.map(() => '---').join('|') + '|\n';
                }
              });
              text += '\n';
            }
          }
          // Links
          else if (tag === 'a') {
            const href = node.getAttribute('href');
            const linkText = node.textContent.trim();
            if (href && linkText) {
              text += `[${linkText}](${href}) `;
            }
          }
          // Recursivo para outros elementos
          else {
            text += extractContent(node, level);
          }
        }
      }
      
      return text;
    }
    
    markdown += extractContent(mainContent);
    
    return markdown;
  });
  
  console.log('💾 Salvando arquivo...');
  fs.writeFileSync('UazAPI-docs.md', content);
  
  console.log('✅ Documentação salva em: UazAPI-docs.md');
  console.log(`📄 Total de caracteres: ${content.length}`);
  
  await browser.close();
}

// Executar
scrapeUazAPIAnálise().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
