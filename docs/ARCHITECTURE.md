# Arquitetura

## Base operacional pós-MVP

A migration `20260914120000_add_post_mvp_operational_domain` amplia o schema sem alterar migrations anteriores. Novas colunas de registros existentes são nullable ou possuem default compatível; `ProductionOrder.unitPrice`, `OutsourcedService.appliedUnitPrice` e todos os fatos financeiros permanecem inalterados.

A migration `20260915090000_expand_master_data` adiciona campos opcionais de contato/endereço a Company e Customer e o enum nullable `CustomerType`. A nulabilidade é intencional: nenhum registro histórico recebe documento, endereço ou tipo inventado.

`/cadastros` concentra sete abas e consulta somente os dados da aba ativa. As rotas antigas usam redirect do Next.js. Permissões de leitura/escrita são centralizadas em `src/modules/master-data/permissions.ts`, e todas as mutações continuam validadas no servidor. A interface usa tabelas com overflow horizontal e painéis `details`, sem biblioteca adicional de modal.

Produtos e insumos reutilizam `Product`, `Supply` e `ProductSupply`; a prévia em massa é visual, mas o servidor recalcula com `Prisma.Decimal` e atualiza apenas `Product.currentUnitPrice`. Categorias Financeiras reutilizam `FinancialClassification`: o grupo amigável determina `FinancialNature`, mantendo a coerência histórica. Consulta CNPJ e flag de lançamento manual permanecem fora por dependerem de decisões estruturais externas.

`ServiceInternalSector` e `ServiceContractor` são associações N:N separadas. Essa escolha mantém FKs simples e restritivas, permite vários executores para o mesmo Serviço e evita uma tabela polimórfica com duas FKs opcionais. Elas representam habilitação cadastral, não execução histórica; `OutsourcedService` mantém esse papel para trabalho externo realizado.

Após a correção `20260915000000_add_contractor_service_prices`, `ServiceContractor` também contém `unitPrice` Decimal nullable, `active` e timestamps. Essa é a única fonte de preço atual de terceirização. `ServiceInternalSector` não possui preço. A migration validou cardinalidade, copiou os cinco preços globais inequívocos e removeu `ServicePrice` para eliminar concorrência entre fontes.

`ProductSupply` usa chave composta Produto–Insumo. Um CHECK aceita consumo totalmente não configurado ou exige `quantityPerBase` Decimal positivo e `baseQuantity` inteira positiva. O cálculo proporcional fica em `src/modules/products/domain.ts`; não há estoque, movimentação ou snapshot de consumo na OP.

O CHECK `User_role_contractor_check` trata NULL explicitamente: `CONTRACTOR` exige `contractorId`, enquanto qualquer outro perfil exige valor nulo. O perfil pode ser administrado na aba Usuários, exige um Terceirizado ativo e permanece limitado à Home até existir seu portal próprio.

`OperationalIssue` usa FKs restritivas para OP, Terceirizado, Serviço Terceirizado opcional, criador e resolvedor. O CHECK de resolução exige `resolvedAt` e `resolvedByUserId` apenas em `RESOLVED`. A camada `src/modules/operational-issues/service.ts` valida também que o Serviço Terceirizado pertence à OP e ao Terceirizado indicados, regra transversal que um CHECK simples não pode consultar.

O seed cria os três setores somente quando o catálogo de setores está vazio, preservando renomes administrativos em execuções futuras. Capacidades são feitas por upsert; vínculos externos só são criados quando há exatamente um Contractor existente com nome conhecido. Nenhum Contractor é criado ou renomeado automaticamente.

## Orçamento / Previsto x Realizado

`Budget` tem unicidade `(companyId, competenceDate)` e CHECK para o primeiro dia do mês. `BudgetEntry` tem CHECK de valor não negativo, CHECK de coerência por tipo, unicidade por classificação e índice único parcial para uma Receita Bruta por Budget. Relações históricas usam `onDelete: Restrict`.

