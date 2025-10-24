/**
 * Script para baixar documentação completa da UazAPI em Markdown
 * 
 * Como executar:
 * node download-api-docs.js
 */

const fs = require('fs');
const https = require('https');

// Possíveis URLs do spec OpenAPI
const possibleSpecs = [
  'https://docs.uazapi.com/openapi.json',
  'https://docs.uazapi.com/swagger.json',
  'https://docs.uazapi.com/api-docs',
  'https://docs.uazapi.com/openapi.yaml',
  'https://vitoria4u.uazapi.com/openapi.json',
  'https://vitoria4u.uazapi.com/swagger.json',
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, data });
        } else {
          resolve({ success: false, status: res.statusCode });
        }
      });
    }).on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

function convertOpenAPIToMarkdown(spec) {
  const data = JSON.parse(spec);
  let markdown = '';
  
  // Cabeçalho
  markdown += `# ${data.info.title}\n\n`;
  markdown += `**Versão:** ${data.info.version}\n\n`;
  if (data.info.description) {
    markdown += `${data.info.description}\n\n`;
  }
  
  markdown += `**Base URL:** ${data.servers?.[0]?.url || 'N/A'}\n\n`;
  markdown += `---\n\n`;
  
  // Índice
  markdown += `## 📑 Índice\n\n`;
  const paths = Object.keys(data.paths || {});
  paths.forEach(path => {
    const methods = Object.keys(data.paths[path]);
    methods.forEach(method => {
      const operation = data.paths[path][method];
      const anchor = `${method}-${path}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      markdown += `- [${method.toUpperCase()} ${path}](#${anchor}) - ${operation.summary || operation.description || ''}\n`;
    });
  });
  markdown += `\n---\n\n`;
  
  // Endpoints
  markdown += `## 🔌 Endpoints\n\n`;
  
  paths.forEach(path => {
    const methods = Object.keys(data.paths[path]);
    
    methods.forEach(method => {
      const operation = data.paths[path][method];
      const anchor = `${method}-${path}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      
      markdown += `### ${method.toUpperCase()} ${path}\n\n`;
      
      if (operation.summary) {
        markdown += `**Resumo:** ${operation.summary}\n\n`;
      }
      
      if (operation.description) {
        markdown += `**Descrição:** ${operation.description}\n\n`;
      }
      
      // Tags
      if (operation.tags && operation.tags.length > 0) {
        markdown += `**Tags:** ${operation.tags.join(', ')}\n\n`;
      }
      
      // Parameters
      if (operation.parameters && operation.parameters.length > 0) {
        markdown += `#### Parâmetros\n\n`;
        markdown += `| Nome | Tipo | Obrigatório | Descrição |\n`;
        markdown += `|------|------|-------------|------------|\n`;
        
        operation.parameters.forEach(param => {
          const required = param.required ? 'Sim' : 'Não';
          const type = param.schema?.type || param.type || 'N/A';
          const description = param.description || '';
          markdown += `| ${param.name} | ${type} | ${required} | ${description} |\n`;
        });
        markdown += `\n`;
      }
      
      // Request Body
      if (operation.requestBody) {
        markdown += `#### Request Body\n\n`;
        const content = operation.requestBody.content;
        
        if (content) {
          Object.keys(content).forEach(contentType => {
            markdown += `**Content-Type:** \`${contentType}\`\n\n`;
            
            const schema = content[contentType].schema;
            if (schema) {
              markdown += `**Schema:**\n\n`;
              markdown += '```json\n';
              markdown += JSON.stringify(schema, null, 2);
              markdown += '\n```\n\n';
            }
            
            if (content[contentType].example) {
              markdown += `**Exemplo:**\n\n`;
              markdown += '```json\n';
              markdown += JSON.stringify(content[contentType].example, null, 2);
              markdown += '\n```\n\n';
            }
          });
        }
      }
      
      // Responses
      if (operation.responses) {
        markdown += `#### Respostas\n\n`;
        
        Object.keys(operation.responses).forEach(status => {
          const response = operation.responses[status];
          markdown += `**${status}** - ${response.description || ''}\n\n`;
          
          if (response.content) {
            Object.keys(response.content).forEach(contentType => {
              const schema = response.content[contentType].schema;
              
              if (schema) {
                markdown += '```json\n';
                markdown += JSON.stringify(schema, null, 2);
                markdown += '\n```\n\n';
              }
              
              if (response.content[contentType].example) {
                markdown += `**Exemplo:**\n\n`;
                markdown += '```json\n';
                markdown += JSON.stringify(response.content[contentType].example, null, 2);
                markdown += '\n```\n\n';
              }
            });
          }
        });
      }
      
      markdown += `---\n\n`;
    });
  });
  
  // Schemas (se existirem)
  if (data.components && data.components.schemas) {
    markdown += `## 📦 Schemas\n\n`;
    
    Object.keys(data.components.schemas).forEach(schemaName => {
      const schema = data.components.schemas[schemaName];
      markdown += `### ${schemaName}\n\n`;
      
      if (schema.description) {
        markdown += `${schema.description}\n\n`;
      }
      
      markdown += '```json\n';
      markdown += JSON.stringify(schema, null, 2);
      markdown += '\n```\n\n';
      markdown += `---\n\n`;
    });
  }
  
  return markdown;
}

async function main() {
  console.log('🔍 Procurando documentação da UazAPI...\n');
  
  for (const url of possibleSpecs) {
    console.log(`   Tentando: ${url}`);
    const result = await fetchUrl(url);
    
    if (result.success) {
      console.log(`   ✅ Encontrado!\n`);
      
      try {
        const markdown = convertOpenAPIToMarkdown(result.data);
        fs.writeFileSync('UazAPI-docs.md', markdown);
        
        console.log('✅ Documentação salva em: UazAPI-docs.md');
        console.log(`📄 Total de caracteres: ${markdown.length}`);
        return;
      } catch (error) {
        console.log(`   ⚠️  Erro ao processar: ${error.message}`);
      }
    } else {
      console.log(`   ❌ Não encontrado (${result.status || result.error})`);
    }
  }
  
  console.log('\n❌ Não foi possível encontrar o spec OpenAPI.');
  console.log('📝 A API pode não expor o spec publicamente.');
  console.log('\n💡 Alternativas:');
  console.log('   1. Contate o suporte da UazAPI para obter a documentação');
  console.log('   2. Use as ferramentas de desenvolvedor do navegador para ver as requisições');
  console.log('   3. Verifique se há um portal de desenvolvedores com a documentação');
}

main().catch(console.error);
