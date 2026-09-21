# Social-Media-for-Devs
Base de uma rede social para desenvolvedores, com Next.js 14 (App Router),
TypeScript, Tailwind CSS 3, ESLint e Prisma 6 com PostgreSQL.
Autenticação com NextAuth.js 4, Credentials Provider e senhas com hash bcrypt.

## Ambiente local

Use Node.js 22.12+ e npm. Para operações de banco, disponibilize uma instância PostgreSQL.

```bash
cp .env.example .env
npm install
npm run dev
```

Ajuste `DATABASE_URL` no `.env` com as credenciais do seu PostgreSQL.
Configure também `DIRECT_URL` com a conexão direta usada nas migrations
(pode ser igual a `DATABASE_URL` quando não houver um pooler).
Preencha `NEXTAUTH_SECRET` com um segredo gerado por `openssl rand -base64 32`
e configure `NEXTAUTH_URL` com a URL da aplicação (`http://localhost:3000` localmente).
O `.env` não é versionado.

Aplique as migrations com `npx prisma migrate deploy` antes de cadastrar usuários.
Acesse http://localhost:3000; visitantes são direcionados ao login.

## Autenticação

- `/registro`: cadastro de nome, email e senha. Após criar a conta, o usuário é
  encaminhado ao login com uma mensagem de confirmação.
- `/login`: autenticação por email/senha com redirecionamento para `/feed`.
- `/feed`: feed protegido com publicação, edição e exclusão de posts.
- `/api/registro`: valida os dados e persiste somente o hash bcrypt (custo 12).
- `/api/auth/[...nextauth]`: endpoints de sessão, login, logout e CSRF do NextAuth.

As sessões usam JWT; a sessão expõe o ID do usuário, nome, email e imagem,
sem senha ou hash. Emails são normalizados para minúsculas e espaços externos
são removidos. O cadastro exige nome, email válido e senha de pelo menos
8 caracteres, limitada a 72 bytes para evitar truncamento pelo bcrypt.
A validação é compartilhada entre os formulários e o servidor.

O middleware protege `/feed` e seus caminhos filhos. Ao adicionar novas áreas
privadas, inclua-as no `matcher` de `middleware.ts` e valide a sessão no servidor
com `getServerSession(authOptions)`, como em `app/feed/page.tsx`.
Login e registro redirecionam usuários já autenticados ao feed.