A rota `/financeiro/previsto-realizado` consulta o realizado através do módulo DRE, sem duplicar suas fórmulas. O comparativo e suas variações são derivados em memória com `Prisma.Decimal`; Budget nunca é consultado pelo Fluxo de Caixa.

`/financeiro/previsto-realizado/anual` executa três consultas limitadas ao intervalo anual: Billing, AccountPayable e Budget com entries. A agregação mensal e anual reutiliza `calculateOperationalDre`; percentuais anuais usam totais agregados.

A cópia ocorre em uma transação: valida origem, destino e classificações vivas, cria o Budget sem notes gerais e recria todas as linhas. A unicidade existente `(companyId, competenceDate)` é a barreira final contra concorrência, e `P2002` vira erro de domínio amigável. Nenhuma migration adicional foi necessária.

## Governança do orçamento

## Estornos financeiros

`PaymentReversal` e `ReceiptReversal` são relações opcionais 1:1 com unicidade e deleção restritiva. Serviços transacionais bloqueiam o fato e sua conta; Receipt bloqueia todas as contas alocadas em ordem estável. Saldos ignoram fatos estornados e o caixa registra o movimento inverso.

`BudgetStatus` e os timestamps `approvedAt`/`closedAt` possuem CHECK de coerência no PostgreSQL. Budgets anteriores foram mantidos como DRAFT por default e sem inferência histórica.

Todas as mutações carregam o Budget com `SELECT ... FOR UPDATE` dentro da mesma transação antes de validar DRAFT. Aprovação e fechamento usam o mesmo lock, tornando determinística a ordem entre edições e transições concorrentes. A UI reflete os estados, mas a proteção efetiva permanece server-side.

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
- `ServiceContractor` com preço atual por executor externo
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

O seed em `prisma/seed.mjs` é a fonte dos dados iniciais do catálogo de serviços nesta fase. Ele é idempotente e cria somente os sete Serviços confirmados e os cinco preços conhecidos nos vínculos inequívocos de Terceirizado + Serviço. Em vínculos existentes, não sobrescreve alterações cadastrais posteriores.

`Frente` e `Costas` permanecem sem preço confirmado. Não utilizar preço zero nem preço de outro Terceirizado como substituto de informação desconhecida.

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

## Serviços Terceirizados nas OPs

O catálogo de Serviços é independente do executor. Para uma nova associação à OP, a aplicação bloqueia e consulta a combinação ativa `ServiceContractor`; seu preço atual precisa estar configurado e é copiado para o lançamento. Não existe fallback global nem digitação manual do preço aplicado.

`OutsourcedService.appliedUnitPrice` é um snapshot histórico. Alterações posteriores em `ServiceContractor.unitPrice` não recalculam associações existentes. O valor previsto exibido nesta etapa é derivado por `plannedQuantity × appliedUnitPrice`, usando `Decimal` no servidor.

As quantidades operacionais não são duplicadas em `OutsourcedService`: enviada é a soma dos futuros `DeliveryNoteItem`, retornada é a soma de `OutsourcingReturn` e pendente é enviada menos retornada. A situação operacional também é derivada dessas quantidades. `approvedQuantity` permanece zero até que a futura regra de conferência para pagamento seja definida.

Após existir o primeiro `DeliveryNoteItem`, Serviço e Terceirizado ficam bloqueados para edição, preservando a coerência das movimentações. Quantidade prevista e observações continuam editáveis; o preço aplicado permanece sempre como snapshot do lançamento.

## Romaneios e numeração

Romaneios são persistidos em `DeliveryNote` e seus itens em `DeliveryNoteItem`. A criação ocorre em uma única transação Prisma: o servidor bloqueia as associações selecionadas, recalcula a quantidade já enviada, valida o saldo, confirma que todos os itens pertencem ao Terceirizado escolhido, obtém o número e grava cabeçalho e itens. O bloqueio das linhas evita que duas saídas concorrentes ultrapassem a quantidade prevista.

