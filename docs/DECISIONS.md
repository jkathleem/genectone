# Decisões

## Fechamento de terceirizados

- Retorno físico ≠ Aprovação ≠ Fechamento ≠ Pagamento.
- `DRAFT` é editável e não consome saldo; `APPROVED` consome saldo e é imutável.
- O item preserva o preço aplicado como snapshot; subtotal e total são derivados com `Decimal`.
- Vários fechamentos no mesmo período são permitidos.
- A aprovação bloqueia, em ordem estável, os `OutsourcedService` envolvidos com `FOR UPDATE`, relê o saldo dentro da mesma transação e grava a aprovação atomicamente.
- A estratégia foi comprovada no PostgreSQL real com duas aprovações concorrentes: uma foi aprovada e outra rejeitada por saldo insuficiente, sem deadlock ou timeout e sem duplicar a quantidade fechada.
- Fechamento não cria Conta a Pagar nesta fase.

Este documento registra decisões arquiteturais e de produto conhecidas nesta etapa, além de decisões pendentes.

## Decisões confirmadas

### DEC-057 - Cadastros unificados

- `/cadastros` é o ambiente único com abas de Empresas, Clientes, Terceirizados, Produtos, Setores Internos, Categorias Financeiras e Usuários.
- As rotas cadastrais anteriores redirecionam para a aba correspondente, preservando bookmarks sem manter interfaces concorrentes.
- Company e Customer recebem somente campos mestres opcionais; `Customer.personType` é PF/PJ nullable para não classificar artificialmente registros anteriores.
- Serviços continuam como catálogo independente e são geridos de forma compacta dentro da experiência de Terceirizados. Preço atual permanece exclusivamente em `ServiceContractor`.
- Insumos são geridos dentro de Produtos e continuam sem estoque. Atualização em massa modifica apenas o preço atual cadastral e mostra prévia antes da confirmação.
- `FinancialClassification` recebe o nome visual Categoria Financeira. Natureza e códigos técnicos ficam ocultos no uso comum e são derivados pelo servidor.
- A flag “permite lançamento manual” não foi criada: ela exigiria nova regra estrutural e alteração do fluxo financeiro, não confirmadas nesta etapa.
- Consulta de CNPJ não foi integrada porque nenhum provedor, credencial ou contrato de disponibilidade foi escolhido; o cadastro manual permanece completo.

### DEC-056 - Preço atual por Terceirizado e Serviço

- `ServiceContractor` é simultaneamente a capacidade do executor externo e a única fonte do preço atual daquela combinação.
- `unitPrice` é `Decimal(14,4)`, nullable para vínculo ainda sem preço e estritamente positivo quando configurado. A chave composta existente garante uma combinação única.
- Nova atribuição de Serviço Terceirizado exige vínculo ativo, Serviço ativo, Terceirizado ativo e preço configurado; o servidor copia esse valor para `OutsourcedService.appliedUnitPrice`.
- Alterar `ServiceContractor.unitPrice` afeta apenas atribuições futuras. Edições que mantêm a mesma combinação preservam o snapshot já aplicado.
- `ServicePrice` global foi removido após migração defensiva dos cinco valores inequívocos. Manter ambas as estruturas criaria fontes concorrentes.
- `ContractorSettlementItem.appliedUnitPriceSnapshot`, Conta a Pagar e DRE histórica continuam derivados dos snapshots do Serviço Terceirizado, nunca do preço atual.
- `ServiceInternalSector` não possui preço de terceirização; custo interno continua fora desta modelagem.

### DEC-055 - Base operacional pós-MVP

- Setores internos são cadastros configuráveis e não status fixos nem etapas de workflow. Os valores iniciais são Frente Interna, Carleano e Montagem.
- Serviço é independente do executor. Duas tabelas de capacidade com FKs reais representam setores internos e terceirizados habilitados, evitando associação polimórfica nullable e serviços duplicados.
- A decisão provisória de manter preço global foi substituída pela DEC-056 após confirmação explícita da regra `Contractor + Service`.
- OP não recebe enum persistido de status. Urgência é flag, previsão e conclusão são fatos opcionais, e estados financeiro-operacionais permanecem derivados.
- `Product.name` e `reference` são reutilizados como descrição e código. Preço atual do Produto é cadastral e `ProductionOrder.unitPrice` continua protegendo o histórico.
- Insumos são somente uma composição proporcional do Produto, sem estoque e sem snapshot na OP nesta etapa. A dupla de consumo pode ficar vazia, mas nunca parcialmente preenchida ou não positiva.
- O perfil `CONTRACTOR` exige `contractorId` e começa sem permissões internas; portal e telas próprias permanecem futuros.
- Pendências operacionais são fatos históricos com autoria, três estados e seis tipos iniciais. Pendência resolvida não é apagada nem reaberta nesta etapa.
- Os terceirizados existentes foram apenas relacionados por nomes inequívocos; nenhuma pessoa foi criada ou renomeada pelo seed. `Pricila` e `Neudenio` foram preservados como cadastrados.

