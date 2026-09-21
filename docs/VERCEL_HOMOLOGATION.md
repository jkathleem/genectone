# Homologação no Vercel

Este documento registra a preparação segura para homologar o sistema Genect no Vercel usando um PostgreSQL remoto separado do banco local `genect_dev`.

## Escopo

- A homologação deve usar banco PostgreSQL remoto próprio, sem reutilizar o banco local.
- O ambiente local Docker/WSL continua sendo apenas desenvolvimento.
- Nenhum recurso externo deve ser criado automaticamente pelo repositório.
- Nenhuma migration antiga deve ser editada.
- Nenhum comando destrutivo deve ser usado contra homologação.

## Variáveis de ambiente

Obrigatórias no Vercel:

- `DATABASE_URL`: conexão PostgreSQL usada pelo Prisma Client, pelo build com `prisma generate` e pelo runtime.

Obrigatórias somente quando o seed precisar criar o primeiro administrador:

- `SEED_ADMIN_NAME`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

Variáveis locais do Docker, como `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB`, são apenas conveniência de desenvolvimento local e não substituem a configuração do banco remoto.

## Banco remoto

O banco remoto de homologação deve ser criado manualmente em um provedor PostgreSQL compatível antes do deploy. Não há provedor escolhido neste repositório.

Quando o provedor oferecer URLs diferentes para runtime e migrations:

- usar a URL com pool de conexões em `DATABASE_URL` para o runtime serverless;
- aplicar migrations com uma conexão direta segura, se o provedor exigir essa separação operacional.

O `prisma.config.ts` atual lê `DATABASE_URL`. Portanto, se for necessário usar uma URL direta só para migrations, execute o comando de deploy em um ambiente controlado onde `DATABASE_URL` aponte temporariamente para essa URL direta.

## Migrations

Em homologação, aplicar somente:

```bash
npm run db:deploy
```

Esse script executa `prisma migrate deploy`, que aplica migrations versionadas já existentes.

Não usar em homologação:

- `prisma migrate dev`
- `prisma db push`
- `prisma migrate reset`
- remoção manual de tabelas
- reset do banco

## Seed

O seed é idempotente para catálogos oficiais e pode criar o primeiro usuário ADMIN somente quando as variáveis `SEED_ADMIN_*` estiverem preenchidas.

Antes de executar seed em homologação, conferir:

- se o banco alvo é realmente o banco de homologação;
- se as credenciais do ADMIN são temporárias e serão trocadas;
- se não há intenção de popular dados de teste indevidos.

Comando:

```bash
npm run db:seed
```

## Build e runtime

O script de build executa:

```bash
prisma generate && next build
```

Por isso, `DATABASE_URL` precisa estar configurada também durante o build no Vercel.

A autenticação usa sessões opacas persistidas no PostgreSQL e cookie `HttpOnly`. Em produção, o cookie usa `Secure` automaticamente porque depende de `NODE_ENV=production`.

## Limitações conhecidas

- Não existe `.vercel/` nem `vercel.json` versionado neste momento.
- O projeto não está vinculado ao Vercel pelo repositório local.
- O repositório não contém URL de banco remoto nem segredos.
- Uploads/arquivos persistentes não fazem parte do runtime atual.