`DeliveryNote.number` possui unicidade global no banco. A sequence PostgreSQL `delivery_note_number_seq`, criada pela migration `20260903000000_add_delivery_note_number_sequence`, é um detalhe de infraestrutura porque o Prisma não representa declarativamente essa estratégia para um campo `String`. O acesso a `nextval` fica centralizado em `src/modules/delivery-notes/numbering.ts`; o valor é formatado com no mínimo seis dígitos e não é reutilizado. Lacunas causadas por transações abortadas são esperadas.

O Romaneio reutiliza OP, cliente, produto, serviço e terceirizado pelos relacionamentos existentes. `sentQuantity` é a soma de todos os `DeliveryNoteItem` da associação, e o saldo disponível é `plannedQuantity - sentQuantity`; nenhum dos dois é armazenado novamente. Depois de emitido, o documento é somente consultado e impresso em duas vias na mesma folha A4. Retorno, edição, exclusão, cancelamento e estorno permanecem fora desta fase.

## Retornos e painel de cobrança

Cada chegada física cria um `OutsourcingReturn` independente. A gravação bloqueia o `OutsourcedService` dentro da transação, recalcula enviado e retornado e rejeita quantidade superior ao pendente, inclusive sob concorrência. `returnedQuantity`, `pendingQuantity` e a situação permanecem derivados.

`approvedQuantity` é o total acumulado explicitamente confirmado no Serviço Terceirizado e nunca aumenta automaticamente com um Retorno. O valor aprovado é derivado por `approvedQuantity × appliedUnitPrice`. O painel de cobrança inclui somente pendências maiores que zero; “dias fora” usa a data da saída mais recente como simplificação operacional e não representa atraso.

## Fechamentos de terceirizados

Os fechamentos usam `ContractorSettlement` e `ContractorSettlementItem`. O rascunho é mutável por Server Actions protegidas no servidor; depois de aprovado, todos os caminhos de mutação rejeitam alterações. O preço do item é copiado de `OutsourcedService.appliedUnitPrice` na inclusão e permanece como snapshot.

A aprovação executa em transação Prisma, ordena os IDs e bloqueia as linhas de `OutsourcedService` com `SELECT ... FOR UPDATE`. Após adquirir os locks, relê apenas itens de fechamentos aprovados e valida o saldo elegível. Um teste concorrente no PostgreSQL `genect_dev` confirmou uma aprovação e uma rejeição por saldo insuficiente, sem timeout ou deadlock.

Rascunhos não entram no cálculo de saldo consumido. Quantidades liquidadas, elegíveis, subtotais e totais são derivados. Retorno físico, aprovação, fechamento, Conta a Pagar e pagamento permanecem conceitos separados; apenas fechamentos aprovados podem originar uma Conta a Pagar.

## Contas a pagar de fechamentos

`ContractorSettlement.companyId` torna o fechamento monoempresa. A aplicação valida Company na inclusão e aprovação. `AccountPayable` mantém relação 1:1 por FK única, valor snapshot em `Decimal(14,4)`, competência mensal como primeiro dia e vencimento comercial independente.

`Payment` registra a saída efetiva em `Decimal(14,4)` e `date`, relacionado à Conta a Pagar com `onDelete: Restrict`, sem duplicar Company. Pago, saldo e situação são derivados. A criação bloqueia a linha de `AccountPayable` com `SELECT ... FOR UPDATE`, relê a conta e seus pagamentos pelo client transacional e rejeita consumo acima do saldo. Isso serializa pagamentos concorrentes da mesma conta. Fechamento ≠ Conta a Pagar ≠ Pagamento; somente `Payment.paymentDate` alimentará como saída realizada o futuro Fluxo de Caixa.

## Faturamento registrado e contas a receber