Referências: [Credentials Provider](https://next-auth.js.org/providers/credentials)
e [integração com Next.js e middleware](https://next-auth.js.org/configuration/nextjs).

## Posts

O feed lista 10 posts por página, ordenados por `createdAt` e `id` decrescentes.
Use os links Anterior/Próxima (`/feed?page=2`) para navegar. O formulário no topo
permite publicar texto, adicionar um bloco de código com linguagem e marcar uma dúvida.
O texto é obrigatório (até 5.000 caracteres); o código é opcional (até 20.000).

Cada `PostCard` mostra autor/avatar, data relativa, conteúdo, marcador de dúvida
e código com destaque de sintaxe por highlight.js. O destaque é gerado no servidor
com HTML escapado; o código enviado pelo usuário não é executado.

As Server Actions em `app/feed/actions.ts` exigem sessão e validam os dados.
O autor é sempre obtido da sessão, e edição/exclusão filtram simultaneamente
por ID do post e ID do autor no banco. Apenas o autor vê esses controles.
A exclusão pede confirmação e remove também comentários/reações relacionados,
conforme as relações já definidas no schema. Todas as mutações atualizam o feed.

O CRUD reutiliza o model `Post` existente e não requer uma nova migration.
Referências: [Server Actions no Next.js 14](https://nextjs.org/docs/14/app/building-your-application/data-fetching/server-actions-and-mutations)
e [highlight.js](https://highlightjs.org/).

## Comentários e reações

Cada card mostra comentários do mais antigo ao mais novo, com formulário abaixo
da lista. O texto é obrigatório e limitado a 2.000 caracteres; somente o autor
do comentário pode excluí-lo. É permitido comentar e reagir nos próprios posts.

As reações são Funciona (👍), Clean code (✨) e Duvidoso (🤔), com contadores e
destaque da escolha atual. Escolher outro tipo troca a reação; repetir o tipo
selecionado remove a reação. A restrição única de usuário/post já existente e
uma transação serializável protegem a troca contra concorrência entre abas.

As ações em `app/feed/interaction-actions.ts` exigem sessão e validam as entradas.
Os formulários usam `action` com `useFormState`, recebem erros tratados e bloqueiam
envios enquanto aguardam a resposta. Os componentes atualizam o estado local após
sucesso e as ações revalidam `/feed`, sem recarregar a página. Os models existentes
`Comment` e `Reaction` são reutilizados; nenhuma nova migration é necessária.

## Perfis públicos

`/perfil/[username]` mostra nome, avatar, bio, seguidores/seguindo e posts paginados.
Visitantes podem ler posts e comentários; ações exigem sessão. O header do feed
e dos perfis inclui “Meu perfil” para quem está logado.

O cadastro exige um username único de 3 a 30 caracteres (letras, números, hífen
ou sublinhado), normalizado para minúsculas. A migration
`20260921180000_user_username` preenche contas existentes com o próprio ID como
username, sem remover dados. Aplique com `npx prisma migrate deploy` em outros ambientes.

Seguir/deixar de seguir usa Server Action, transação e atualização local de botão
e contagem, sem reload. O próprio perfil e visitantes não exibem esse botão.
Posts, comentários e reações também revalidam a página de perfil após mutações.

Quando há `githubUsername`, o servidor consulta os três repositórios públicos
recentemente atualizados, com cache de 5 minutos e timeout de 5 segundos.
Erros de rede, rate limit e usuário inexistente exibem uma mensagem discreta.
Referência: [API de repositórios do GitHub](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user).

## Estrutura de pastas

```text
app/         Layout raiz, página inicial e estilos globais
components/  Formulários, cards de posts e controles de autenticação
lib/         Integrações e utilitários; cliente Prisma exclusivo do servidor
prisma/      Schema e migrations do PostgreSQL
```

O alias `@/*` aponta para a raiz do projeto. O cliente em `lib/prisma.ts`
reutiliza a instância durante o hot reload em desenvolvimento.

## Comandos

```bash
npm run dev          # Servidor de desenvolvimento
npm run lint         # ESLint
npm run typecheck    # Verificação de tipos
npm test             # Autenticação, posts, comentários, reações, permissões e loading
npm run test:forms   # Integração HTTP: POSTs reais de posts, comentários e reações
npm run build        # Gera o Prisma Client e o build de produção
npm start            # Executa o build de produção
npm run db:generate  # Gera o Prisma Client
npm run db:validate  # Valida o schema e a configuração
npm run db:migrate   # Cria/aplica migrations em desenvolvimento
npm run db:studio    # Abre o Prisma Studio
```

O Prisma Client é gerado automaticamente após a instalação. O schema contém
`User`, `Post`, `Comment`, `Reaction` e `Follow`, além do enum `ReactionType`
(`FUNCIONA`, `CLEAN_CODE`, `DUVIDOSO`). Os IDs usam CUID e as datas de criação
recebem o horário atual por padrão. Os campos de perfil `bio`, `githubUsername`
e `avatarUrl`, assim como `codeSnippet` e `language` dos posts, são opcionais.

Emails são únicos, cada usuário pode ter uma reação por post e cada par
seguidor/seguido é único. As relações usam exclusão em cascata, e há índices
para consultas por autor, post e seguidores.

A migration inicial está em `prisma/migrations/20260921013000_init/migration.sql`.
Ela foi gerada a partir de um banco vazio, sem aplicação automática ao banco.
Para aplicar as migrations versionadas com o PostgreSQL acessível, execute:

```bash
npx prisma migrate deploy
```

Para futuras alterações no schema em desenvolvimento, use
`npm run db:migrate -- --name nome_da_alteracao`.
O build não precisa de uma conexão ativa com PostgreSQL. Cadastro, login e feed
exigem banco acessível e migrations aplicadas. Os testes usam um mock do Prisma
e executam hash/comparação bcrypt reais, sem alterar o banco configurado.

O desenvolvimento gera arquivos em `.next-dev`; o build de produção usa `.next`.
Isso permite executar `npm run build` com `npm run dev` ativo, sem sobrescrever
o JavaScript servido ao navegador.

Criação, edição e exclusão usam formulários ligados a Server Actions e POST.
IDs de posts são enviados no corpo e sempre validados junto à autoria no servidor.
Login/registro usam POST com `preventDefault()` e permanecem desabilitados até
seus handlers estarem ativos. Nenhum botão auxiliar submete formulários.
Após uma mutação, a revalidação atualiza o feed sem disparar um refresh duplicado.

As consultas do feed têm limite de 10 segundos. Se a navegação continuar pendente
por 15 segundos, o loading exibe uma mensagem de erro com opção de tentar novamente.

`npm run test:forms` cria um projeto temporário sem copiar `.env`, executa um build
e inicia um servidor Next.js local. Verifica HTML real, chunks JavaScript, método
POST, metadados das Server Actions e ausência de query params na criação, edição
e exclusão de posts/comentários e nas reações. Exercita a resposta de sessão ausente
sem alterar o banco; os cenários
de sucesso, falha, atualização dos cards e loading são cobertos por `npm test`.

Para verificar middleware e sessões via HTTP, após o build execute
`npm start -- --hostname 127.0.0.1 --port 3100` e, em outro terminal,
`node scripts/check-auth.mjs`. Esse teste usa uma sessão assinada temporária,
sem criar usuários, mas precisa do banco acessível para carregar o feed.
Ele não substitui um teste de cadastro/login com PostgreSQL.

Referências: [Next.js 14](https://nextjs.org/docs/14/getting-started/installation),
[Tailwind no Next.js](https://nextjs.org/docs/14/app/building-your-application/styling/tailwind-css)
e [datasources do Prisma 6](https://www.prisma.io/docs/orm/v6/prisma-schema/overview/data-sources).
