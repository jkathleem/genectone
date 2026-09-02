# Decisões

Este documento registra decisões arquiteturais e de produto conhecidas nesta etapa, além de decisões pendentes.

## Decisões confirmadas

### DEC-001 - Documentação antes da implementação

Decisão confirmada:

- O projeto começará pela documentação inicial antes de qualquer funcionalidade.

### DEC-002 - Informação registrada uma única vez

Decisão confirmada:

- A informação deve ser cadastrada uma única vez no momento em que o fato ocorre.

Consequência:

- Módulos posteriores devem reutilizar ou derivar informações dos registros originais.

### DEC-003 - OP nasce antes da terceirização

Decisão confirmada:

- A OP existe antes dos Serviços Terceirizados.

Consequência:

- Nenhum Serviço Terceirizado deve ser criado sem OP correspondente.

### DEC-004 - OP como entidade operacional central

Decisão confirmada:

- A OP será a entidade operacional central do sistema.

Consequência:

- Serviços Terceirizados, romaneios, faturamento, contas a receber, relatórios e visões gerenciais devem reutilizar dados da OP quando aplicável.

### DEC-005 - Cadastro manual de Serviços Terceirizados por OP

Decisão confirmada:

- O usuário cadastra manualmente os Serviços Terceirizados necessários para cada OP.

Consequência:

- O MVP não terá geração automática de serviços baseada no produto.

### DEC-006 - Sem roteiro produtivo no MVP

Decisão confirmada:

- Não haverá roteiro produtivo no MVP.

Consequência:

- Não haverá roteiro produtivo por produto, dependências configuráveis entre etapas, workflow produtivo complexo, motor de sequência de produção ou execução interna detalhada.

### DEC-007 - Frente e Costas como Serviços Terceirizados normais

Decisão confirmada:

- Frente e Costas são Serviços Terceirizados normais quando cadastrados para uma OP.

Consequência:

- Não haverá entidade especial "Frente e Costas".
- Frente e Costas devem ser apenas Serviços cadastrados e reutilizáveis.

### DEC-008 - Serviços Terceirizados e romaneios derivam de OP existente

Decisão confirmada:

- Serviços Terceirizados e romaneios sempre derivam de uma OP existente.

Consequência:

- O sistema nunca deve criar uma OP a partir de um romaneio.

### DEC-009 - Eliminação de redigitação

Decisão confirmada:

- O sistema deve eliminar redigitação utilizando dados já cadastrados.

Consequência:

- Romaneios, Serviços Terceirizados, faturamento, contas e relatórios devem reutilizar ou derivar dados de origem.

### DEC-010 - Romaneio pertence a um terceirizado

Decisão confirmada:

- Um Romaneio pertence a exatamente um terceirizado.

Consequência:

- Se itens saírem para terceirizados diferentes, devem estar em romaneios diferentes.

### DEC-011 - Romaneio pode conter diferentes OPs, referências e serviços

Decisão confirmada:

- Um Romaneio pode conter diferentes OPs, referências, clientes e serviços, desde que todos estejam indo para o mesmo terceirizado.

Consequência:

- O romaneio terá vários Itens de Romaneio, cada um vinculado a um Serviço Terceirizado e a uma quantidade enviada naquela movimentação.

### DEC-012 - Serviço Terceirizado pode ter múltiplas saídas

Decisão confirmada:

- Um Serviço Terceirizado pode possuir múltiplas saídas.

Consequência:

- A quantidade enviada pode ser derivada da soma das movimentações de saída relacionadas.

### DEC-013 - Serviço Terceirizado pode ter múltiplos retornos

Decisão confirmada:

- Um Serviço Terceirizado pode possuir múltiplos retornos.

Consequência:

- A quantidade retornada deve ser derivada da soma dos retornos.
- O histórico não deve ser reduzido a uma única data de retorno.

### DEC-014 - Quantidades são conceitos distintos

Decisão confirmada:

- Quantidade prevista, enviada, retornada, aprovada para pagamento e pendente são conceitos distintos.
- Quantidade retornada e quantidade aprovada para pagamento são conceitos diferentes.