`Billing` registra uma NFe emitida externamente e não contém recursos de emissão fiscal. A OP é bloqueada com `SELECT ... FOR UPDATE`; Billing e AccountReceivable são gravados na mesma transação. `productionOrderId` único impede mais de um faturamento por OP. `companyId` é copiado da OP e, com `invoiceNumber`, forma a unicidade da NFe por empresa.

`Billing.amount` é um snapshot independente do valor previsto da OP. `AccountReceivable` copia Company, Customer, valor e competência da origem como snapshots financeiros e mantém o vencimento próprio. Checks SQL exigem valores positivos. Todas as FKs históricas usam `onDelete: Restrict`. Sem Receipt, recebido, saldo e situação são derivados; a Conta a Receber não representa entrada realizada. OP ≠ Faturamento ≠ Conta a Receber ≠ Recebimento.

## Recebimentos e alocações

`Receipt` é a fonte de verdade de uma única entrada real, vinculada a uma Company e um Customer. `ReceiptAllocation` distribui essa entrada entre várias Contas a Receber, sem criar novas entradas de caixa. A soma das alocações deve ser exatamente igual ao valor do Receipt.

A criação é atômica: deduplica e ordena os IDs, bloqueia `AccountReceivable` com `SELECT ... FOR UPDATE`, relê alocações anteriores, valida saldo, Company e Customer e cria Receipt com todas as alocações. Checks SQL exigem valores positivos e FKs usam `onDelete: Restrict`. Recebido, saldo e situação permanecem derivados. Receipt e alocações são imutáveis nesta versão.

## Fluxo de Caixa derivado

Não existe tabela `CashFlow` ou `CashFlowEntry`. A camada `src/modules/cash-flow` consulta diretamente Receipts e Payments para o realizado e saldos remanescentes das contas por vencimento para o previsto. Receipt é contado uma única vez; suas alocações apenas derivam o saldo das Contas a Receber.

As consultas filtram Company e período no PostgreSQL e carregam relacionamentos em lote, sem N+1. Agregação diária, totais, líquido e saldos usam `Prisma.Decimal`. Vencidos anteriores ao período são calculados separadamente. A tela não representa saldo bancário, não usa competência e não mistura Fluxo de Caixa com DRE.

## Classificações financeiras e Contas a Pagar manuais

`FinancialClassification` é um catálogo global com código técnico único e estável. `AccountPayable` mantém a FK viva e snapshots imutáveis de código, nome e `DreGroup`, impedindo que alterações cadastrais reclassifiquem meses históricos. O grupo de uma classificação em uso é bloqueado na aplicação e todas as FKs históricas usam `onDelete: Restrict`.

O catálogo é financeiro gerencial amplo. `FinancialNature` possui `OPERATING_EXPENSE`, `DRE_POST_OPERATING` e `NON_DRE`. A primeira exige grupo variável/fixo, a segunda exige um grupo pós-operacional e a terceira exige grupo nulo. CHECK constraints repetem a coerência em `FinancialClassification` e nos snapshots de `AccountPayable`; Conta a Pagar rejeita especificamente receita financeira. Natureza e grupo ficam bloqueados quando a classificação já está em uso.

O Fluxo de Caixa continua derivado de obrigações e pagamentos independentemente da natureza. A DRE usa snapshots operacionais e pós-operacionais; `NON_DRE` nunca entra em sua fórmula. Resultado Líquido Gerencial é derivado, não persistido. Empréstimos, investimentos, reservas e distribuições não foram implementados.

O seed idempotente mantém 13 códigos oficiais: 11 operacionais, `FINANCIAL_EXPENSES` e `INCOME_TAXES`. Para preservar decisões administrativas e o histórico, conflitos existentes são apenas reativados; o seed não reclassifica automaticamente cadastros existentes. O plano é gerencial, não fiscal.

`AccountPayableSource` distingue `CONTRACTOR_SETTLEMENT` e `MANUAL`; uma CHECK constraint garante a presença ou ausência coerente de `contractorSettlementId`. Contas manuais exigem beneficiário snapshot, classificação ativa, competência mensal e valor Decimal positivo. O fluxo de Fechamento busca `OUTSOURCED_PRODUCTION` e copia automaticamente classificação e beneficiário.

