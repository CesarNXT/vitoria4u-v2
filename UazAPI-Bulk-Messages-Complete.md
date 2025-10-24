# UazAPI - Mensagem em Massa (Bulk Messages)

Documentação extraída em: 24/10/2025, 12:32:26

---

## 📑 Índice

1. [POST /sender/simple - Enviar mensagem simples em massa](#endpoint-1)
2. [POST /sender/advanced - Enviar mensagem avançada em massa](#endpoint-2)
3. [POST /sender/edit - Editar mensagem em massa](#endpoint-3)
4. [POST /sender/cleardone - Limpar mensagens concluídas](#endpoint-4)
5. [DELETE /sender/clearall - Limpar todas as mensagens](#endpoint-5)
6. [GET /sender/listfolders - Listar pastas](#endpoint-6)
7. [POST /sender/listmessages - Listar mensagens](#endpoint-7)

---

## Endpoint 1

### POST /sender/simple - Enviar mensagem simples em massa

**URL:** https://docs.uazapi.com/endpoint/post/sender~simple

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
Criar nova campanha (Simples)
POST
Criar envio em massa avançado
POST
Controlar campanha de envio em massa
POST
Limpar mensagens enviadas
POST
Limpar toda fila de mensagens
DELETE
Listar campanhas de envio
GET
Listar mensagens de uma campanha
POST
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
POST
/sender/simple
Criar nova campanha (Simples)

Cria uma nova campanha de envio com configurações básicas

Request
Body
numbers
array
required

Lista de números para envio

Example: ["5511999999999@s.whatsapp.net"]

type
string
required

Tipo da mensagem

delayMin
integer
required

Delay mínimo entre mensagens em segundos

Example: 10

delayMax
integer
required

Delay máximo entre mensagens em segundos

Example: 30

scheduled_for
integer
required

Timestamp em milissegundos ou minutos a partir de agora para agendamento

Example: 1706198400000

info
string

Informações adicionais sobre a campanha

delay
integer

Delay fixo entre mensagens (opcional)

mentions
string

Menções na mensagem em formato JSON

text
string

Texto da mensagem

linkPreview
boolean

Habilitar preview de links em mensagens de texto. O preview será gerado automaticamente a partir da URL contida no texto.

linkPreviewTitle
string

Título personalizado para o preview do link (opcional)

linkPreviewDescription
string

Descrição personalizada para o preview do link (opcional)

linkPreviewImage
string

URL ou dados base64 da imagem para o preview do link (opcional)

linkPreviewLarge
boolean

Se deve usar preview grande ou pequeno (opcional, padrão false)

file
string

URL da mídia ou arquivo (quando type é image, video, audio, document, etc.)

docName
string

Nome do arquivo (quando type é document)

fullName
string

Nome completo (quando type é contact)

phoneNumber
string

Número do telefone (quando type é contact)

organization
string

Organização (quando type é contact)

email
string

Email (quando type é contact)

url
string

URL (quando type é contact)

latitude
number

Latitude (quando type é location)

longitude
number

Longitude (quando type é location)

name
string

Nome do local (quando type é location)

address
string

Endereço (quando type é location)

footerText
string

Texto do rodapé (quando type é list, button, poll ou carousel)

buttonText
string

Texto do botão (quando type é list, button, poll ou carousel)

listButton
string

Texto do botão da lista (quando type é list)

selectableCount
integer

Quantidade de opções selecionáveis (quando type é poll)

choices
array

Lista de opções (quando type é list, button, poll ou carousel). Para carousel, use formato específico com [texto], {imagem} e botões

imageButton
string

URL da imagem para o botão (quando type é button)

Responses
200
campanha criada com sucesso
400
Erro nos parâmetros da requisição
401
Erro de autenticação
409
Conflito - campanha já existe
500
Erro interno do servidor
```

---

## Endpoint 2

### POST /sender/advanced - Enviar mensagem avançada em massa

**URL:** https://docs.uazapi.com/endpoint/post/sender~advanced

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
Criar nova campanha (Simples)
POST
Criar envio em massa avançado
POST
Controlar campanha de envio em massa
POST
Limpar mensagens enviadas
POST
Limpar toda fila de mensagens
DELETE
Listar campanhas de envio
GET
Listar mensagens de uma campanha
POST
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
POST
/sender/advanced
Criar envio em massa avançado

Cria um novo envio em massa com configurações avançadas, permitindo definir múltiplos destinatários e mensagens com delays personalizados.

Request
Body
delayMin
integer

Delay mínimo entre mensagens (segundos)

Example: 3

delayMax
integer

Delay máximo entre mensagens (segundos)

Example: 6

info
string

Descrição ou informação sobre o envio em massa

Example: "Campanha de lançamento"

scheduled_for
integer

Timestamp em milissegundos (date unix) ou minutos a partir de agora para agendamento

Example: 1

messages
array
required

Lista de mensagens a serem enviadas

Responses
200
Mensagens adicionadas à fila com sucesso
400
Erro nos parâmetros da requisição
401
Não autorizado - token inválido ou ausente
500
Erro interno do servidor
```

---

## Endpoint 3

### POST /sender/edit - Editar mensagem em massa

**URL:** https://docs.uazapi.com/endpoint/post/sender~edit

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
Criar nova campanha (Simples)
POST
Criar envio em massa avançado
POST
Controlar campanha de envio em massa
POST
Limpar mensagens enviadas
POST
Limpar toda fila de mensagens
DELETE
Listar campanhas de envio
GET
Listar mensagens de uma campanha
POST
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
POST
/sender/edit
Controlar campanha de envio em massa

Permite controlar campanhas de envio de mensagens em massa através de diferentes ações:

Ações Disponíveis:

🛑 stop - Pausar campanha

Pausa uma campanha ativa ou agendada
Altera o status para "paused"
Use quando quiser interromper temporariamente o envio
Mensagens já enviadas não são afetadas

▶️ continue - Continuar campanha

Retoma uma campanha pausada
Altera o status para "scheduled"
Use para continuar o envio após pausar uma campanha
Não funciona em campanhas já concluídas ("done")

🗑️ delete - Deletar campanha

Remove completamente a campanha
Deleta apenas mensagens NÃO ENVIADAS (status "scheduled")
Mensagens já enviadas são preservadas no histórico
Operação é executada de forma assíncrona
Status de Campanhas:
scheduled: Agendada para envio
sending: Enviando mensagens
paused: Pausada pelo usuário
done: Concluída (não pode ser alterada)
deleting: Sendo deletada (operação em andamento)
Request
Body
folder_id
string
required

Identificador único da campanha de envio

Example: "folder_123"

action
string
required

Ação a ser executada na campanha:

stop: Pausa a campanha (muda para status "paused")
continue: Retoma campanha pausada (muda para status "scheduled")
delete: Remove campanha e mensagens não enviadas (assíncrono)

Example: "stop"

Responses
200
Ação realizada com sucesso
400
Requisição inválida
```

---

## Endpoint 4

### POST /sender/cleardone - Limpar mensagens concluídas

**URL:** https://docs.uazapi.com/endpoint/post/sender~cleardone

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
Criar nova campanha (Simples)
POST
Criar envio em massa avançado
POST
Controlar campanha de envio em massa
POST
Limpar mensagens enviadas
POST
Limpar toda fila de mensagens
DELETE
Listar campanhas de envio
GET
Listar mensagens de uma campanha
POST
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
POST
/sender/cleardone
Limpar mensagens enviadas

Inicia processo de limpeza de mensagens antigas em lote que já foram enviadas com sucesso. Por padrão, remove mensagens mais antigas que 7 dias.

Request
Body
hours
integer

Quantidade de horas para manter mensagens. Mensagens mais antigas que esse valor serão removidas.

Example: 168

Responses
200
Limpeza iniciada com sucesso
```

---

## Endpoint 5

### DELETE /sender/clearall - Limpar todas as mensagens

**URL:** https://docs.uazapi.com/endpoint/delete/sender~clearall

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
Criar nova campanha (Simples)
POST
Criar envio em massa avançado
POST
Controlar campanha de envio em massa
POST
Limpar mensagens enviadas
POST
Limpar toda fila de mensagens
DELETE
Listar campanhas de envio
GET
Listar mensagens de uma campanha
POST
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
DELETE
/sender/clearall
Limpar toda fila de mensagens

Remove todas as mensagens da fila de envio em massa, incluindo mensagens pendentes e já enviadas. Esta é uma operação irreversível.

Responses
200
Fila de mensagens limpa com sucesso
401
Não autorizado - token inválido ou ausente
500
Erro interno do servidor
```

---

## Endpoint 6

### GET /sender/listfolders - Listar pastas

**URL:** https://docs.uazapi.com/endpoint/get/sender~listfolders

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
Criar nova campanha (Simples)
POST
Criar envio em massa avançado
POST
Controlar campanha de envio em massa
POST
Limpar mensagens enviadas
POST
Limpar toda fila de mensagens
DELETE
Listar campanhas de envio
GET
Listar mensagens de uma campanha
POST
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
GET
/sender/listfolders
Listar campanhas de envio

Retorna todas as campanhas de mensagens em massa com possibilidade de filtro por status

Parameters
Query Parameters
status
string

Filtrar campanhas por status

Responses
200
Lista de campanhas retornada com sucesso
500
Erro interno do servidor
```

---

## Endpoint 7

### POST /sender/listmessages - Listar mensagens

**URL:** https://docs.uazapi.com/endpoint/post/sender~listmessages

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
Criar nova campanha (Simples)
POST
Criar envio em massa avançado
POST
Controlar campanha de envio em massa
POST
Limpar mensagens enviadas
POST
Limpar toda fila de mensagens
DELETE
Listar campanhas de envio
GET
Listar mensagens de uma campanha
POST
Integração Chatwoot
2
ChatBot
9
SCHEMAS
15
POST
/sender/listmessages
Listar mensagens de uma campanha

Retorna a lista de mensagens de uma campanha específica, com opções de filtro por status e paginação

Request
Body
folder_id
string
required

ID da campanha a ser consultada

messageStatus
string

Status das mensagens para filtrar

page
integer

Número da página para paginação

pageSize
integer

Quantidade de itens por página

Responses
200
Lista de mensagens retornada com sucesso
400
Requisição inválida
500
Erro interno do servidor
```

---