Consequência:

- O modelo deve preservar essas diferenças para controle operacional, painel de cobrança e fechamento.

### DEC-015 - Quantidade pendente é derivada

Decisão confirmada:

- Quantidade pendente é derivada e não digitada.

Consequência:

- Quantidade pendente deve ser calculada como quantidade enviada menos quantidade retornada.

### DEC-016 - Preço aplicado historicamente preservado

Decisão confirmada:

- O preço aplicado deve ficar historicamente preservado no Serviço Terceirizado.

Consequência:

- Alterar o preço padrão futuramente não pode alterar Serviços Terceirizados antigos.
- O fechamento nunca deve recalcular serviço antigo usando preço atual do cadastro.

### DEC-017 - Tabela de preços configurável

Decisão confirmada:

- A tabela inicial de preços de serviços terceirizados deve ser configurável.

Consequência:

- Esses preços não devem ser tratados futuramente como constantes fixas no código.

### DEC-018 - Fechamento por quantidade aprovada

Decisão confirmada:

- O valor a pagar deve usar quantidade aprovada para pagamento multiplicada pelo preço unitário aplicado.

Consequência:

- O modelo deve suportar conferência e ajuste entre quantidade retornada e quantidade aprovada para pagamento.

### DEC-019 - Rastreabilidade contra pagamento duplicado

Decisão confirmada:

- O Serviço Terceirizado não deve ser pago novamente em outro fechamento pela mesma quantidade já incluída anteriormente.

Consequência:

- O fechamento deve preservar quais serviços e quantidades foram incluídos.

### DEC-020 - OP cadastrada não é receita realizada automaticamente

Decisão confirmada:

- Uma OP cadastrada não deve ser assumida automaticamente como receita realizada contabilmente.

Consequência:

- O sistema deve distinguir OP recebida, valor previsto da OP, faturamento, conta a receber, recebimento financeiro e receita reconhecida no DRE.

### DEC-021 - Fluxo de caixa e DRE são visões diferentes

Decisão confirmada:

- Fluxo de caixa e DRE devem ser tratados como conceitos diferentes.

Consequência:

- Data de competência, vencimento e pagamento ou recebimento devem ser preservadas como informações distintas.

### DEC-022 - Cada OP possui sua própria NFe/Faturamento

Decisão confirmada:

- Cada OP possui sua própria NFe/Faturamento no MVP.

Consequência:

- A relação conceitual do MVP é 1 OP para 1 NFe / Faturamento.
- O MVP não deve criar faturamento agrupando várias OPs em uma mesma NFe.
- A NFe deve reutilizar dados já existentes da OP sempre que aplicável.

### DEC-023 - Produto principal por OP no MVP

Decisão confirmada:

- Uma OP possui um Produto / Referência principal no MVP.

Consequência:

- Não será criada estrutura de múltiplos produtos por OP neste momento.
- Essa regra pode ser revista futuramente se houver necessidade operacional real.

### DEC-024 - Recebimento pode corresponder a várias OPs/NFes

Decisão confirmada:

- Um pagamento recebido pode corresponder a várias OPs/NFes.

Consequência:

- O sistema deve permitir distribuir um Recebimento entre várias Contas a Receber.

### DEC-025 - Recebimento é entrada financeira real única

Decisão confirmada:

- Um Recebimento representa uma entrada financeira real única.

Consequência:

- O sistema não deve criar múltiplos recebimentos bancários quando houve apenas uma transferência.
- O Fluxo de Caixa realizado deve considerar o Recebimento real, e não somar novamente suas alocações como entradas separadas.

### DEC-026 - Alocações de Recebimento distribuem o valor recebido

Decisão confirmada:

- A distribuição de um Recebimento entre Contas a Receber deve ocorrer através de Alocações de Recebimento.

Consequência:

- Um Recebimento pode ser distribuído entre várias Contas a Receber.
- Uma Conta a Receber pode ser quitada por mais de um Recebimento.
- A relação entre Recebimento e Conta a Receber é muitos-para-muitos, resolvida por Alocação de Recebimento.