A futura DRE será consultada diretamente de Billing e AccountPayable por competência e Company. Não existe tabela de DRE e Payment/Receipt permanecem fontes exclusivas do caixa realizado.

## DRE Gerencial operacional

`src/modules/dre/domain.ts` contém somente cálculos puros em `Prisma.Decimal`; `queries.ts` filtra Billing e AccountPayable no PostgreSQL por Company e intervalo mensal de competência. A receita é consultada uma única vez em Billing. As despesas usam `originalAmount` e os snapshots de classificação, sem joins necessários ao cadastro atual e sem consultar Payments ou Receipts.

A rota `/financeiro/dre` exige Company, mês e ano, apresenta totais, percentuais e composição auditável até o Resultado Líquido Gerencial. Nenhum total é persistido. Receitas Financeiras permanecem zero nesta versão porque não existe fato de origem adequado; Billing e Receipt não são usados artificialmente. A visão não constitui demonstração contábil/fiscal oficial.

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

## Autenticação e autorização

`User` representa a identidade interna e `Session` armazena somente o hash SHA-256 de um token aleatório. A senha usa `scrypt` com salt individual. O navegador recebe o token em cookie inacessível a JavaScript; a aplicação invalida sessões expiradas ou pertencentes a usuário inativo.

O `proxy.ts` protege páginas e filtra acesso por área. Toda Server Action também deve chamar `requireUser` com a permissão de mutação correspondente, pois ocultar links não constitui autorização. Os perfis são ADMIN, FINANCE, OPERATIONS e VIEWER.

Campos opcionais de autoria preservam compatibilidade com fatos anteriores à autenticação. Nos novos fluxos, o usuário autenticado é registrado em aprovação/fechamento de orçamento, Conta a Pagar manual, pagamento, recebimento e estornos.

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

## Workspace da Ordem de Produção

`/ops` é uma fachada operacional, não uma nova fonte de verdade. A página agrega `ProductionOrder`, serviços internos, `OutsourcedService`, romaneios, retornos, pendências, Billing, AccountReceivable, Receipt e estornos.

A migration `20260915120000_expand_production_order_workspace` adiciona prazo e autoria opcionais, `InternalProductionService` e `ProductionOrderSupply`. Registros anteriores continuam válidos.

A criação da OP é transacional: valida Empresa, Produto e Cliente, copia o preço atual e cria snapshots de insumo. A geração de Romaneio é centralizada em `delivery-notes/service.ts`; retorno e aprovação reutilizam `outsourcing/return-service.ts`.

Ciclo, progresso, Montagem, atraso, valores e saldos são derivados. A timeline projeta fatos existentes, sem tabela duplicada.

## Home operacional e Kanban

A rota `/` consulta OPs e relacionamentos operacionais em lote por meio de `src/modules/production-orders/dashboard-queries.ts` e monta a projeção em `src/modules/production-orders/dashboard.ts`. A página não grava dados e não possui Server Actions de movimentação.

O Kanban mantém colunas separadas para Setores Internos, Terceirizados e Montagem. Cada card representa `OP + Serviço + Executor`; a mesma OP pode aparecer em vários responsáveis. Serviços concluídos são omitidos por padrão e reaparecem apenas com filtro explícito.

O bloco `Precisam de atenção` usa a mesma projeção para priorizar pendências abertas/em tratamento, bloqueios por pendência, atrasos, urgência, aguardando complemento e previsão geral vencida. Atraso usa `expectedReturnDate` e data operacional de Fortaleza, sem persistir status.

Nenhuma migration foi criada nesta etapa. O painel reutiliza `InternalProductionService`, `OutsourcedService`, `OperationalIssue`, `DeliveryNoteItem` e `OutsourcingReturn`.
