# UazAPI - Endpoints de Envio

Documentação extraída em: 24/10/2025, 13:02:17

---

## 📑 Índice

1. [POST /send/text - Enviar mensagem de texto](#endpoint-1)
2. [POST /send/media - Enviar mídia](#endpoint-2)
3. [POST /message/presence - Presença de mensagem](#endpoint-3)
4. [POST /send/status - Enviar status](#endpoint-4)
5. [POST /send/menu - Enviar menu](#endpoint-5)
6. [POST /send/location-button - Enviar botão de localização](#endpoint-6)
7. [POST /send/request-payment - Solicitar pagamento](#endpoint-7)
8. [POST /send/pix-button - Enviar botão PIX](#endpoint-8)

---

## Endpoint 1

### POST /send/text - Enviar mensagem de texto

**URL:** https://docs.uazapi.com/endpoint/post/send~text

```
uazapiGO V2

API Documentation

Overview
ENDPOINTS
91
Admininstração
5
Instancia
8
Perfil
2
Chamadas
2
Webhooks e SSE
3
Enviar Mensagem
11
Enviar mensagem de texto
POST
Enviar mídia (imagem, vídeo, áudio ou documento)
POST
Enviar cartão de contato (vCard)
POST
Enviar localização geográfica
POST
Enviar atualização de presença
POST
Enviar Stories (Status)
POST
Enviar menu interativo (botões, carrosel, lista ou enquete)
POST
Enviar carrossel de mídia com botões
POST
Solicitar localização do usuário
POST
Solicitar pagamento
POST
Enviar botão PIX
POST
Ações na mensagem e Buscar
6
Chats
6
Contatos
5
Bloqueios
2
Etiquetas
3
Grupos e Comunidades
16
Respostas Rápidas
2
CRM
2
Mensagem em massa
7
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
POST
/send/text
Enviar mensagem de texto

Envia uma mensagem de texto para um contato ou grupo.

Recursos Específicos
Preview de links com suporte a personalização automática ou customizada
Formatação básica do texto
Substituição automática de placeholders dinâmicos
Campos Comuns

Este endpoint suporta todos os campos opcionais comuns documentados na tag "Enviar Mensagem", incluindo: delay, readchat, readmessages, replyid, mentions, forward, track_source, track_id, placeholders e envio para grupos.

Preview de Links
Preview Automático
{
  "number": "5511999999999",
  "text": "Confira: https://exemplo.com",
  "linkPreview": true
}

Preview Personalizado
{
  "number": "5511999999999",
  "text": "Confira nosso site! https://exemplo.com",
  "linkPreview": true,
  "linkPreviewTitle": "Título Personalizado",
  "linkPreviewDescription": "Uma descrição personalizada do link",
  "linkPreviewImage": "https://exemplo.com/imagem.jpg",
  "linkPreviewLarge": true
}

Request
Body
number
string
required

Número do destinatário (formato internacional)

Example: "5511999999999"

text
string
required

Texto da mensagem (aceita placeholders)

Example: "Olá {{name}}! Como posso ajudar?"

linkPreview
boolean

Ativa/desativa preview de links. Se true, procura automaticamente um link no texto para gerar preview.

Comportamento:

Se apenas linkPreview=true: gera preview automático do primeiro link encontrado no texto
Se fornecidos campos personalizados (title, description, image): usa os valores fornecidos
Se campos personalizados parciais: combina com dados automáticos do link como fallback

Example: true

linkPreviewTitle
string

Define um título personalizado para o preview do link

Example: "Título Personalizado"

linkPreviewDescription
string

Define uma descrição personalizada para o preview do link

Example: "Descrição personalizada do link"

linkPreviewImage
string

URL ou Base64 da imagem para usar no preview do link

Example: "https://exemplo.com/imagem.jpg"

linkPreviewLarge
boolean

Se true, gera um preview grande com upload da imagem. Se false, gera um preview pequeno sem upload

Example: true

replyid
string

ID da mensagem para responder

Example: "3EB0538DA65A59F6D8A251"

mentions
string

Números para mencionar (separados por vírgula)

Example: "5511999999999,5511888888888"

readchat
boolean

Marca conversa como lida após envio

Example: true

readmessages
boolean

Marca últimas mensagens recebidas como lidas

Example: true

delay
integer

Atraso em milissegundos antes do envio, durante o atraso apacerá 'Digitando...'

Example: 1000

forward
boolean

Marca a mensagem como encaminhada no WhatsApp

Example: true

track_source
string

Origem do rastreamento da mensagem

Example: "chatwoot"

track_id
string

ID para rastreamento da mensagem (aceita valores duplicados)

Example: "msg_123456789"

Responses
200
Mensagem enviada com sucesso
400
Requisição inválida
401
Não autorizado
429
Limite de requisições excedido
500
Erro interno do servidor
```

---

## Endpoint 2

### POST /send/media - Enviar mídia

**URL:** https://docs.uazapi.com/endpoint/post/send~media

```
uazapiGO V2

API Documentation

Overview
ENDPOINTS
91
Admininstração
5
Instancia
8
Perfil
2
Chamadas
2
Webhooks e SSE
3
Enviar Mensagem
11
Enviar mensagem de texto
POST
Enviar mídia (imagem, vídeo, áudio ou documento)
POST
Enviar cartão de contato (vCard)
POST
Enviar localização geográfica
POST
Enviar atualização de presença
POST
Enviar Stories (Status)
POST
Enviar menu interativo (botões, carrosel, lista ou enquete)
POST
Enviar carrossel de mídia com botões
POST
Solicitar localização do usuário
POST
Solicitar pagamento
POST
Enviar botão PIX
POST
Ações na mensagem e Buscar
6
Chats
6
Contatos
5
Bloqueios
2
Etiquetas
3
Grupos e Comunidades
16
Respostas Rápidas
2
CRM
2
Mensagem em massa
7
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
POST
/send/media
Enviar mídia (imagem, vídeo, áudio ou documento)

Envia diferentes tipos de mídia para um contato ou grupo. Suporta URLs ou arquivos base64.

Tipos de Mídia Suportados
image: Imagens (JPG preferencialmente)
video: Vídeos (apenas MP4)
document: Documentos (PDF, DOCX, XLSX, etc)
audio: Áudio comum (MP3 ou OGG)
myaudio: Mensagem de voz (alternativa ao PTT)
ptt: Mensagem de voz (Push-to-Talk)
sticker: Figurinha/Sticker
Recursos Específicos
Upload por URL ou base64
Caption/legenda opcional com suporte a placeholders
Nome personalizado para documentos (docName)
Geração automática de thumbnails
Compressão otimizada conforme o tipo
Campos Comuns

Este endpoint suporta todos os campos opcionais comuns documentados na tag "Enviar Mensagem", incluindo: delay, readchat, readmessages, replyid, mentions, forward, track_source, track_id, placeholders e envio para grupos.

Exemplos Básicos
Imagem Simples
{
  "number": "5511999999999",
  "type": "image",
  "file": "https://exemplo.com/foto.jpg"
}

Documento com Nome
{
  "number": "5511999999999",
  "type": "document",
  "file": "https://exemplo.com/contrato.pdf",
  "docName": "Contrato.pdf",
  "text": "Segue o documento solicitado"
}

Request
Body
number
string
required

Número do destinatário (formato internacional)

Example: "5511999999999"

type
string
required

Tipo de mídia (image, video, document, audio, myaudio, ptt, sticker)

Example: "image"

file
string
required

URL ou base64 do arquivo

Example: "https://exemplo.com/imagem.jpg"

text
string

Texto descritivo (caption) - aceita placeholders

Example: "Veja esta foto!"

docName
string

Nome do arquivo (apenas para documents)

Example: "relatorio.pdf"

replyid
string

ID da mensagem para responder

Example: "3EB0538DA65A59F6D8A251"

mentions
string

Números para mencionar (separados por vírgula)

Example: "5511999999999,5511888888888"

readchat
boolean

Marca conversa como lida após envio

Example: true

readmessages
boolean

Marca últimas mensagens recebidas como lidas

Example: true

delay
integer

Atraso em milissegundos antes do envio, durante o atraso apacerá 'Digitando...' ou 'Gravando áudio...'

Example: 1000

forward
boolean

Marca a mensagem como encaminhada no WhatsApp

Example: true

track_source
string

Origem do rastreamento da mensagem

Example: "chatwoot"

track_id
string

ID para rastreamento da mensagem (aceita valores duplicados)

Example: "msg_123456789"

Responses
200
Mídia enviada com sucesso
400
Requisição inválida
401
Não autorizado
413
Arquivo muito grande
415
Formato de mídia não suportado
500
Erro interno do servidor
```

---

## Endpoint 3

### POST /message/presence - Presença de mensagem

**URL:** https://docs.uazapi.com/endpoint/post/message~presence

```
uazapiGO V2

API Documentation

Overview
ENDPOINTS
91
Admininstração
5
Instancia
8
Perfil
2
Chamadas
2
Webhooks e SSE
3
Enviar Mensagem
11
Enviar mensagem de texto
POST
Enviar mídia (imagem, vídeo, áudio ou documento)
POST
Enviar cartão de contato (vCard)
POST
Enviar localização geográfica
POST
Enviar atualização de presença
POST
Enviar Stories (Status)
POST
Enviar menu interativo (botões, carrosel, lista ou enquete)
POST
Enviar carrossel de mídia com botões
POST
Solicitar localização do usuário
POST
Solicitar pagamento
POST
Enviar botão PIX
POST
Ações na mensagem e Buscar
6
Chats
6
Contatos
5
Bloqueios
2
Etiquetas
3
Grupos e Comunidades
16
Respostas Rápidas
2
CRM
2
Mensagem em massa
7
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
POST
/message/presence
Enviar atualização de presença

Envia uma atualização de presença para um contato ou grupo de forma assíncrona.

🔄 Comportamento Assíncrono:
Execução independente: A presença é gerenciada em background, não bloqueia o retorno da API
Limite máximo: 5 minutos de duração (300 segundos)
Tick de atualização: Reenvia a presença a cada 10 segundos
Cancelamento automático: Presença é cancelada automaticamente ao enviar uma mensagem para o mesmo chat
📱 Tipos de presença suportados:
composing: Indica que você está digitando uma mensagem
recording: Indica que você está gravando um áudio
paused: Remove/cancela a indicação de presença atual
⏱️ Controle de duração:
Sem delay: Usa limite padrão de 5 minutos
Com delay: Usa o valor especificado (máximo 5 minutos)
Cancelamento: Envio de mensagem cancela presença automaticamente
📋 Exemplos de uso:
Digitar por 30 segundos:
{
  "number": "5511999999999",
  "presence": "composing",
  "delay": 30000
}

Gravar áudio por 1 minuto:
{
  "number": "5511999999999",
  "presence": "recording",
  "delay": 60000
}

Cancelar presença atual:
{
  "number": "5511999999999",
  "presence": "paused"
}

Usar limite máximo (5 minutos):
{
  "number": "5511999999999",
  "presence": "composing"
}

Request
Body
number
string
required

Número do destinatário no formato internacional (ex: 5511999999999)

Example: "5511999999999"

presence
string
required

Tipo de presença a ser enviada

Example: "composing"

delay
integer

Duração em milissegundos que a presença ficará ativa (máximo 5 minutos = 300000ms). Se não informado ou valor maior que 5 minutos, usa o limite padrão de 5 minutos. A presença é reenviada a cada 10 segundos durante este período.

Example: 30000

Responses
200
Presença atualizada com sucesso
400
Requisição inválida
401
Token inválido ou expirado
500
Erro interno do servidor
```

---

## Endpoint 4

### POST /send/status - Enviar status

**URL:** https://docs.uazapi.com/endpoint/post/send~status

```
uazapiGO V2

API Documentation

Overview
ENDPOINTS
91
Admininstração
5
Instancia
8
Perfil
2
Chamadas
2
Webhooks e SSE
3
Enviar Mensagem
11
Enviar mensagem de texto
POST
Enviar mídia (imagem, vídeo, áudio ou documento)
POST
Enviar cartão de contato (vCard)
POST
Enviar localização geográfica
POST
Enviar atualização de presença
POST
Enviar Stories (Status)
POST
Enviar menu interativo (botões, carrosel, lista ou enquete)
POST
Enviar carrossel de mídia com botões
POST
Solicitar localização do usuário
POST
Solicitar pagamento
POST
Enviar botão PIX
POST
Ações na mensagem e Buscar
6
Chats
6
Contatos
5
Bloqueios
2
Etiquetas
3
Grupos e Comunidades
16
Respostas Rápidas
2
CRM
2
Mensagem em massa
7
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
POST
/send/status
Enviar Stories (Status)

Envia um story (status) com suporte para texto, imagem, vídeo e áudio.

Suporte a campos de rastreamento: Este endpoint também suporta track_source e track_id documentados na tag "Enviar Mensagem".

Tipos de Status
text: Texto com estilo e cor de fundo
image: Imagens com legenda opcional
video: Vídeos com thumbnail e legenda
audio: Áudio normal ou mensagem de voz (PTT)
Cores de Fundo
1-3: Tons de amarelo
4-6: Tons de verde
7-9: Tons de azul
10-12: Tons de lilás
13: Magenta
14-15: Tons de rosa
16: Marrom claro
17-19: Tons de cinza (19 é o padrão)
Fontes (para texto)
0: Padrão
1-8: Estilos alternativos
Limites
Texto: Máximo 656 caracteres
Imagem: JPG, PNG, GIF
Vídeo: MP4, MOV
Áudio: MP3, OGG, WAV (convertido para OGG/OPUS)
Exemplo
{
  "type": "text",
  "text": "Novidades chegando!",
  "background_color": 7,
  "font": 1
}

Request
Body
type
string
required

Tipo do status

Example: "text"

text
string

Texto principal ou legenda

Example: "Novidades chegando!"

background_color
integer

Código da cor de fundo

Example: 7

font
integer

Estilo da fonte (apenas para type=text)

Example: 1

file
string

URL ou Base64 do arquivo de mídia

Example: "https://example.com/video.mp4"

thumbnail
string

URL ou Base64 da miniatura (opcional para vídeos)

Example: "https://example.com/thumb.jpg"

mimetype
string

MIME type do arquivo (opcional)

Example: "video/mp4"

track_source
string

Origem do rastreamento da mensagem

Example: "chatwoot"

track_id
string

ID para rastreamento da mensagem (aceita valores duplicados)

Example: "msg_123456789"

Responses
200
Status enviado com sucesso
400
Requisição inválida
401
Não autorizado
500
Erro interno do servidor
```

---

## Endpoint 5

### POST /send/menu - Enviar menu

**URL:** https://docs.uazapi.com/endpoint/post/send~menu

```
uazapiGO V2

API Documentation

Overview
ENDPOINTS
91
Admininstração
5
Instancia
8
Perfil
2
Chamadas
2
Webhooks e SSE
3
Enviar Mensagem
11
Enviar mensagem de texto
POST
Enviar mídia (imagem, vídeo, áudio ou documento)
POST
Enviar cartão de contato (vCard)
POST
Enviar localização geográfica
POST
Enviar atualização de presença
POST
Enviar Stories (Status)
POST
Enviar menu interativo (botões, carrosel, lista ou enquete)
POST
Enviar carrossel de mídia com botões
POST
Solicitar localização do usuário
POST
Solicitar pagamento
POST
Enviar botão PIX
POST
Ações na mensagem e Buscar
6
Chats
6
Contatos
5
Bloqueios
2
Etiquetas
3
Grupos e Comunidades
16
Respostas Rápidas
2
CRM
2
Mensagem em massa
7
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
POST
/send/menu
Enviar menu interativo (botões, carrosel, lista ou enquete)

Este endpoint oferece uma interface unificada para envio de quatro tipos principais de mensagens interativas:

Botões: Para ações rápidas e diretas
Carrosel de Botões: Para uma lista horizontal de botões com imagens
Listas: Para menus organizados em seções
Enquetes: Para coleta de opiniões e votações

Suporte a campos de rastreamento: Este endpoint também suporta track_source e track_id documentados na tag "Enviar Mensagem".

Estrutura Base do Payload

Todas as requisições seguem esta estrutura base:

{
  "number": "5511999999999",
  "type": "button|list|poll|carousel",
  "text": "Texto principal da mensagem",
  "choices": ["opções baseadas no tipo escolhido"],
  "footerText": "Texto do rodapé (opcional para botões e listas)",
  "listButton": "Texto do botão (para listas)",
  "selectableCount": "Número de opções selecionáveis (apenas para enquetes)"
}

Tipos de Mensagens Interativas
1. Botões (type: "button")

Cria botões interativos com diferentes funcionalidades de ação.

Campos Específicos
footerText: Texto opcional exibido abaixo da mensagem principal
choices: Array de opções que serão convertidas em botões
Formatos de Botões

Cada botão pode ser configurado usando | (pipe) ou \n (quebra de linha) como separadores:

Botão de Resposta:

"texto|id" ou
"texto\nid" ou
"texto" (ID será igual ao texto)

Botão de Cópia:

"texto|copy:código" ou
"texto\ncopy:código"

Botão de Chamada:

"texto|call:+5511999999999" ou
"texto\ncall:+5511999999999"

Botão de URL:

"texto|https://exemplo.com" ou
"texto|url:https://exemplo.com"
Botões com Imagem

Para adicionar uma imagem aos botões, use o campo imageButton no payload:

Exemplo com Imagem
{
  "number": "5511999999999",
  "type": "button",
  "text": "Escolha um produto:",
  "imageButton": "https://exemplo.com/produto1.jpg",
  "choices": [
    "Produto A|prod_a",
    "Mais Info|https://exemplo.com/produto-a",
    "Produto B|prod_b",
    "Ligar|call:+5511999999999"
  ],
  "footerText": "Produtos em destaque"
}


Suporte: O campo imageButton aceita URLs ou imagens em base64.

Exemplo Completo
{
  "number": "5511999999999",
  "type": "button",
  "text": "Como podemos ajudar?",
  "choices": [
    "Suporte Técnico|suporte",
    "Fazer Pedido|pedido",
    "Nosso Site|https://exemplo.com",
    "Falar Conosco|call:+5511999999999"
  ],
  "footerText": "Escolha uma das opções abaixo"
}

Limitações e Compatibilidade

Importante: Ao combinar botões de resposta com outros tipos (call, url, copy) na mesma mensagem, será exibido o aviso: "Não é possível exibir esta mensagem no WhatsApp Web. Abra o WhatsApp no seu celular para visualizá-la."

2. Listas (type: "list")

Cria menus organizados em seções com itens selecionáveis.

Campos Específicos
listButton: Texto do botão que abre a lista
footerText: Texto opcional do rodapé
choices: Array com seções e itens da lista
Formato das Choices
"[Título da Seção]": Inicia uma nova seção
"texto|id|descrição": Item da lista com:
texto: Label do item
id: Identificador único, opcional
descrição: Texto descritivo adicional e opcional
Exemplo Completo
{
  "number": "5511999999999",
  "type": "list",
  "text": "Catálogo de Produtos",
  "choices": [
    "[Eletrônicos]",
    "Smartphones|phones|Últimos lançamentos",
    "Notebooks|notes|Modelos 2024",
    "[Acessórios]",
    "Fones|fones|Bluetooth e com fio",
    "Capas|cases|Proteção para seu device"
  ],
  "listButton": "Ver Catálogo",
  "footerText": "Preços sujeitos a alteração"
}

3. Enquetes (type: "poll")

Cria enquetes interativas para votação.

Campos Específicos
selectableCount: Número de opções que podem ser selecionadas (padrão: 1)
choices: Array simples com as opções de voto
Exemplo Completo
{
  "number": "5511999999999",
  "type": "poll",
  "text": "Qual horário prefere para atendimento?",
  "choices": [
    "Manhã (8h-12h)",
    "Tarde (13h-17h)",
    "Noite (18h-22h)"
  ],
  "selectableCount": 1
}

4. Carousel (type: "carousel")

Cria um carrossel de cartões com imagens e botões interativos.

Campos Específicos
choices: Array com elementos do carrossel na seguinte ordem:
[Texto do cartão]: Texto do cartão entre colchetes
{URL ou base64 da imagem}: Imagem entre chaves
Botões do cartão (um por linha):
"texto|copy:código" para botão de copiar
"texto|https://url" para botão de link
"texto|call:+número" para botão de ligação
Exemplo Completo
{
  "number": "5511999999999",
  "type": "carousel",
  "text": "Conheça nossos produtos",
  "choices": [
    "[Smartphone XYZ\nO mais avançado smartphone da linha]",
    "{https://exemplo.com/produto1.jpg}",
    "Copiar Código|copy:PROD123",
    "Ver no Site|https://exemplo.com/xyz",
    "Fale Conosco|call:+5511999999999",
    "[Notebook ABC\nO notebook ideal para profissionais]",
    "{https://exemplo.com/produto2.jpg}",
    "Copiar Código|copy:NOTE456",
    "Comprar Online|https://exemplo.com/abc",
    "Suporte|call:+5511988888888"
  ]
}


Nota: Criamos outro endpoint para carrossel: /send/carousel, funciona da mesma forma, mas com outro formato de payload. Veja o que é mais fácil para você.

Termos de uso

Os recursos de botões interativos e listas podem ser descontinuados a qualquer momento sem aviso prévio. Não nos responsabilizamos por quaisquer alterações ou indisponibilidade destes recursos.

Alternativas e Compatibilidade

Considerando a natureza dinâmica destes recursos, nosso endpoint foi projetado para facilitar a migração entre diferentes tipos de mensagens (botões, listas e enquetes).

Recomendamos criar seus fluxos de forma flexível, preparados para alternar entre os diferentes tipos.

Em caso de descontinuidade de algum recurso, você poderá facilmente migrar para outro tipo de mensagem apenas alterando o campo "type" no payload, mantendo a mesma estrutura de choices.

Request
Body
number
string
required

Número do destinatário (formato internacional)

Example: "5511999999999"

type
string
required

Tipo do menu (button, list, poll, carousel)

Example: "list"

text
string
required

Texto principal (aceita placeholders)

Example: "Escolha uma opção:"

footerText
string

Texto do rodapé (opcional)

Example: "Menu de serviços"

listButton
string

Texto do botão principal

Example: "Ver opções"

selectableCount
integer

Número máximo de opções selecionáveis (para enquetes)

Example: 1

choices
array
required

Lista de opções. Use [Título] para seções em listas

Example: ["[Eletrônicos]","Smartphones|phones|Últimos lançamentos","Notebooks|notes|Modelos 2024","[Acessórios]","Fones|fones|Bluetooth e com fio","Capas|cases|Proteção para seu device"]

imageButton
string

URL da imagem para botões (recomendado para type: button)

Example: "https://exemplo.com/imagem-botao.jpg"

replyid
string

ID da mensagem para responder

Example: "3EB0538DA65A59F6D8A251"

mentions
string

Números para mencionar (separados por vírgula)

Example: "5511999999999,5511888888888"

readchat
boolean

Marca conversa como lida após envio

Example: true

readmessages
boolean

Marca últimas mensagens recebidas como lidas

Example: true

delay
integer

Atraso em milissegundos antes do envio, durante o atraso apacerá 'Digitando...'

Example: 1000

track_source
string

Origem do rastreamento da mensagem

Example: "chatwoot"

track_id
string

ID para rastreamento da mensagem (aceita valores duplicados)

Example: "msg_123456789"

Responses
200
Menu enviado com sucesso
400
Requisição inválida
401
Não autorizado
429
Limite de requisições excedido
500
Erro interno do servidor
```

---

## Endpoint 6

### POST /send/location-button - Enviar botão de localização

**URL:** https://docs.uazapi.com/endpoint/post/send~location-button

```
uazapiGO V2

API Documentation

Overview
ENDPOINTS
91
Admininstração
5
Instancia
8
Perfil
2
Chamadas
2
Webhooks e SSE
3
Enviar Mensagem
11
Enviar mensagem de texto
POST
Enviar mídia (imagem, vídeo, áudio ou documento)
POST
Enviar cartão de contato (vCard)
POST
Enviar localização geográfica
POST
Enviar atualização de presença
POST
Enviar Stories (Status)
POST
Enviar menu interativo (botões, carrosel, lista ou enquete)
POST
Enviar carrossel de mídia com botões
POST
Solicitar localização do usuário
POST
Solicitar pagamento
POST
Enviar botão PIX
POST
Ações na mensagem e Buscar
6
Chats
6
Contatos
5
Bloqueios
2
Etiquetas
3
Grupos e Comunidades
16
Respostas Rápidas
2
CRM
2
Mensagem em massa
7
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
POST
/send/location-button
Solicitar localização do usuário

Este endpoint envia uma mensagem com um botão que solicita a localização do usuário. Quando o usuário clica no botão, o WhatsApp abre a interface para compartilhar a localização atual.

Campos Comuns

Este endpoint suporta todos os campos opcionais comuns documentados na tag "Enviar Mensagem", incluindo: delay, readchat, readmessages, replyid, mentions, forward, track_source, track_id, placeholders e envio para grupos.

Estrutura do Payload
{
  "number": "5511999999999",
  "text": "Por favor, compartilhe sua localização",
  "delay": 0,
  "readchat": true
}

Exemplo de Uso
{
  "number": "5511999999999",
  "text": "Para continuar o atendimento, clique no botão abaixo e compartilhe sua localização"
}


Nota: O botão de localização é adicionado automaticamente à mensagem

Request
Body
number
string
required

Número do destinatário (formato internacional)

Example: "5511999999999"

text
string
required

Texto da mensagem que será exibida

Example: "Por favor, compartilhe sua localização"

delay
integer

Atraso em milissegundos antes do envio

0
readchat
boolean

Se deve marcar a conversa como lida após envio

Example: true

track_source
string

Origem do rastreamento da mensagem

Example: "chatwoot"

track_id
string

ID para rastreamento da mensagem (aceita valores duplicados)

Example: "msg_123456789"

Responses
200
Localização enviada com sucesso
400
Requisição inválida
401
Não autorizado
500
Erro interno do servidor
```

---

## Endpoint 7

### POST /send/request-payment - Solicitar pagamento

**URL:** https://docs.uazapi.com/endpoint/post/send~request-payment

```
uazapiGO V2

API Documentation

Overview
ENDPOINTS
91
Admininstração
5
Instancia
8
Perfil
2
Chamadas
2
Webhooks e SSE
3
Enviar Mensagem
11
Enviar mensagem de texto
POST
Enviar mídia (imagem, vídeo, áudio ou documento)
POST
Enviar cartão de contato (vCard)
POST
Enviar localização geográfica
POST
Enviar atualização de presença
POST
Enviar Stories (Status)
POST
Enviar menu interativo (botões, carrosel, lista ou enquete)
POST
Enviar carrossel de mídia com botões
POST
Solicitar localização do usuário
POST
Solicitar pagamento
POST
Enviar botão PIX
POST
Ações na mensagem e Buscar
6
Chats
6
Contatos
5
Bloqueios
2
Etiquetas
3
Grupos e Comunidades
16
Respostas Rápidas
2
CRM
2
Mensagem em massa
7
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
POST
/send/request-payment
Solicitar pagamento

Envia uma solicitação de pagamento com o botão nativo "Revisar e pagar" do WhatsApp. O fluxo suporta PIX (estático, dinâmico ou desabilitado), boleto, link de pagamento e cartão, combinando tudo em uma única mensagem interativa.

Como funciona
Define o valor em amount (BRL por padrão) e opcionalmente personaliza título, texto e nota adicional.
Por padrão exige pixKey.
O arquivo apontado por fileUrl é anexado como documento (boleto ou fatura em PDF, por exemplo).
paymentLink habilita o botão externo.
Links suportados (paymentLink)

O WhatsApp apenas aceita URLs de provedores homologados. Utilize os padrões abaixo:

Mercado Pago: mpago.la/*, mpago.li/*, mercadopago.com.br/*
PicPay: picpay.me/*, link.picpay.com/*, app.picpay.com/user/*
Stone: payment-link.stone.com.br/*
Cielo: cielolink.com.br/*, cielo.mystore.com.br/*
Getnet: pag.getnet.com.br/*
Rede: userede.com.br/pagamentos/*
SumUp: pay.sumup.com/b2c/*
Pagar.me: payment-link.pagar.me/*
TON: payment-link.ton.com.br/*
PagBank: sacola.pagbank.com.br/*, pag.ae/*
Nubank: nubank.com.br/cobrar/*, checkout.nubank.com.br/*
InfinitePay: pay.infinitepay.io/*
VTEX: *.vtexpayments.com/*, *.myvtex.com/*
EBANX: payment.ebanx.com/*
Asaas: asaas.com/*
Vindi: pagar.vindi.com.br/*
Adyen: eu.adyen.link/*
EFI (Gerencianet): sejaefi.link/*, pagamento.sejaefi.com.br/*
SafraPay: portal.safrapay.com.br/*, safrapay.aditum.com.br/*
Stripe: buy.stripe.com/*
Hotmart: pay.hotmart.com/*
Campos comuns

Este endpoint também suporta os campos padrão: delay, readchat, readmessages, replyid, mentions, track_source, track_id e async.

Request
Body
number
string
required

Número do destinatário (DDD + número, formato internacional)

Example: "5511999999999"

title
string

Título que aparece no cabeçalho do fluxo

Example: "Detalhes do pedido"

text
string

Mensagem exibida no corpo do fluxo

Example: "Pedido #123 pronto para pagamento"

footer
string

Texto do rodapé da mensagem

Example: "Loja Exemplo"

itemName
string

Nome do item principal listado no fluxo

Example: "Assinatura Plano Ouro"

invoiceNumber
string

Identificador ou número da fatura

Example: "PED-123"

amount
number
required

Valor da cobrança (em BRL por padrão)

Example: 199.9

pixKey
string

Chave PIX estático (CPF/CNPJ/telefone/email/EVP)

Example: "123e4567-e89b-12d3-a456-426614174000"

pixType
string

Tipo da chave PIX (CPF, CNPJ, PHONE, EMAIL, EVP). Padrão EVP

Example: "EVP"

pixName
string

Nome do recebedor exibido no fluxo (padrão usa o nome do perfil da instância)

Example: "Loja Exemplo"

paymentLink
string

URL externa para checkout (somente dominios homologados; veja lista acima)

Example: "https://pagamentos.exemplo.com/checkout/abc"

fileUrl
string

URL ou caminho (base64) do documento a ser anexado (ex.: boleto PDF)

Example: "https://cdn.exemplo.com/boleto-123.pdf"

fileName
string

Nome do arquivo exibido no WhatsApp ao anexar fileUrl

Example: "boleto-123.pdf"

boletoCode
string

Linha digitável do boleto (habilita o método boleto automaticamente)

Example: "34191.79001 01043.510047 91020.150008 5 91070026000"

replyid
string

ID da mensagem que será respondida

mentions
string

Números mencionados separados por vírgula

delay
integer

Atraso em milissegundos antes do envio (exibe "digitando..." no WhatsApp)

readchat
boolean

Marca o chat como lido após enviar a mensagem

readmessages
boolean

Marca mensagens recentes como lidas após o envio

async
boolean

Enfileira o envio para processamento assíncrono

track_source
string

Origem de rastreamento (ex.: chatwoot, crm-interno)

track_id
string

Identificador de rastreamento (aceita valores duplicados)

Responses
200
Solicitação de pagamento enviada com sucesso
400
Requisição inválida
401
Não autorizado
500
Erro interno do servidor
```

---

## Endpoint 8

### POST /send/pix-button - Enviar botão PIX

**URL:** https://docs.uazapi.com/endpoint/post/send~pix-button

```
uazapiGO V2

API Documentation

Overview
ENDPOINTS
91
Admininstração
5
Instancia
8
Perfil
2
Chamadas
2
Webhooks e SSE
3
Enviar Mensagem
11
Enviar mensagem de texto
POST
Enviar mídia (imagem, vídeo, áudio ou documento)
POST
Enviar cartão de contato (vCard)
POST
Enviar localização geográfica
POST
Enviar atualização de presença
POST
Enviar Stories (Status)
POST
Enviar menu interativo (botões, carrosel, lista ou enquete)
POST
Enviar carrossel de mídia com botões
POST
Solicitar localização do usuário
POST
Solicitar pagamento
POST
Enviar botão PIX
POST
Ações na mensagem e Buscar
6
Chats
6
Contatos
5
Bloqueios
2
Etiquetas
3
Grupos e Comunidades
16
Respostas Rápidas
2
CRM
2
Mensagem em massa
7
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
POST
/send/pix-button
Enviar botão PIX

Envia um botão nativo do WhatsApp que abre para pagamento PIX com a chave informada. O usuário visualiza o detalhe do recebedor, nome e chave.

Regras principais
pixType aceita: CPF, CNPJ, PHONE, EMAIL, EVP (case insensitive)
pixName padrão: "Pix" quando não informado - nome de quem recebe o pagamento
Campos comuns

Este endpoint herda os campos opcionais padronizados da tag "Enviar Mensagem": delay, readchat, readmessages, replyid, mentions, track_source, track_id e async.

Exemplo de payload
{
  "number": "5511999999999",
  "pixType": "EVP",
  "pixKey": "123e4567-e89b-12d3-a456-426614174000",
  "pixName": "Loja Exemplo"
}

Request
Body
number
string
required

Número do destinatário (DDD + número, formato internacional)

Example: "5511999999999"

pixType
string
required

Tipo da chave PIX. Valores aceitos: CPF, CNPJ, PHONE, EMAIL ou EVP

Example: "EVP"

pixKey
string
required

Valor da chave PIX (CPF/CNPJ/telefone/email/EVP)

Example: "123e4567-e89b-12d3-a456-426614174000"

pixName
string

Nome exibido como recebedor do PIX (padrão "Pix" se vazio)

Example: "Loja Exemplo"

async
boolean

Enfileira o envio para processamento assíncrono

delay
integer

Atraso em milissegundos antes do envio (exibe "digitando..." no WhatsApp)

readchat
boolean

Marca o chat como lido após enviar a mensagem

readmessages
boolean

Marca mensagens recentes como lidas após o envio

replyid
string

ID da mensagem que será respondida

mentions
string

Lista de números mencionados separados por vírgula

track_source
string

Origem de rastreamento (ex.: chatwoot, crm-interno)

track_id
string

Identificador de rastreamento (aceita valores duplicados)

Responses
200
Botão PIX enviado com sucesso
400
Requisição inválida
401
Não autorizado
500
Erro interno do servidor
```

---

