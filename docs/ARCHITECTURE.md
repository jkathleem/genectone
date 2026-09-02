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

Frontend e backend ficarão no mesmo projeto Next.js. Futuras operações de escrita e leitura devem usar recursos do próprio Next.js, como Server Components, Server Actions ou Route Handlers, conforme a necessidade da fase.

Não haverá backend separado, microserviços ou arquitetura distribuída nesta etapa.

## Banco de dados e Prisma

O banco principal será PostgreSQL. Prisma será usado como ORM.

Nesta etapa existe apenas um `schema.prisma` inicial válido, sem modelos de domínio. O modelo completo do banco será criado em fase posterior, depois de nova revisão de `docs/DOMAIN_MODEL.md` e `docs/BUSINESS_RULES.md`.

Não transformar automaticamente o modelo de domínio em schema SQL sem revisão.

## Dinheiro e precisão decimal

Valores financeiros não devem utilizar números de ponto flutuante do JavaScript como fonte de verdade.

Quando o banco for modelado:

- Valores monetários devem usar tipo decimal apropriado do PostgreSQL/Prisma.
- Cálculos financeiros devem preservar precisão decimal.
- Nunca utilizar `Float` para armazenar dinheiro.

## Datas e timezone

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

Nesta etapa não serão criadas funções complexas de timezone.

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
