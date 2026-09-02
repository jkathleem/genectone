# Arquitetura

## Stack

- Next.js `16.2.6` com App Router.
- TypeScript com `strict` habilitado.
- PostgreSQL.
- Prisma ORM `7.8.0`.
- Tailwind CSS `4.3.0`.
- ESLint `9.39.5`.
- Node.js 24 LTS quando disponível.

## Motivo da escolha

A aplicação será um monólito modular. Next.js permite manter frontend e backend no mesmo projeto, com rotas, telas e futuras APIs organizadas em uma única base. PostgreSQL e Prisma formam uma base relacional adequada para dados operacionais e financeiros, preservando integridade e rastreabilidade.

O Prisma foi fixado em `7.8.0` nesta base inicial para evitar usar release candidate como dependência de produção.

## Arquitetura monolítica modular

O sistema começa como um único projeto Next.js. A organização por módulos deve evitar uma pasta genérica com toda a lógica do sistema.

Módulos inicialmente reservados:

- `companies`
- `customers`
- `products`
- `production-orders`
- `outsourcing`
- `delivery-notes`
- `contractors`
- `service-catalog`
- `contractor-settlements`
- `billing`
- `accounts-receivable`
- `receipts`
- `accounts-payable`
- `payments`
- `cash-flow`
- `dre`
- `budget`

Cada módulo poderá conter `domain`, `application`, `infrastructure` e `ui` quando necessário. Essas camadas não devem ser criadas antes de existir necessidade real.

## Organização de pastas

- `docs/`: documentação de produto, regras, domínio, decisões e arquitetura.
- `prisma/`: configuração do Prisma.
- `src/app/`: App Router, layout e páginas.
- `src/components/`: componentes compartilhados quando forem necessários.
- `src/lib/`: bibliotecas internas e integrações comuns.
- `src/modules/`: organização modular dos domínios.
- `src/generated/`: código gerado por ferramentas, como Prisma Client.

## Comunicação entre frontend e backend

Os cadastros básicos e as OPs usam Server Components para consultas e Server Actions para gravações. A validação com Zod ocorre no servidor, antes do acesso ao Prisma; o frontend mantém apenas feedback imediato e o cálculo visual estimado.

O acesso ao Prisma permanece fora dos componentes puramente visuais. Erros técnicos do ORM não são apresentados diretamente ao usuário.

Frontend e backend ficarão no mesmo projeto Next.js. Futuras operações de escrita e leitura devem usar recursos do próprio Next.js, como Server Components, Server Actions ou Route Handlers, conforme a necessidade da fase.

Não haverá backend separado, microserviços ou arquitetura distribuída nesta etapa.

## Banco de dados e Prisma

O banco principal será PostgreSQL. Prisma será usado como ORM.

O primeiro schema físico cobre somente o núcleo operacional inicial:

- `Company`
- `Customer`
- `Product`
- `ProductionOrder`
- `Contractor`
- `Service`
- `ServicePrice`
- `OutsourcedService`
- `DeliveryNote`
- `DeliveryNoteItem`
- `OutsourcingReturn`

A migration inicial `20260902000000_initial_operational_schema` foi aplicada ao banco local de desenvolvimento `genect_dev`. As migrations versionadas em `prisma/migrations` permanecem como fonte de verdade da estrutura; credenciais de exemplo nunca devem ser usadas para executá-las.

Entidades financeiras, fechamento, autenticação, usuários e demais módulos continuam fora do schema desta fase.

Não transformar automaticamente o modelo de domínio em schema SQL sem revisão.

## Banco local de desenvolvimento

O desenvolvimento local usa PostgreSQL `16` em um container Docker exclusivo do projeto:

- Serviço Compose: `postgres`.
- Container: `genect_postgres_dev`.
- Banco lógico: `genect_dev`.
- Porta: `5432`, vinculada somente a `127.0.0.1`.
- Volume nomeado: `genect_postgres_data`.

O volume preserva migrations e dados entre reinicializações do container. Não utilizar `docker compose down -v`, salvo decisão explícita de descartar o banco local.

As migrations versionadas em `prisma/migrations/` são a fonte da estrutura do banco. Não usar `db push` como substituto do histórico de migrations.

O arquivo `.env` contém apenas a configuração local e permanece ignorado pelo Git. `.env.example` documenta as variáveis com placeholders e nunca deve conter credenciais reais.