### DEC-054 - Autenticação, perfis e autoria básica

- O acesso interno exige usuário ativo e sessão opaca persistida no PostgreSQL, enviada em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Senhas são armazenadas somente como hash `scrypt` individualmente salgado; credenciais reais não são versionadas.
- Os perfis iniciais são `ADMIN`, `FINANCE`, `OPERATIONS` e `VIEWER`; toda mutação deve ser autorizada no servidor, independentemente da visibilidade do menu.
- Usuário inativo perde acesso e suas sessões são removidas. Usuários não são excluídos fisicamente.
- Orçamentos guardam autoria de aprovação e fechamento. Contas manuais, pagamentos, recebimentos e estornos novos guardam autoria; registros históricos permanecem nulos quando não há origem confiável.
- O primeiro ADMIN pode ser criado pelo seed somente quando `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` forem fornecidas.

### DEC-053 - Estornos financeiros

- **Correção financeira = Estorno + novo lançamento.** Fatos e allocations não são apagados ou editados.
- Estorno é total, único, exige motivo e data igual ou posterior ao fato original.
- Estorno reabre saldo e aparece como movimento inverso no Fluxo de Caixa; DRE permanece baseada em Billing e AccountPayable.
- Estorno parcial permanece futuro; a autoria dos estornos novos é preservada conforme a DEC-054.

### DEC-052 - Governança do orçamento

- Budget segue somente `DRAFT → APPROVED → CLOSED`; não há desaprovação ou reabertura nesta versão.
- Somente DRAFT é mutável e um orçamento vazio não pode ser aprovado.
- APPROVED congela o planejamento; CLOSED encerra a competência. Nenhuma transição cria fatos financeiros ou altera o realizado.
- Locks pessimistas no Budget serializam aprovação, fechamento e mutações de linhas, evitando edição após congelamento.
- Qualquer status pode ser origem de cópia, mas o destino sempre nasce DRAFT, sem status ou timestamps da origem.
- Aprovação e fechamento preservam `approvedBy` e `closedBy`; reabertura e versionamento pós-aprovação ficam futuros.

### DEC-051 - Visão anual e cópia de orçamento

- A visão anual agrega Budgets, Billing e AccountPayable por Company e intervalo anual, sem consultas mensais repetidas.
- Totais absolutos somam os 12 meses; margens e variações percentuais anuais usam os totais anuais, nunca médias de percentuais mensais.
- Ausência de Budget significa previsto zero e não cria registros automaticamente.
- A cópia é monoempresa, atômica, não sobrescreve destino e não copia fatos realizados.
- Snapshots do destino usam o cadastro atual. Classificação inativa, ausente, `NON_DRE` ou inelegível impede toda a cópia.
- Aprovação e fechamento estão implementados; reabertura e versionamento continuam futuros.

### DEC-050 - Orçamento mensal da DRE

- `Budget` + `BudgetEntry` representam planejamento mensal por Company; Receita Bruta é linha especial e despesas/resultados usam classificações com snapshots.
- **Orçamento ≠ DRE realizada ≠ Fluxo de Caixa previsto.** BudgetEntry não gera Billing, contas, pagamentos ou recebimentos.
- Somente `OPERATING_EXPENSE` e `DRE_POST_OPERATING` participam; `NON_DRE` fica fora.
- Variação é Realizado menos Previsto, percentual é indefinido quando Previsto é zero e avaliação favorável/desfavorável é derivada conforme a semântica da linha.
- Edição é permitida somente em `DRAFT`. Visão anual, cópia, aprovação e fechamento foram implementados; reabertura e versionamento permanecem futuros.

### DEC-048 - Classificação financeira ampla e natureza financeira

