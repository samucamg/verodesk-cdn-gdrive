# VeroDesk Serverless CDN on Google Drive

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/Cloudflare-D1-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Google Drive](https://img.shields.io/badge/Google%20Drive-API%20v3-4285F4?style=flat-square&logo=google-drive&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/verodesk-cdn-gdrive)

> 🚀 Um gerenciador de arquivos serverless, executado na borda e pronto para CDN. O VeroDesk Serverless CDN Orchestrator usa um único Cloudflare Worker para entregar o painel web, expor a API administrativa, registrar metadados no Cloudflare D1 e armazenar arquivos no Google Drive via OAuth 2.0.

## Índice

- [Visão geral](#visão-geral)
- [Principais recursos](#principais-recursos)
- [Arquitetura](#arquitetura)
- [Deploy em um clique](#deploy-em-um-clique)
- [Campos do assistente](#campos-do-assistente)
- [Primeiro acesso](#primeiro-acesso)
- [Autenticação e segurança](#autenticação-e-segurança)
- [API](#api)
- [Domínio personalizado](#domínio-personalizado)
- [Desenvolvimento local](#desenvolvimento-local-opcional)
- [Diagnóstico](#diagnóstico)

---

## Visão geral

O **VeroDesk Serverless CDN Orchestrator** transforma o Google Drive em uma origem administrável para imagens, documentos, áudio e vídeo. O projeto foi criado para quem quer publicar e organizar assets por uma interface web, sem expor credenciais do Google no navegador.

O usuário faz upload pelo painel. O Worker valida o arquivo e a autenticação, inicia uma sessão resumable no Google Drive e envia o conteúdo em partes, registrando os metadados no D1 após a conclusão. Os arquivos são entregues por seu próprio endpoint de borda ou, opcionalmente, por um domínio próprio de CDN.

> 💡 A interface estática e a API são servidas pelo **mesmo Worker**. Não existe Cloudflare Pages, `WORKER_API_URL`, segundo deploy ou etapa de copiar URL entre projetos.

## Interface do sistema

O VeroDesk reúne o gerenciamento de arquivos e a distribuição por CDN em um painel único. A dashboard oferece visão rápida do volume armazenado, total de arquivos, categorias e uma galeria para consultar os assets publicados.

Ao abrir um arquivo na galeria, o sistema disponibiliza o link de entrega pelo próprio Worker e, quando configurado, pelo domínio personalizado. Imagens, vídeos e áudios compatíveis podem ser visualizados no modal com players nativos HTML5; o painel também permite copiar um embed responsivo adequado ao tipo de arquivo.

![Dashboard do CDN Manager com indicador de conexão do Drive, atalhos para upload e galeria](https://cdn.jsdelivr.net/gh/samucamg/imagens/Outros/2026/08/dashboard_cdn_manager_1787536451.jpg)

![Página de upload do CDN Uploader com seleção de categoria ou projeto](https://cdn.jsdelivr.net/gh/samucamg/imagens/Outros/2026/08/pagina_de_upload_1787536501.jpg)

![Galeria de arquivos com filtros por categoria, estatísticas e miniaturas de mídia](https://cdn.jsdelivr.net/gh/samucamg/imagens/Outros/2026/08/galeria_verodesk_1787536484.jpg)

![Modal de detalhes de arquivo com player de vídeo, URL de entrega e ações de copiar embed](https://cdn.jsdelivr.net/gh/samucamg/imagens/Outros/2026/08/visualisacao_arquivos_verodesk_1787536184.jpg)

## Principais recursos

- 🚀 **Deploy nativo em um clique:** instala Worker, assets estáticos, D1, variáveis e secrets pelo assistente Deploy to Cloudflare.
- 🖥️ **Painel integrado:** `index.html`, galeria e autenticação são publicados como static assets pelo próprio Worker.
- 🗄️ **D1 com migration versionada:** o banco de metadados é criado e inicializado com `migrations/0001_initial.sql`.
- ☁️ **Armazenamento no Google Drive:** upload, listagem, renomeação e exclusão são executados pelo Worker via Google Drive API v3.
- 🔄 **Upload resumable em chunks:** arquivos são enviados em blocos de **5 MB** por sessões resumable do Google Drive, permitindo uploads de até **1,5 GB** e evitando o limite de 100 MB por requisição do Cloudflare.
- 🔌 **Status da conexão Drive:** o painel consulta a conexão OAuth e alterna o botão entre **Conectar Drive** e **Drive Conectado (Reconectar)**.
- 🌍 **Entrega por proxy de borda:** os arquivos são entregues pelo fluxo Worker → Google Drive → cliente, com suporte opcional a domínio próprio.
- 🎬 **Player de mídia nativo:** a galeria visualiza imagens e reproduz `.mp4`, `.mkv`, `.mp3`, `.wav` e `.ogg` em players HTML5.
- 📋 **Embed responsivo:** o modal gera e copia diretamente tags `<video controls>`, `<audio controls>`, `<img>` ou `<a>` de acordo com o tipo de arquivo.
- 🔐 **Credenciais Google protegidas:** `GOOGLE_CLIENT_SECRET` existe somente como secret do Worker; o navegador nunca recebe essa credencial.
- 🔑 **Acesso administrativo:** `UPLOAD_TOKEN` protege painel e endpoints administrativos.
- 🛡️ **Validações de segurança:** validação de extensão, tamanho máximo de 1,5 GB, nomes de arquivos, identificadores de projeto e operações de renomeação/exclusão.
- 📊 **Metadados e estatísticas:** D1 registra caminho, tamanho, extensão, identificador do arquivo no Drive e data de upload.
- 🔄 **Renomeação consistente:** o Worker renomeia o arquivo no Drive e sincroniza o registro D1.

## Arquitetura

```text
Administrador no navegador
          |
          v
Cloudflare Worker
  |                    |
  | Static assets      | API protegida
  | public/index.html  | /api/upload/init
  | public/gallery.html| /api/upload/chunk
  | public/auth.js     | /api/auth/google/status
  |                    | /api/uploads
  |                    | /api/stats
  v                    v
Painel web          Cloudflare D1
                         |
                         v
                  Google Drive API v3
                         |
                         v
                  Google Drive (assets)
                         |
                         v
             Edge CDN / Domínio próprio
```

## Deploy em um clique

### Pré-requisitos

Antes de clicar no botão, tenha:

1. Uma conta na [Cloudflare](https://dash.cloudflare.com/sign-up).
2. Uma conta Google que tenha acesso ao Google Drive onde os assets serão armazenados.
3. Um projeto no Google Cloud com a Google Drive API ativada.
4. Credenciais OAuth 2.0 do tipo **Aplicativo da Web**, com Client ID e Client Secret.

> 📌 Você não precisa usar terminal, instalar Node.js, instalar Wrangler ou executar `git clone` para instalar uma instância pelo fluxo abaixo.

### Preparar o Google Cloud

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um projeto novo ou selecione um projeto existente.
3. Em **APIs e serviços** → **Biblioteca**, ative a **Google Drive API**.
4. Em **APIs e serviços** → **Tela de permissão OAuth**, configure a tela de consentimento do aplicativo.
5. Em **APIs e serviços** → **Credenciais**, crie uma credencial OAuth 2.0 do tipo **Aplicativo da Web**.
6. Adicione a seguinte URI em **URIs de redirecionamento autorizados**, substituindo pelo endereço real do seu Worker:

```text
https://seu-worker.workers.dev/api/auth/google/callback
```

7. Guarde o Client ID e o Client Secret para informá-los no assistente de deploy.

### Iniciar a instalação

Clique no botão para abrir o assistente Deploy to Cloudflare:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/verodesk-cdn-gdrive)

O assistente criará uma cópia do projeto na sua conta GitHub e abrirá o formulário de configuração Cloudflare. Escolha nomes exclusivos para o Worker e para o banco D1, preencha as variáveis e secrets e finalize a implantação.

![Assistente Deploy to Cloudflare para configurar o projeto, o banco D1, as variáveis e os secrets](https://cdn.inglescurso.com.br/Outros/2026/08/deploy_com_1_clique_1787536472.jpg)

### O que o deploy automatiza

- Criação de uma cópia do código na conta GitHub do usuário.
- Criação e implantação do Cloudflare Worker.
- Upload do conteúdo da pasta `public/` como assets estáticos.
- Criação ou associação do banco D1 definido pelo binding `DB`.
- Execução da migration versionada para criar a tabela `uploads` e seus índices.
- Publicação do painel e da API na mesma URL `workers.dev`.

### O que você ainda informa

Por segurança, as credenciais OAuth pertencem ao seu projeto Google Cloud e precisam ser fornecidas no formulário:

- O `GOOGLE_CLIENT_ID` do aplicativo OAuth 2.0.
- O `GOOGLE_CLIENT_SECRET` correspondente.
- A URL de callback do Worker, em `GOOGLE_REDIRECT_URI`.
- Um `UPLOAD_TOKEN` forte para acesso administrativo.

O deploy não cria credenciais OAuth por você. Mantenha o Client Secret somente no campo secreto do Cloudflare e nunca o exponha no frontend, em repositórios ou em logs.

## Campos do assistente

### Nomes de recursos Cloudflare

| Campo | Exemplo | Regra |
|---|---|---|
| Nome do Worker | `meu-cdn-manager` | Deve ser único na sua conta; compõe a URL padrão `https://meu-cdn-manager.SEUSUBDOMINIO.workers.dev` |
| Nome do banco D1 | `meu-cdn-manager-db` | Deve ser único e identifica o banco com os metadados dos uploads |
| Binding D1 | `DB` | Não altere. O código usa esse nome para acessar o banco |

### Variáveis e secrets

| Nome | Tipo | Exemplo | Finalidade |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | Variável | `1234567890-abc.apps.googleusercontent.com` | Identificador público do cliente OAuth 2.0 criado no Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Secret | `GOCSPX-...` | Segredo do cliente OAuth 2.0 usado pelo Worker na troca de código e renovação de tokens |
| `GOOGLE_REDIRECT_URI` | Variável | `https://seu-worker.workers.dev/api/auth/google/callback` | URI de callback cadastrada nas credenciais OAuth do Google Cloud |
| `UPLOAD_TOKEN` | Secret | Token aleatório longo | Senha de acesso ao painel e às rotas administrativas |
| `CDN_BASE_URL` | Variável opcional | `https://cdn.seudominio.com` | Base do domínio próprio para entrega dos arquivos; informe sem barra final |

> 📌 Embora `GOOGLE_CLIENT_ID` seja normalmente uma variável pública, ele também pode ser armazenado como secret se a configuração do seu deploy exigir isso. `GOOGLE_CLIENT_SECRET` deve sempre ser um secret.

### Criar o UPLOAD_TOKEN

Use um token aleatório com pelo menos 24 caracteres, contendo letras maiúsculas, minúsculas, números e símbolos. Não use nome, domínio, data ou texto previsível.

```text
R7!mK2qVx9#Ld4Wa8Tp6Ns3Z
```

> Não reutilize o valor de exemplo.

## Primeiro acesso

Após a implantação, o Cloudflare fornecerá uma URL semelhante a:

```text
https://meu-cdn-manager.SEUSUBDOMINIO.workers.dev
```

1. Abra essa URL no navegador.
2. Informe o seu `UPLOAD_TOKEN` no painel.
3. Clique em **Conectar Drive**.
4. Entre com a conta Google que contém o Drive de destino e autorize o aplicativo solicitado.
5. Após o retorno ao Worker, o sistema registra o `refresh_token` no banco D1 para que os uploads posteriores sejam feitos sem repetir a autorização.
6. O botão passa a indicar **Drive Conectado (Reconectar)** quando `GET /api/auth/google/status` identifica o token no D1.
7. Selecione um projeto e envie um arquivo de teste não confidencial.
8. Confirme que o arquivo aparece no Google Drive configurado e que a URL de entrega retornada pelo Worker abre corretamente.

> ✅ Se o arquivo aparecer no Drive e a URL de entrega abrir corretamente, Worker, D1, painel, autenticação OAuth e Google Drive API estão configurados.

## Autenticação e segurança

### Proteção das credenciais

| Credencial | Onde fica | Nunca coloque em |
|---|---|---|
| `GOOGLE_CLIENT_SECRET` | Secret do Cloudflare e gerenciador de senhas | HTML, JavaScript do frontend, Git, README, logs e capturas de tela |
| `refresh_token` | Banco D1, acessível somente ao Worker | HTML, JavaScript do frontend, Git, README, logs e capturas de tela |
| `UPLOAD_TOKEN` | Secret do Cloudflare e gerenciador de senhas | Repositório público, URLs, README e scripts de frontend |
| `GOOGLE_CLIENT_ID` e `GOOGLE_REDIRECT_URI` | Variáveis do Worker | Não são secrets, mas devem corresponder às credenciais OAuth configuradas no Google Cloud |

O painel pode enviar `UPLOAD_TOKEN` pelo formulário de upload e as demais rotas administrativas aceitam o header:

```http
Authorization: Bearer SEU_UPLOAD_TOKEN
```

O Client Secret e o `refresh_token` nunca são retornados pela API. Eles são usados exclusivamente pelo Worker na comunicação servidor a servidor com a Google Drive API.

### Validações aplicadas

- Limite de upload: **1,5 GB** (`1500 * 1024 * 1024` bytes).
- Upload resumable em blocos de **5 MB** (`5 * 1024 * 1024` bytes).
- Extensões permitidas: `jpg`, `jpeg`, `png`, `gif`, `webp`, `svg`, `pdf`, `mp3`, `mp4` e `mkv`.
- `project` aceita somente letras, números, `_` e `-`, com até 64 caracteres.
- Nomes de arquivo são normalizados antes de serem enviados ao Google Drive.
- Renomeações rejeitam nomes vazios ou compostos apenas por caracteres inválidos.
- A operação de renomeação sincroniza os metadados persistidos no D1.
- Estatísticas retornam `0` quando ainda não existem uploads, evitando valores nulos no frontend.

### Visibilidade e entrega

Os assets não dependem de links públicos do Google Drive. O Worker atua como proxy entre o cliente e o Drive, aplicando o fluxo de entrega configurado pela aplicação. Não envie backups, credenciais, dados pessoais ou outro conteúdo para o qual essa política de acesso não tenha sido definida e validada.

## API

Substitua:

- `SUA_URL` pela URL do Worker, sem barra final.
- `SEU_UPLOAD_TOKEN` pelo token configurado como secret.

### Health check e painel

```text
GET /
```

A raiz entrega o painel web estático.

### Status da conexão Google Drive

```text
GET /api/auth/google/status
```

Retorna se a chave `gdrive_refresh_token` está disponível na tabela `settings` do Cloudflare D1. O frontend usa esse endpoint para refletir o estado da conexão no botão do Drive.

Resposta típica:

```json
{
  "success": true,
  "connected": true
}
```

### Estatísticas

```text
GET /api/stats
```

```bash
curl https://SUA_URL/api/stats \
  -H "Authorization: Bearer SEU_UPLOAD_TOKEN"
```

Resposta típica:

```json
{
  "success": true,
  "stats": {
    "total": 12,
    "total_size": 4583921
  }
}
```

### Inicializar upload resumable

```text
POST /api/upload/init
```

Envie os metadados do arquivo, o projeto e o token no header `Authorization`. O endpoint cria uma sessão resumable no Google Drive usando `uploadType=resumable` e retorna o `sessionId` codificado em Base64. Esse valor deve ser usado em cada requisição de chunk subsequente.

```bash
curl -X POST https://SUA_URL/api/upload/init \
  -H "Authorization: Bearer SEU_UPLOAD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project": "meu-projeto",
    "filename": "video.mp4",
    "size": 10485760,
    "mimeType": "video/mp4"
  }'
```

### Enviar chunk do upload

```text
PUT /api/upload/chunk
```

Envie o chunk binário para a sessão iniciada anteriormente. O frontend divide o arquivo em blocos de **5 MB** (`5 * 1024 * 1024` bytes), enquanto o Worker lê o conteúdo como `ArrayBuffer` e o repassa ao Google Drive com o cabeçalho `Content-Range`.

```bash
curl -X PUT https://SUA_URL/api/upload/chunk \
  -H "Authorization: Bearer SEU_UPLOAD_TOKEN" \
  -H "Content-Type: application/octet-stream" \
  -H "Content-Range: bytes 0-5242879/10485760" \
  -H "X-Upload-Session: SEU_SESSION_ID" \
  --data-binary "@video.mp4"
```

Enquanto a sessão ainda recebe partes, o Google Drive responde `308 Resume Incomplete`; o endpoint o trata como estado intermediário. No último chunk, o Worker registra os metadados no D1 e retorna a URL de entrega do arquivo.

Resposta típica após a conclusão:

```json
{
  "success": true,
  "urls": {
    "cloudflare": "/banner_123456789.mp4"
  }
}
```

O valor de `urls.cloudflare` é uma rota relativa retornada pela implementação. Use-o em conjunto com a origem do Worker ou com o domínio definido em `CDN_BASE_URL`, conforme a configuração da sua aplicação.

> 📌 O endpoint legado `POST /api/upload` foi substituído pelo fluxo `POST /api/upload/init` + `PUT /api/upload/chunk`.

### Listar uploads

```text
GET /api/uploads
GET /api/uploads?project=meu-projeto
```

```bash
curl "https://SUA_URL/api/uploads?project=meu-projeto" \
  -H "Authorization: Bearer SEU_UPLOAD_TOKEN"
```

A listagem retorna até 100 registros, ordenados do upload mais recente para o mais antigo.

### Renomear upload

```text
PUT /api/uploads
```

```bash
curl -X PUT https://SUA_URL/api/uploads \
  -H "Authorization: Bearer SEU_UPLOAD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 42,
    "new_name": "banner-promocional-agosto"
  }'
```

A operação renomeia o arquivo no Google Drive e atualiza os caminhos e metadados persistidos no D1.

### Excluir upload

```text
DELETE /api/uploads
```

```bash
curl -X DELETE https://SUA_URL/api/uploads \
  -H "Authorization: Bearer SEU_UPLOAD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 42}'
```

A exclusão remove o conteúdo no Google Drive e o registro correspondente no D1. Se o arquivo já não existir no Drive, o registro D1 ainda poderá ser removido para reparar uma inconsistência histórica.

### Códigos de resposta relevantes

- `401 Não autorizado`: o `UPLOAD_TOKEN` está ausente ou inválido.
- `502 Bad Gateway`: o token do Google Drive está ausente, inválido ou não pôde ser renovado. Reconecte o Drive pelo painel.
- `308 Resume Incomplete`: estado intermediário esperado durante o upload resumable; envie o próximo chunk.

## Domínio personalizado

Para usar um endereço como `cdn.seudominio.com`:

1. Garanta que o domínio esteja no Cloudflare e com DNS gerenciado pela Cloudflare.
2. Abra **Workers & Pages** no painel Cloudflare.
3. Selecione o Worker implantado.
4. Abra **Triggers** ou **Custom Domains**.
5. Clique em **Add Custom Domain**.
6. Informe o subdomínio desejado e conclua o fluxo.
7. Se usar o domínio como CDN de arquivos, configure `CDN_BASE_URL` como `https://cdn.seudominio.com`.

> 📌 `CDN_BASE_URL` é opcional. Caso não seja configurada, o Worker continua entregando os arquivos pela URL padrão `workers.dev`.

## Desenvolvimento local (opcional)

Esta seção é somente para quem deseja modificar o projeto. Ela não é necessária para usar o Deploy Button.

### Pré-requisitos

- Node.js 18 ou superior.
- npm.
- Git.
- Wrangler CLI.
- Conta Cloudflare e credenciais de desenvolvimento.
- Projeto Google Cloud com Google Drive API e credenciais OAuth configuradas para a URL local utilizada no desenvolvimento.

### Instalação

```bash
git clone https://github.com/samucamg/verodesk-cdn-gdrive.git
cd verodesk-cdn-gdrive
npm install
cp .dev.vars.example .dev.vars
```

Edite `.dev.vars` somente no seu ambiente local:

```dotenv
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret_de_desenvolvimento
GOOGLE_REDIRECT_URI=http://localhost:8787/api/auth/google/callback
UPLOAD_TOKEN=um_token_local_longo_e_aleatorio
CDN_BASE_URL=http://localhost:8787
```

Cadastre a URI local `http://localhost:8787/api/auth/google/callback` nas credenciais OAuth de desenvolvimento, quando aplicável. Nunca faça commit de `.dev.vars`.

### Banco D1 local

```bash
npm run migrate:local
```

### Executar localmente

```bash
npm run dev
```

### Validar e publicar manualmente

```bash
npm run typecheck
npm run migrate:remote
npx wrangler deploy
```

Ou use o script integrado:

```bash
npm run deploy
```

O script de deploy executa validação TypeScript, aplica migrations remotas pelo binding `DB` e implanta o Worker.

## Diagnóstico

### Checklist pós-deploy

- [ ] A URL raiz abre o painel do CDN Manager.
- [ ] O painel aceita `UPLOAD_TOKEN` válido.
- [ ] O D1 está associado ao binding chamado exatamente `DB`.
- [ ] A migration `0001_initial.sql` foi aplicada.
- [ ] `GOOGLE_CLIENT_ID` e `GOOGLE_REDIRECT_URI` correspondem às credenciais OAuth do Google Cloud.
- [ ] `GOOGLE_CLIENT_SECRET` está cadastrado como secret no Worker.
- [ ] A URI `https://seu-worker.workers.dev/api/auth/google/callback` está autorizada no Google Cloud.
- [ ] O administrador concluiu o fluxo **Conectar Drive** e o `refresh_token` foi persistido no D1.
- [ ] O botão indica **Drive Conectado (Reconectar)** após a conexão OAuth.
- [ ] Um upload de teste aparece no Google Drive.
- [ ] A URL de entrega do Worker abre o arquivo.

### Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `401 Não autorizado` | `UPLOAD_TOKEN` ausente ou inválido | Confira o token no painel ou no header `Authorization` |
| `502 Bad Gateway` ao acessar o Drive | `refresh_token` ausente, inválido ou falha na renovação | Reconecte o Drive pelo painel e confira `GOOGLE_CLIENT_SECRET` |
| Erro no callback OAuth | `GOOGLE_REDIRECT_URI` não coincide com a URI autorizada | Compare a variável do Worker com a URI cadastrada nas credenciais OAuth do Google Cloud |
| Acesso negado pelo Google | Consentimento não concluído, usuário inadequado ou escopo não autorizado | Clique em **Conectar Drive**, entre com a conta correta e revise a configuração da tela de consentimento e dos escopos |
| Erro de tabela D1 | Migration não foi aplicada ou binding está errado | Confirme `DB` e execute `npm run migrate:remote` |
| Upload excede limite | Arquivo maior que 1,5 GB | Reduza, comprima ou divida o arquivo antes de enviar |
| Upload interrompido | Um chunk não foi enviado ou a sessão resumable expirou | Reenvie o arquivo pelo painel para criar uma nova sessão de upload |
| Extensão inválida | Tipo de arquivo fora da lista permitida | Use `jpg`, `jpeg`, `png`, `gif`, `webp`, `svg`, `pdf`, `mp3`, `mp4` ou `mkv`, ou altere `ALLOWED_EXTENSIONS` no código |
| Arquivo não é entregue | Arquivo removido do Drive, metadado inconsistente ou configuração do proxy incorreta | Confirme a existência do arquivo no Drive, o registro D1 e a rota de entrega do Worker |
| URL Cloudflare vazia | `CDN_BASE_URL` não foi configurada | É esperado; use a URL padrão do Worker ou configure um domínio próprio |

## Autor e Créditos

Desenvolvido por **Samuel de Sousa Santos**.

- **Email:** [samucamg@gmail.com](mailto:samucamg@gmail.com)
- **YouTube:** [Samuca Tutoriais](https://www.youtube.com/c/samucatutoriais)
- **GitHub:** [@samucamg](https://github.com/samucamg)

## Contribuições

1. Faça um fork do repositório.
2. Crie uma branch de funcionalidade.
3. Mantenha mudanças de API e schema documentadas.
4. Execute `npm run typecheck` e testes aplicáveis.
5. Abra um Pull Request explicando impacto, compatibilidade e migrações necessárias.

## Licença

Este projeto é disponibilizado sob a licença definida no arquivo [LICENSE](LICENSE), quando presente no repositório.