## Dados iniciais de referência

O seed em `prisma/seed.mjs` é a fonte dos dados iniciais do catálogo de serviços nesta fase. Ele é idempotente e cria somente os sete Serviços confirmados e os cinco preços conhecidos.

Os preços usam `2026-09-02` como data técnica de início da referência dentro do sistema. Essa data não afirma quando o preço começou a vigorar historicamente ou contratualmente.

`Frente` e `Costas` são cadastrados sem `ServicePrice`, pois ainda não existe preço confirmado. Não utilizar preço zero como substituto de informação desconhecida.

## Dinheiro e precisão decimal

O preço unitário da OP é validado e persistido como `Decimal`. O valor total é sempre derivado por `quantity × unitPrice`, sem coluna própria; somente a prévia visual do formulário usa números do navegador.

Valores financeiros não devem utilizar números de ponto flutuante do JavaScript como fonte de verdade.

Quando o banco for modelado:

- Valores monetários devem usar tipo decimal apropriado do PostgreSQL/Prisma.
- Cálculos financeiros devem preservar precisão decimal.
- Nunca utilizar `Float` para armazenar dinheiro.

## Datas e timezone

Os formulários transmitem datas no formato `YYYY-MM-DD`; a aplicação cria e formata essas datas usando UTC como representação neutra do dia comercial, evitando deslocamento para o dia anterior.

O sistema possui conceitos diferentes de data:

- Data de entrada.
- Data de saída.
- Data de retorno.
- Competência.
- Vencimento.
- Pagamento.
- Recebimento.

Esses conceitos não devem ser misturados automaticamente.

Datas puramente comerciais ou contábeis devem ser tratadas com cuidado para evitar mudança de dia por timezone. O timezone operacional da empresa é `America/Fortaleza`.

Datas puramente comerciais do núcleo operacional usam colunas PostgreSQL `date`. A aplicação deverá tratar esses valores como dias de calendário e evitar conversões automáticas entre UTC e `America/Fortaleza` que alterem o dia. Nesta etapa não serão criadas funções complexas de timezone.

## Integridade referencial do núcleo operacional

- Relações históricas usam `onDelete: Restrict`; exclusões em cascata não são usadas no núcleo operacional.
- Cadastros reutilizáveis possuem `active` para desativação sem apagar histórico.
- Quantidade enviada, retornada e pendente não são colunas de `OutsourcedService`; serão derivadas dos itens de romaneio e retornos.
- `approvedQuantity` é armazenada somente em `OutsourcedService` nesta fase.
- A igualdade entre o terceirizado do romaneio e o terceirizado de todos os serviços de seus itens é uma invariável futura da camada de domínio/aplicação.

## Identificadores

O banco deve ser planejado com identificadores internos independentes dos identificadores de negócio.

Exemplos:

- Uma OP pode possuir `id` interno e `numeroOP`.
- O número da OP não precisa ser chave primária.
- O mesmo princípio vale para número da NFe, número do Romaneio, documentos de clientes e documentos de terceirizados.

## Variáveis de ambiente

Credenciais reais não devem ser versionadas.

- `.env` guarda valores locais e deve ficar fora do Git.
- `.env.example` documenta as variáveis necessárias sem segredos.
- `DATABASE_URL` será usada pelo Prisma para conexão com PostgreSQL.

## Autenticação futura

Autenticação completa não será implementada nesta etapa.

Quando o tema for retomado, deve respeitar os perfis e permissões definidos nos documentos de negócio. Enquanto essa decisão estiver pendente, agentes não devem inventar papéis de usuário.

## Auditoria futura

Como o sistema terá informações financeiras e operacionais, entidades importantes deverão futuramente possuir informações como `createdAt` e `updatedAt`.

Operações financeiras críticas poderão exigir histórico ou auditoria detalhada. Não implementar auditoria complexa nesta etapa.

## Convenções básicas

- Ler `docs/` antes de alterar regras de negócio.
- Manter TypeScript strict.
- Evitar `any` sem justificativa.
- Não duplicar dados que possam ser derivados.
- Implementar uma fase por vez.
- Não misturar DRE com Fluxo de Caixa.
- Não assumir que OP cadastrada significa receita realizada.
- Não assumir que quantidade retornada significa quantidade paga.
