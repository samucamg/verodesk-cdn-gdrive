# VeroDesk Serverless CDN Orchestrator


![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/Cloudflare-D1-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-API-181717?style=flat-square&logo=github&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/verodesk-cdn-github)
> 🚀 Um gerenciador de arquivos serverless, executado na borda e pronto para CDN. O VeroDesk Serverless CDN Orchestrator usa um único Cloudflare Worker para entregar o painel web, expor a API administrativa, registrar metadados no Cloudflare D1 e publicar arquivos em um repositório GitHub configurado pelo proprietário da instância.

## Índice

- [Visão geral](#visão-geral)
- [Principais recursos](#principais-recursos)
- [Arquitetura](#arquitetura)
- [Deploy em um clique](#deploy-em-um-clique)
- [Campos do assistente](#campos-do-assistente)
- [Primeiro acesso](#primeiro-acesso)
- [Autenticação e segurança](#autenticação-e-segurança)
- [API](#api)
- [URLs de entrega](#urls-de-entrega)
- [Domínio personalizado](#domínio-personalizado)
- [Desenvolvimento local](#desenvolvimento-local-opcional)
- [Diagnóstico](#diagnóstico)

---

## Visão geral

O **VeroDesk Serverless CDN Orchestrator** transforma um repositório GitHub em uma origem administrável para imagens, documentos e áudio. O projeto foi criado para quem quer publicar e organizar assets por uma interface web, sem expor o token do GitHub no navegador.

O usuário faz upload pelo painel. O Worker valida o arquivo e a autenticação, grava o conteúdo no repositório GitHub usando a API oficial, registra os metadados no D1 e devolve URLs para consumo pelo GitHub, GitHub Raw, jsDelivr e, opcionalmente, um domínio próprio de CDN.

> 💡 A interface estática e a API são servidas pelo **mesmo Worker**. Não existe Cloudflare Pages, `WORKER_API_URL`, segundo deploy ou etapa de copiar URL entre projetos.

## Interface do sistema

O VeroDesk reúne o gerenciamento de arquivos e a distribuição por CDN em um painel único. A dashboard oferece visão rápida do volume armazenado, total de arquivos, categorias e uma galeria para consultar os assets publicados.

![Dashboard do VeroDesk CDN Manager](https://cdn.jsdelivr.net/gh/samucamg/imagens/Outros/2026/08/cdn_manager_1787439929.jpg)

Ao abrir um arquivo na galeria, o sistema disponibiliza os links de entrega prontos para uso, incluindo GitHub, GitHub Raw, jsDelivr e, quando configurado, domínio personalizado.

![Seleção de links de entrega do CDN](https://cdn.jsdelivr.net/gh/samucamg/imagens/Outros/2026/08/imagens_cdn_1787439907.jpg)

## Principais recursos

- 🚀 **Deploy nativo em um clique:** instala Worker, assets estáticos, D1, variáveis e secrets pelo assistente Deploy to Cloudflare.
- 🖥️ **Painel integrado:** `index.html`, galeria e autenticação são publicados como static assets pelo próprio Worker.
- 🗄️ **D1 com migration versionada:** o banco de metadados é criado e inicializado com `migrations/0001_initial.sql`.
- 📦 **Publicação no GitHub:** upload, listagem, renomeação e exclusão operam no repositório de assets definido pelo proprietário.
- 🌍 **URLs de entrega:** retorno de URLs GitHub, GitHub Raw, jsDelivr e domínio CDN próprio opcional.
- 🔐 **Token GitHub protegido:** `GITHUB_TOKEN` existe somente como secret do Worker; o navegador nunca recebe essa credencial.
- 🔑 **Acesso administrativo:** `UPLOAD_TOKEN` protege painel e endpoints administrativos.
- 🛡️ **Validações de segurança:** validação de extensão, tamanho máximo de 10 MB, nomes de arquivos, identificadores de projeto e operações de renomeação/exclusão.
- 📊 **Metadados e estatísticas:** D1 registra caminho, tamanho, extensão, URLs, SHA e data de upload.
- 🔄 **Renomeação consistente:** o Worker cria o novo arquivo, verifica a exclusão do anterior e sincroniza o registro D1.

## Arquitetura

```text
Administrador no navegador
          |
          v
Cloudflare Worker
  |                    |
  | Static assets      | API protegida
  | public/index.html  | /api/upload
  | public/gallery.html| /api/uploads
  | public/auth.js     | /api/stats
  |                    |
  v                    v
Painel web          Cloudflare D1
                         |
                         v
                   GitHub Contents API
                         |
                         v
              Repositório de assets GitHub
                         |
                         v
      GitHub URL | GitHub Raw | jsDelivr | CDN própria
```

## Deploy em um clique

### Pré-requisitos

Antes de clicar no botão, tenha:

1. Uma conta no [GitHub](https://github.com/signup).
2. Uma conta na [Cloudflare](https://dash.cloudflare.com/sign-up).
3. Um repositório GitHub destinado aos seus assets, público caso queira distribuir diretamente por jsDelivr.
4. Um Personal Access Token do GitHub autorizado a ler e gravar nesse repositório de assets.

> 📌 Você não precisa usar terminal, instalar Node.js, instalar Wrangler ou executar `git clone` para instalar uma instância pelo fluxo abaixo.

### Iniciar a instalação

Clique no botão e conecte sua conta GitHub à Cloudflare quando o assistente solicitar:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/verodesk-cdn-github)

O assistente criará uma cópia do projeto na sua conta GitHub e abrirá o formulário de configuração Cloudflare. Escolha nomes exclusivos para o Worker e para o banco D1, preencha as variáveis e secrets e finalize a implantação.

### O que o deploy automatiza

- Criação de uma cópia do código na conta GitHub do usuário.
- Criação e implantação do Cloudflare Worker.
- Upload do conteúdo da pasta `public/` como assets estáticos.
- Criação ou associação do banco D1 definido pelo binding `DB`.
- Execução da migration versionada para criar a tabela `uploads` e seus índices.
- Publicação do painel e da API na mesma URL `workers.dev`.

### O que você ainda informa

Por segurança, dois recursos pertencem à sua conta e precisam ser fornecidos no formulário:

- O repositório GitHub que receberá os arquivos.
- Um token GitHub limitado a esse repositório.

O deploy não cria um Personal Access Token por você e não deve receber uma chave GitHub com acesso amplo a todos os seus repositórios.

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
| `GITHUB_USER` | Variável | `meuusuario` | Usuário ou organização proprietária do repositório de assets |
| `GITHUB_REPO` | Variável | `minha-cdn-assets` | Repositório que receberá os arquivos enviados pelo painel |
| `GITHUB_BRANCH` | Variável | `main` | Branch de destino; mantenha `main` salvo se seu repositório usar outra branch |
| `GITHUB_TOKEN` | Secret | `github_pat_...` | Token GitHub que permite ao Worker ler e alterar o repositório de assets |
| `UPLOAD_TOKEN` | Secret | Token aleatório longo | Senha de acesso ao painel e às rotas administrativas |
| `CDN_BASE_URL` | Variável opcional | `https://cdn.seudominio.com` | Base de uma CDN ou domínio próprio; informe sem barra final |

### Criar o token GitHub

Prefira um **fine-grained Personal Access Token**:

1. No GitHub, abra **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**.
2. Clique em **Generate new token**.
3. Em acesso a repositórios, selecione apenas seu repositório de assets.
4. Em permissões do repositório, conceda **Contents: Read and write**.
5. Defina uma expiração adequada e gere o token.
6. Cole o token somente no campo secreto `GITHUB_TOKEN` do Cloudflare.

### Criar o UPLOAD_TOKEN

Use um token aleatório com pelo menos 24 caracteres, contendo letras maiúsculas, minúsculas, números e símbolos. Não use nome, domínio, data ou texto previsível.

Exemplo de formato válido — **não reutilize este valor**:

```text
R7!mK2qVx9#Ld4Wa8Tp6Ns3Z
```

## Primeiro acesso

Após a implantação, o Cloudflare fornecerá uma URL semelhante a:

```text
https://meu-cdn-manager.SEUSUBDOMINIO.workers.dev
```

1. Abra essa URL no navegador.
2. Informe o seu `UPLOAD_TOKEN` no painel.
3. Selecione um projeto e envie um arquivo de teste não confidencial.
4. Confirme que o arquivo foi criado no repositório GitHub configurado.
5. Abra a URL jsDelivr ou GitHub Raw devolvida pelo sistema.

> ✅ Se o upload aparecer no repositório e a URL do arquivo abrir corretamente, Worker, D1, painel e API GitHub estão configurados.

## Autenticação e segurança

### Proteção das credenciais

| Credencial | Onde fica | Nunca coloque em |
|---|---|---|
| `GITHUB_TOKEN` | Secret do Cloudflare e gerenciador de senhas | HTML, JavaScript do frontend, Git, README, logs e capturas de tela |
| `UPLOAD_TOKEN` | Secret do Cloudflare e gerenciador de senhas | Repositório público, URLs, README e scripts de frontend |
| `GITHUB_USER` e `GITHUB_REPO` | Variáveis do Worker | Não são secrets, mas devem apontar para o repositório correto |

O painel pode enviar `UPLOAD_TOKEN` pelo formulário de upload e as demais rotas administrativas aceitam o header:

```http
Authorization: Bearer SEU_UPLOAD_TOKEN
```

O token GitHub nunca é retornado pela API e só é usado pelo Worker na comunicação servidor-a-servidor com a GitHub Contents API.

### Validações aplicadas

- Limite de upload: **10 MB**.
- Extensões permitidas: `jpg`, `jpeg`, `png`, `gif`, `webp`, `svg`, `pdf` e `mp3`.
- `project` aceita somente letras, números, `_` e `-`, com até 64 caracteres.
- Nomes de arquivo são normalizados antes de compor o caminho GitHub.
- Renomeações rejeitam nomes vazios ou compostos apenas por caracteres inválidos.
- A exclusão anterior em uma renomeação é verificada antes de sincronizar o D1.
- Estatísticas retornam `0` quando ainda não existem uploads, evitando valores nulos no frontend.

### Visibilidade do repositório de assets

- **Público:** adequado para uso direto com jsDelivr e compartilhamento de arquivos estáticos.
- **Privado:** indicado para conteúdo restrito, mas URLs públicas de CDN podem não funcionar como esperado. Não use jsDelivr como estratégia de entrega de dados privados.

> 🔒 Nunca faça upload de backups, credenciais, dados pessoais, arquivos internos ou qualquer conteúdo que não possa se tornar público caso o repositório seja público.

## API

Substitua:

- `SUA_URL` pela URL do Worker, sem barra final.
- `SEU_UPLOAD_TOKEN` pelo token configurado como secret.

### Health check e painel

```text
GET /
```

A raiz entrega o painel web estático.

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

### Upload

```text
POST /api/upload
```

Envie `multipart/form-data` com o arquivo no campo `image`, o projeto no campo `project` e o token no campo `token` ou no header `Authorization`.

```bash
curl -X POST https://SUA_URL/api/upload \
  -H "Authorization: Bearer SEU_UPLOAD_TOKEN" \
  -F "project=meu-projeto" \
  -F "image=@banner.webp"
```

Resposta típica:

```json
{
  "success": true,
  "urls": {
    "cloudflare": "",
    "jsdelivr": "https://cdn.jsdelivr.net/gh/USUARIO/REPOSITORIO@main/meu-projeto/2026/08/banner_123456789.webp",
    "raw": "https://raw.githubusercontent.com/USUARIO/REPOSITORIO/main/meu-projeto/2026/08/banner_123456789.webp",
    "github": "https://github.com/USUARIO/REPOSITORIO/blob/main/meu-projeto/2026/08/banner_123456789.webp"
  }
}
```

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

A operação cria o novo arquivo no GitHub, remove o arquivo anterior e atualiza os caminhos e URLs persistidos no D1.

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

A exclusão remove o conteúdo no GitHub e o registro correspondente no D1. Se o arquivo já não existir no GitHub, o registro D1 ainda poderá ser removido para reparar uma inconsistência histórica.

## URLs de entrega

Cada upload devolve URLs úteis para diferentes cenários.

| URL | Uso recomendado |
|---|---|
| `github` | Visualização e auditoria no GitHub |
| `raw` | Desenvolvimento, inspeção e consumo direto de conteúdo bruto |
| `jsdelivr` | CDN pública para repositórios públicos GitHub |
| `cloudflare` | URL opcional quando `CDN_BASE_URL` estiver configurada |

### jsDelivr

A URL jsDelivr segue esta estrutura:

```text
https://cdn.jsdelivr.net/gh/USUARIO/REPOSITORIO@BRANCH/caminho/do/arquivo.ext
```

Exemplo:

```text
https://cdn.jsdelivr.net/gh/meuusuario/minha-cdn-assets@main/imagens/2026/08/logo.webp
```

Para conteúdo imutável, considere usar tags ou commits na estratégia de publicação em vez de uma branch móvel, quando isso for compatível com seu fluxo.

## Domínio personalizado

Para usar um endereço como `cdn.seudominio.com`:

1. Garanta que o domínio esteja no Cloudflare e com DNS gerenciado pela Cloudflare.
2. Abra **Workers & Pages** no painel Cloudflare.
3. Selecione o Worker implantado.
4. Abra **Triggers** ou **Custom Domains**.
5. Clique em **Add Custom Domain**.
6. Informe o subdomínio desejado e conclua o fluxo.
7. Se usar o domínio como CDN de arquivos, configure `CDN_BASE_URL` como `https://cdn.seudominio.com`.

> 📌 `CDN_BASE_URL` é opcional. Caso não seja configurada, o painel continua devolvendo URLs GitHub, Raw e jsDelivr normalmente.

## Desenvolvimento local (opcional)

Esta seção é somente para quem deseja modificar o projeto. Ela não é necessária para usar o Deploy Button.

### Pré-requisitos

- Node.js 18 ou superior.
- npm.
- Git.
- Wrangler CLI.
- Conta Cloudflare e credenciais de desenvolvimento.

### Instalação

```bash
git clone https://github.com/samucamg/verodesk-cdn-github.git
cd verodesk-cdn-github
npm install
cp .dev.vars.example .dev.vars
```

Edite `.dev.vars` somente no seu ambiente local:

```dotenv
GITHUB_TOKEN=seu_token_de_desenvolvimento
UPLOAD_TOKEN=um_token_local_longo_e_aleatorio
```

Nunca faça commit de `.dev.vars`.

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
- [ ] `GITHUB_USER`, `GITHUB_REPO` e `GITHUB_BRANCH` apontam para o destino correto.
- [ ] `GITHUB_TOKEN` possui escrita no repositório de assets.
- [ ] Um upload de teste aparece no repositório GitHub.
- [ ] A URL jsDelivr abre o arquivo, quando o repositório é público.

### Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `401 Não autorizado` | `UPLOAD_TOKEN` ausente ou inválido | Confira o token no painel ou no header `Authorization` |
| `502 GitHub HTTP 401/403` | Token GitHub expirado, sem escrita ou repositório incorreto | Gere um novo PAT limitado ao repositório e atualize `GITHUB_TOKEN` |
| `502 GitHub HTTP 404` | Usuário, repositório ou branch não existe | Revise `GITHUB_USER`, `GITHUB_REPO` e `GITHUB_BRANCH` |
| `502 GitHub HTTP 422` | Nome/caminho inválido ou conflito ao gravar arquivo | Revise o projeto, nome do arquivo e existência de arquivo com o mesmo destino |
| Erro de tabela D1 | Migration não foi aplicada ou binding está errado | Confirme `DB` e execute `npm run migrate:remote` |
| Upload excede limite | Arquivo maior que 10 MB | Reduza, comprima ou divida o arquivo antes de enviar |
| Extensão inválida | Tipo de arquivo fora da lista permitida | Use uma extensão suportada ou altere `ALLOWED_EXTENSIONS` no código |
| jsDelivr não abre | Repositório privado, URL incorreta ou cache | Confirme visibilidade, branch e caminho do arquivo |
| URL Cloudflare vazia | `CDN_BASE_URL` não foi configurada | É esperado; use jsDelivr/Raw ou configure um domínio próprio |

## Contribuições

1. Faça um fork do repositório.
2. Crie uma branch de funcionalidade.
3. Mantenha mudanças de API e schema documentadas.
4. Execute `npm run typecheck` e testes aplicáveis.
5. Abra um Pull Request explicando impacto, compatibilidade e migrações necessárias.

## Licença

Este projeto é disponibilizado sob a licença definida no arquivo [LICENSE](LICENSE), quando presente no repositório.