### DEC-027 - Valor recebido e saldo a receber são derivados

Decisão confirmada:

- Valor recebido e saldo a receber devem ser derivados.

Consequência:

- Valor recebido de uma Conta a Receber deve ser calculado pela soma das Alocações de Recebimento vinculadas.
- Saldo a receber deve ser calculado pelo valor original da Conta a Receber menos o valor recebido.

### DEC-028 - Conta a Pagar possui Pagamento

Decisão confirmada:

- Conta a Pagar deve possuir conceitualmente Pagamento.

Consequência:

- Pagamento representa a saída financeira efetivamente realizada.
- Pagamento alimenta o Fluxo de Caixa como saída realizada.

### DEC-029 - Status operacional calculável deve ser derivado

Decisão confirmada:

- Status operacionais calculáveis de Serviço Terceirizado devem ser derivados.

Consequência:

- Estados como AGUARDANDO ENVIO, EM TERCEIRIZAÇÃO, RETORNO PARCIAL e RETORNADO não devem depender de digitação manual.
- Estados excepcionais como CANCELADO e SUSPENSO podem futuramente ser armazenados explicitamente.
- Ainda não será definida enumeração técnica definitiva.

### DEC-030 - Stack e arquitetura iniciais

Decisão confirmada:

- A arquitetura inicial do sistema será um monólito modular em Next.js com App Router, utilizando React, TypeScript com `strict` habilitado, PostgreSQL, Prisma e Tailwind CSS.

Consequência:

- Frontend e backend permanecerão na mesma aplicação Next.js nesta etapa.
- Os módulos serão organizados por domínio e detalhados apenas conforme a necessidade de cada fase.

### DEC-031 - Primeiro schema físico limitado ao núcleo operacional

Decisão confirmada:

- A primeira modelagem física contém apenas Company, Customer, Product, ProductionOrder, Contractor, Service, ServicePrice, OutsourcedService, DeliveryNote, DeliveryNoteItem e OutsourcingReturn.

Consequência:

- Fechamentos, financeiro, faturamento, recebimentos, DRE, fluxo de caixa, orçamento, autenticação e usuários permanecem fora desta migration.
- Todos os identificadores são internos e usam `String` com `cuid()`; números de OP e romaneio continuam como identificadores de negócio separados.

### DEC-032 - Fonte da quantidade aprovada nesta fase

Decisão confirmada para o primeiro schema:

- `approvedQuantity` será armazenada somente em `OutsourcedService`.
- `OutsourcingReturn` registra apenas o retorno físico e não duplica a quantidade aprovada.

Consequência:

- Continua pendente definir quando um Serviço Terceirizado se torna elegível para pagamento e se a quantidade retornada será sugerida automaticamente para conferência.
- Uma futura modelagem de fechamento deverá preservar as quantidades já incluídas sem transformar o retorno físico em aprovação automática.

### DEC-033 - Escopo dos números de OP e romaneio

Decisão técnica desta fase:

- O número da OP é único dentro de uma empresa, por meio de `@@unique([companyId, number])`, e não globalmente.
- O número do romaneio é indexado, mas não possui unicidade enquanto seu escopo de numeração não estiver confirmado.

Consequência:

- A decisão sobre unicidade do número de romaneio permanece aberta e poderá ser reforçada em migration futura, sem assumir regra não documentada.

### DEC-034 - Integridade histórica e invariantes de aplicação

Decisão confirmada para o primeiro schema:

- Relações do núcleo operacional usam deleção restritiva e não usam cascata.
- Datas comerciais são persistidas como `date` no PostgreSQL.
- Valores monetários usam `Decimal(14,4)`.
- Não haverá enum técnica para status operacional calculável ou excepcional nesta fase.

Consequência:

- Cadastros reutilizáveis serão desativados por `active` em vez de apagar registros históricos.
- Regras transacionais, como quantidades positivas, retorno não superior ao enviado e compatibilidade entre o terceirizado do romaneio e o dos itens, deverão ser validadas na futura camada de domínio/aplicação.

### DEC-035 - PostgreSQL local isolado por Docker

Decisão confirmada:

- O ambiente local de desenvolvimento utiliza PostgreSQL 16 em um container Docker exclusivo, com banco lógico `genect_dev` e volume nomeado `genect_postgres_data`.
- A porta do PostgreSQL é publicada somente em `127.0.0.1`.

Consequência:

- Outros containers e bancos locais não são reutilizados ou modificados pelo projeto Genect.
- Migrations versionadas são a fonte da estrutura e o volume mantém o estado entre reinicializações.
- Credenciais ficam somente no `.env` ignorado; arquivos versionados usam placeholders.

### DEC-036 - Seed inicial do catálogo de serviços

Decisão confirmada:

- O seed inicial cria Preparação Frente, Pala e Gancho, Frente Completa, Final Frente, Preparação e Bolso Traseiro, Frente e Costas.
- Somente os cinco serviços com preços confirmados recebem `ServicePrice`.
- Frente e Costas permanecem sem preço; valor zero não representa preço desconhecido.
- `2026-09-02` é a data técnica inicial das referências inseridas pelo seed, sem significado histórico ou contratual anterior ao sistema.

Consequência:

- O seed localiza serviços pelo nome e preços equivalentes por serviço, valor, início e fim de vigência, podendo ser executado novamente sem duplicação.
- Não são criados dados fictícios de empresas, clientes, produtos, OPs ou terceirizados.

### DEC-037 - Primeira interface operacional com Server Actions

Decisão confirmada:

- Cadastros básicos e OPs usam Server Components para leitura, Server Actions para escrita e Zod para validação obrigatória no servidor.
- Empresas, clientes, produtos e terceirizados são desativados por `active`; a interface não expõe exclusão física.
- O valor total da OP continua derivado de quantidade multiplicada pelo preço unitário em `Decimal`.
- Registros inativos não aparecem em seletores de novas OPs, mas permanecem visíveis nos históricos e disponíveis ao editar uma OP que já os utiliza.

Consequência:

- Não foi criada API REST interna para o próprio frontend.
- Autenticação, cancelamento e regras futuras de bloqueio de edição continuam pendentes e não foram presumidas nesta fase.

## Decisões pendentes

- DECISÃO PENDENTE: definir perfis de usuários e permissões.
- DECISÃO PENDENTE: definir campos obrigatórios dos cadastros de empresa, cliente, produto e terceirizado.
- DECISÃO PENDENTE: definir todos os campos de produção de uma OP.
- DECISÃO PENDENTE: definir quais são as demais informações comerciais necessárias na OP.
- DECISÃO PENDENTE: definir ciclo de vida e status da OP.
- DECISÃO PENDENTE: definir ciclo de vida e status excepcionais dos Serviços Terceirizados.
- DECISÃO PENDENTE: definir o escopo de unicidade do número do romaneio.
- DECISÃO PENDENTE: definir quando um Serviço Terceirizado é considerado elegível para pagamento.
- DECISÃO PENDENTE: definir se o sistema deverá preencher inicialmente a quantidade aprovada para pagamento com o mesmo valor da quantidade retornada para o usuário apenas confirmar ou ajustar.
- DECISÃO PENDENTE: definir se uma Conta a Pagar poderá possuir múltiplos pagamentos parciais.
- DECISÃO PENDENTE: definir formato e informações do recibo de fechamento.
- DECISÃO PENDENTE: definir aprovação, cancelamento, estorno e reabertura de fechamentos.
- DECISÃO PENDENTE: definir se há aprovação obrigatória antes de faturar uma OP.
- DECISÃO PENDENTE: definir exatamente em qual momento e com qual data o valor de uma OP deve entrar como receita no DRE gerencial.
- DECISÃO PENDENTE: definir categorias de receitas e despesas para DRE.
- DECISÃO PENDENTE: definir tratamento de impostos, investimentos e reservas no DRE.
- DECISÃO PENDENTE: definir estrutura do orçamento e níveis de comparação Previsto x Real.
- DECISÃO PENDENTE: definir relatórios e dashboards prioritários.
- DECISÃO PENDENTE: definir necessidade de importação de dados históricos das planilhas atuais.