- `FinancialClassification` é um catálogo financeiro gerencial amplo; nem toda classificação afeta a DRE.
- `FinancialNature` distingue inicialmente `OPERATING_EXPENSE` e `NON_DRE`.
- `OPERATING_EXPENSE` exige `DreGroup`; `NON_DRE` exige grupo nulo.
- Contas a Pagar preservam snapshots da natureza e do grupo aplicados no momento da criação.
- A DRE operacional ignora `NON_DRE`, enquanto o Fluxo de Caixa previsto e realizado continua considerando suas obrigações e pagamentos.
- Resultado Líquido e os domínios de empréstimos, investimentos, reservas e distribuições permanecem futuros.

### DEC-049 - Resultado Líquido Gerencial

- `DRE_POST_OPERATING` identifica classificações que afetam a DRE depois do Lucro Operacional.
- A camada usa `FINANCIAL_REVENUE`, `FINANCIAL_EXPENSE` e `INCOME_TAX_EXPENSE`.
- Resultado Antes dos Tributos é Lucro Operacional mais Receitas Financeiras menos Despesas Financeiras; Resultado Líquido Gerencial subtrai os Tributos sobre o Resultado.
- Conta a Pagar pode registrar despesas financeiras e tributos, mas nunca receita financeira.
- Sem fato físico adequado, Receitas Financeiras permanecem zero; Billing e Receipt não são reutilizados artificialmente.
- `NON_DRE` permanece fora de todos os valores da DRE e continua afetando o Fluxo de Caixa.

### DEC-041 - Fechamento monoempresa e Conta a Pagar

- Fechamento pertence a uma única Company e não mistura OPs de empresas diferentes.
- DRAFT vazio pode trocar Company; com itens não pode, e APPROVED é imutável.
- Um fechamento aprovado gera no máximo uma Conta a Pagar, com FK única e deleção restritiva.
- `competenceDate` é o primeiro dia do mês; vencimento e pagamento permanecem distintos.
- `originalAmount` é snapshot Decimal; status, pago e saldo permanecem derivados.

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

- Alterar o preço atual da combinação `Terceirizado + Serviço` futuramente não pode alterar Serviços Terceirizados antigos.
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
- Nesta decisão histórica, os cinco valores foram inicialmente registrados em `ServicePrice`; a DEC-056 migrou-os para os respectivos vínculos `ServiceContractor`.
- Frente e Costas permanecem sem preço; valor zero não representa preço desconhecido.
- `2026-09-02` é a data técnica inicial das referências inseridas pelo seed, sem significado histórico ou contratual anterior ao sistema.

Consequência:

- O seed atual localiza Serviços e Terceirizados existentes por nomes inequívocos e cria somente vínculos ausentes com seus valores oficiais, sem sobrescrever alterações cadastrais posteriores.
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

### DEC-038 - Serviços Terceirizados e histórico de preços

Decisão confirmada para a primeira interface de Serviços Terceirizados:

- A seleção global por `ServicePrice` descrita originalmente foi substituída pela DEC-056.
- O preço atual é o `unitPrice` da combinação `ServiceContractor` ativa.
- O preço aplicado é copiado para `OutsourcedService.appliedUnitPrice` e não muda quando o catálogo é atualizado.
- Combinação sem preço configurado é rejeitada; o preço não é digitado manualmente na atribuição.
- O valor previsto da associação nesta etapa é `plannedQuantity × appliedUnitPrice`.
- Quantidades enviada, retornada e pendente, além da situação operacional, são derivadas das movimentações existentes.
- `approvedQuantity` permanece zero; retorno físico não implica aprovação para pagamento.
- Serviço e Terceirizado não podem ser trocados depois que existir um item de romaneio para a associação.

Consequência:

- A interface de OP não duplica movimentações que pertencem a romaneios e retornos.
- A implementação de romaneios, retornos e conferência para pagamento permanece reservada às fases posteriores.

### DEC-039 - Emissão e numeração dos Romaneios

Decisão confirmada:

- Cada Romaneio pertence a exatamente um Terceirizado, mas pode reunir itens de múltiplas OPs, clientes, produtos e Serviços.
- Um mesmo Serviço Terceirizado pode participar de múltiplos Romaneios enquanto possuir saldo disponível.
- Cabeçalho e itens são criados atomicamente em uma transação; quantidades e Terceirizado são revalidados no servidor.
- A numeração é sequencial, automática e global, gerada pela sequence PostgreSQL `delivery_note_number_seq`.
- O número é armazenado em `DeliveryNote.number`, separado do `id` interno, como `String` globalmente única e formatada com no mínimo seis dígitos.
- Lacunas são aceitáveis e números reservados pela sequence não são reutilizados.
- Romaneios emitidos são somente visualizados e impressos nesta fase; não há edição, exclusão, cancelamento ou estorno.
- A impressão contém duas vias na mesma folha A4: Genect e Terceirizada.

Consequência:

- A migration `20260903000000_add_delivery_note_number_sequence` adiciona a sequence e substitui o índice simples pela constraint de unicidade.
- Cancelamento, estorno e correção formal de uma emissão permanecem como decisão pendente.

### DEC-040 - Retornos e conferência acumulada

- Múltiplos Retornos preservam data, quantidade e observações individualmente.
- Retornado e pendente são derivados; o registro usa bloqueio transacional contra sobre-retorno.
- `approvedQuantity` é um total acumulado confirmado separadamente e limitado ao total retornado.
- Retorno físico não implica aprovação automática.
- O painel de cobrança mostra somente pendência física positiva e calcula dias fora pela saída mais recente, sem classificar atraso.

### DEC-041 - Pagamentos parciais de Contas a Pagar

- Fechamento, Conta a Pagar e Pagamento são fatos distintos; somente Pagamento representa saída financeira efetiva.
- Uma Conta a Pagar aceita múltiplos pagamentos parciais ou um pagamento total.
- Pago, saldo e situação são derivados; não há enum nem totais persistidos na Conta a Pagar.
- As situações são Em aberto, Vencida, Parcial e Pago. Parcial prevalece sobre vencida quando já existe pagamento e saldo positivo.
- O pagamento bloqueia a Conta a Pagar com `FOR UPDATE`, relê e valida o saldo dentro da mesma transação.
- `Payment.paymentDate` será a data da saída realizada no futuro Fluxo de Caixa.
- Pagamentos não podem ser editados, excluídos, cancelados ou estornados nesta versão.

### DEC-042 - Faturamento registrado e Conta a Receber

- O sistema não emite NFe; registra internamente o faturamento emitido externamente.
- Cada OP possui no máximo um Billing e qualquer OP ainda não faturada pode ser registrada manualmente, sem pré-condição operacional nesta versão.
- `Billing.companyId` é copiado da OP para garantir NFe única por Company junto com `invoiceNumber`.
- O valor faturado é snapshot Decimal positivo e pode divergir do valor previsto da OP.
- Billing e AccountReceivable são criados atomicamente.
- Company e Customer da Conta a Receber vêm da OP; valor original e competência são snapshots do Billing.
- Competência, emissão e vencimento permanecem datas distintas.
- Conta a Receber não é dinheiro recebido. Receipt permanece uma entidade futura separada.

### DEC-043 - Recebimentos e alocações

- Receipt representa uma única entrada real e pertence a uma Company e um Customer.
- Um Receipt pode alocar várias Contas a Receber; uma Conta pode receber várias alocações ao longo do tempo.
- Todas as contas de um Receipt devem pertencer à mesma Company e Customer do cabeçalho.
- A soma das alocações deve ser exatamente igual ao valor do Receipt.
- As Contas a Receber são bloqueadas em ordem estável e seus saldos são recalculados dentro da transação.
- Recebido, saldo e situação são derivados; Parcial prevalece sobre vencida.
- Receipt e alocações são imutáveis nesta versão.
- O futuro Fluxo de Caixa contará Receipt uma única vez, nunca cada alocação como nova entrada.

### DEC-044 - Fluxo de Caixa derivado

- Fluxo de Caixa não possui tabela própria nem duplica movimentos financeiros.
- Realizado soma Receipt uma vez por `receiptDate` e Payment uma vez por `paymentDate`.
- ReceiptAllocation não é movimento de caixa.
- Previsto usa saldos remanescentes de contas por `dueDate`; contas quitadas são excluídas.
- Vencidos anteriores ao período são exibidos separadamente, sem mudar vencimentos.
- Totais e agrupamento diário usam Decimal e podem ser filtrados por Company e período.
- O líquido apresentado é dos registros do sistema, não saldo bancário.
- Competência não determina caixa; Fluxo de Caixa permanece distinto da DRE.

### DEC-045 - Classificações financeiras e origens da Conta a Pagar

- A Receita Bruta futura usa exclusivamente `Billing.amount` por competência e Company.
- O catálogo `FinancialClassification` é global, possui código técnico estável e inicialmente aceita somente os grupos `VARIABLE_COST_EXPENSE` e `FIXED_COST_EXPENSE`.
- Contas a Pagar preservam relação viva e snapshots de código, nome e grupo; mudanças cadastrais não reclassificam fatos históricos e não existe reclassificação retroativa nesta versão.
- `AccountPayableSource` diferencia Fechamento de Terceirizados e lançamento manual, com invariantes também protegidas no banco.
- Fechamentos usam automaticamente `OUTSOURCED_PRODUCTION`, como Custos e Despesas Variáveis, e copiam o nome do Terceirizado como beneficiário snapshot.
- Contas manuais exigem classificação ativa e beneficiário, mas não criam Pagamento.
- A DRE continua derivada e não é implementada nesta etapa.

### DEC-046 - DRE Gerencial v1 termina no Lucro Operacional

- A consulta é derivada, mensal e exige uma Company; não existe consolidação implícita nem tabela de totais.
- Receita Bruta usa exclusivamente Billing por competência. Despesas usam `AccountPayable.originalAmount` e snapshots de grupo, código e nome.
- Payment, Receipt, vencimento, saldo e situação financeira são ignorados pelo cálculo por competência.
- Margem de Contribuição é Receita Bruta menos Variáveis; Lucro Operacional é Margem de Contribuição menos Fixas.
- Percentuais usam Receita Bruta e não são calculados quando ela é zero.
- Resultado Líquido e grupos pós-operacionais não são exibidos até que suas regras sejam confirmadas.

### DEC-047 - Plano gerencial operacional inicial

- O plano oficial inicial é global, gerencial e não constitui plano contábil fiscal.
- Variáveis: `OUTSOURCED_PRODUCTION`, `PRODUCTION_MATERIALS` e `PRODUCTION_SUPPLIES`.
- Fixas: `PAYROLL`, `PAYROLL_CHARGES`, `ELECTRICITY`, `RENT`, `ACCOUNTING`, `MAINTENANCE`, `ADMIN_EXPENSES` e `COMMERCIAL_EXPENSES`.
- Salários e encargos são separados e manuais; energia e manutenção são fixas nesta versão.
- Materiais e suprimentos não criam estoque nem consumo automático por OP.
- O seed é idempotente, e snapshots históricos nunca são reclassificados por sua execução.
- O plano operacional inicial permanece intacto; despesas financeiras e tributos sobre o resultado foram definidos posteriormente na DEC-049. Investimentos, reservas e demais movimentos patrimoniais permanecem pendentes.

## Decisões pendentes

- DECISÃO PENDENTE: definir campos obrigatórios dos cadastros de empresa, cliente, produto e terceirizado.
- DECISÃO PENDENTE: definir todos os campos de produção de uma OP.
- DECISÃO PENDENTE: definir quais são as demais informações comerciais necessárias na OP.
- DECISÃO PENDENTE: definir ciclo de vida e status da OP.
- DECISÃO PENDENTE: definir ciclo de vida e status excepcionais dos Serviços Terceirizados.
- DECISÃO PENDENTE: definir regras de cancelamento, estorno e correção de Romaneios emitidos.
- DECISÃO PENDENTE: definir quando um Serviço Terceirizado é considerado elegível para pagamento.
- DECISÃO PENDENTE: definir se o sistema deverá preencher inicialmente a quantidade aprovada para pagamento com o mesmo valor da quantidade retornada para o usuário apenas confirmar ou ajustar.
- DECISÃO PENDENTE: definir formato e informações do recibo de fechamento.
- DECISÃO PENDENTE: definir aprovação, cancelamento, estorno e reabertura de fechamentos.
- DECISÃO PENDENTE: definir demais categorias futuras além dos grupos operacionais e pós-operacionais já confirmados.
- DECISÃO PENDENTE: definir tratamento de impostos distintos dos tributos sobre o resultado, investimentos e reservas.
- DECISÃO PENDENTE: definir reabertura e versionamento de orçamentos após aprovação.
- DECISÃO PENDENTE: definir relatórios e dashboards prioritários.
- DECISÃO PENDENTE: definir necessidade de importação de dados históricos das planilhas atuais.

### DEC-058 - OP como workspace operacional

- `/ops` passa a ser apresentado como Cadastro de OPs e o detalhe concentra Resumo, Serviços, Insumos, Financeiro e Histórico.
- `OutsourcedService`, `DeliveryNote`, `OutsourcingReturn`, aprovação, Billing, AccountReceivable e Receipt permanecem fontes oficiais; ações dentro da OP somente as orquestram.
- Execução interna usa `InternalProductionService`, sem preço, custo contábil ou motor de dependências.
- `expectedReturnDate` pertence ao serviço externo; atraso e situação continuam derivados.
- `ProductionOrderSupply` congela os insumos previstos. Ajuste da OP não altera `ProductSupply`.
- A timeline é montada a partir dos fatos existentes; não foi criada tabela `AuditEvent`.
- Conclusão, faturamento e recebimento permanecem separados e possuem permissões próprias.
- Reabertura, cancelamento, Kanban e portal do Terceirizado permanecem fora desta etapa.

### DEC-059 - Home operacional e Kanban derivado

- A Home passa a ser o Painel de Produção, com indicadores, bloco `Precisam de atenção` e Kanban de alta densidade.
- O Kanban é uma visão derivada e não uma fonte de workflow: não existe drag-and-drop, mudança de responsável ou registro operacional feito diretamente por ele.
- Cada card representa `OP + Serviço + Executor`; por isso a mesma OP pode aparecer em mais de uma coluna.
- Setores internos usam `InternalSector` ativo e ordenado; terceirizados usam `Contractor` ativo com serviços relevantes; nomes não são hardcoded.
- Montagem reutiliza a regra derivada da OP: parcial vira `Aguardando complemento` e total vira `Completa para montagem`.
- Pendência operacional aberta ou em tratamento prevalece visualmente sobre atraso genérico, evitando interpretar como cobrança ao terceirizado quando há bloqueio interno.
- Serviços concluídos não aparecem nas colunas principais por padrão; o filtro `Mostrar concluídos` permite auditoria operacional sem poluir a rotina.
- Portal do Terceirizado, drag-and-drop, notificações e movimentações pelo Kanban permanecem fora desta etapa.

### DEC-060 - Portal do Terceirizado

- Usuários `CONTRACTOR` possuem Home própria em `/portal`; `/` redireciona para essa experiência e não exibe o painel interno.
- O isolamento por Terceirizado é server-side e usa exclusivamente `session.user.contractorId`. URLs diretas para serviços de outro Terceirizado não retornam dados.
- O portal não movimenta OP, não altera responsável, não registra retorno físico, não aprova serviço, não fecha competência, não registra Payment e não acessa financeiro interno.
- `OperationalIssue` é a fonte oficial das pendências. O Contractor pode criar pendência própria com autoria preservada, mas não pode resolver; a Genect trata e resolve internamente.
- O financeiro exibido ao Contractor é uma projeção restrita: produzido aguardando fechamento, fechado aguardando pagamento e pagamentos efetivos do próprio Terceirizado.
- Pagamentos estornados aparecem como histórico quando pertinente, mas não compõem total pago efetivo.
- Nenhuma migration foi necessária; o portal reutiliza estruturas existentes e não cria nova tabela, ledger ou status persistido.

### DEC-061 - Financeiro simplificado e DRE única

- `/financeiro` passa a ser a Visão Geral Financeira, sem criar nova entidade ou ledger.
- O menu financeiro interno fica organizado em Visão Geral, Contas a Pagar, Contas a Receber, Fluxo de Caixa, DRE e Orçamento / Previsto x Realizado.
- Carteira de produção e concluído a faturar são indicadores operacionais/econômicos previstos; não são receita realizada e não alimentam DRE.
- Faturado a receber vem de `AccountReceivable`; recebido vem de `Receipt`; caixa realizado vem de `Receipt`, `Payment` e estornos.
- A DRE permanece única, hierárquica e por competência, usando Billing e AccountPayable com snapshots históricos. Pagamentos, recebimentos e estornos não alteram DRE.
- Categorias e grupos são apresentados com rótulos amigáveis. Enums técnicos continuam existindo no domínio e banco, mas não são a linguagem principal da UI.
- Nenhuma migration foi criada nesta etapa.
