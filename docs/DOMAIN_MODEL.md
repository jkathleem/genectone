# Modelo de Domínio

## Fechamentos de terceirizados implementados

`ContractorSettlement` identifica terceirizado, competência, situação (`DRAFT` ou `APPROVED`), observações e instante de aprovação. `ContractorSettlementItem` vincula o fechamento ao `OutsourcedService`, registra a quantidade incluída e preserva `appliedUnitPriceSnapshot`.

Quantidade já fechada é a soma exclusiva dos itens pertencentes a fechamentos `APPROVED`; quantidade elegível é `approvedQuantity - settledQuantity`. Rascunhos não reservam saldo. Subtotais e total são derivados e não são armazenados. Retorno físico ≠ Aprovação ≠ Fechamento ≠ Pagamento.

Este documento descreve entidades conceituais e relacionamentos. Ainda não define schema SQL, tecnologia, banco de dados ou implementação.

## Princípio de simplificação

O MVP não precisa de roteiro produtivo, dependências configuráveis entre etapas, motor de execução interna, workflow produtivo complexo nem geração automática de serviços por produto.

O núcleo de terceirização deve seguir o fluxo simples:

- OP
- Serviço Terceirizado
- Terceirizado
- Romaneio de Saída
- Retorno
- Fechamento / Pagamento

O usuário cadastra a OP, abre a OP, adiciona manualmente os Serviços Terceirizados necessários, escolhe o Serviço cadastrado, escolhe o Terceirizado, informa a quantidade e utiliza o preço sugerido ou altera o preço aplicado quando necessário.

## Modelo conceitual esperado

Núcleo operacional:

- Empresa
- Cliente
- Produto
- OP

Cadastros de terceirização:

- Terceirizado
- Serviço
- Preço de Serviço

Fluxo de terceirização:

- OP
- Serviços Terceirizados
- Movimentações de saída
- Romaneios
- Itens de Romaneio
- Retornos
- Quantidades derivadas
- Fechamento Mensal
- Futura Conta a Pagar

Fluxo comercial e financeiro:

- OP
- Faturamento / NFe
- Conta a Receber
- Recebimento
- Alocação de Recebimento
- Pagamento
- Fluxo de Caixa
- DRE
- Previsto x Real

## Entidades conceituais

### Empresa

Representa uma empresa da Genect Confecções. É usada para separar dados operacionais, financeiros e gerenciais.

Relacionamentos:

- Uma empresa possui várias OPs.
- Uma empresa pode possuir registros financeiros, faturamentos, contas e demonstrativos próprios.

Fonte de verdade:

- Cadastro da empresa.

### Cliente

Representa o cliente vinculado a uma OP e ao faturamento posterior.

Relacionamentos:

- Um cliente pode possuir várias OPs.
- Uma OP pertence a um cliente.

Fonte de verdade:

- Cadastro do cliente.

### Produto

Representa o item ou referência principal produzido pela confecção.

Relacionamentos:

- Um produto pode aparecer em várias OPs.
- No MVP, uma OP possui exatamente um Produto / Referência principal.

Fonte de verdade:

- Cadastro do produto.

Observação:

- O MVP não deve criar estrutura de múltiplos produtos por OP. Essa regra pode ser revista futuramente se houver necessidade operacional real.

### OP

Representa a entidade operacional central do sistema. A OP é cadastrada primeiro e deve existir antes de qualquer Serviço Terceirizado ou romaneio relacionado.

A OP deve registrar, conforme os dados disponíveis:

- Número da OP.
- Data de entrada.
- Empresa responsável.
- Cliente.
- Produto / Referência principal.
- Quantidade.
- Preço unitário.
- Valor total calculado.
- Demais informações comerciais necessárias.
- Informações de produção.

O valor total da OP é derivado de quantidade multiplicada por preço unitário quando aplicável.

A OP é diferente de Serviço Terceirizado, Romaneio, Fechamento, Conta a Pagar, Faturamento e Conta a Receber:

- A OP registra a ordem recebida e sua visão operacional/econômica inicial.
- O Serviço Terceirizado registra um serviço real executado externamente para aquela OP.
- O Romaneio registra a movimentação física de saída para um terceirizado.
- O Fechamento consolida quantidades aprovadas para pagamento.
- A Conta a Pagar representa uma obrigação financeira.
- O Faturamento representa a cobrança da OP.
- A Conta a Receber representa o direito financeiro gerado pelo faturamento.

Relacionamentos:

- Uma OP pertence a uma empresa.
- Uma OP pertence a um cliente.
- Uma OP possui um Produto / Referência principal.
- Uma OP pode possuir vários Serviços Terceirizados.
- Uma OP pode originar faturamento.
- Uma OP faturada pode alimentar contas a receber.

Fonte de verdade:

- Número, data de entrada, empresa, cliente, Produto / Referência principal, quantidade, preço unitário e demais informações comerciais da OP.
- Valor previsto da OP, quando calculado a partir dos dados de entrada.
- Dados operacionais iniciais da OP.

Dados derivados:

- Valor total da OP, quando quantidade e preço unitário forem aplicáveis.
- Pendências de terceirização por OP.
- Informações reutilizadas em Serviços Terceirizados, romaneios, faturamento e relatórios.

Observação:

- A entrada da OP pode fornecer visibilidade econômica, mas não equivale automaticamente a receita realizada no DRE.

DECISÃO PENDENTE: definir exatamente em qual momento e com qual data o valor de uma OP deve entrar como receita no DRE gerencial.

### Terceirizado

Representa a pessoa ou empresa que executa serviços externos.

Deve permitir futuramente cadastrar:

- Nome.
- Documento.
- Telefone.
- Endereço.
- Observações.
- Situação ativo/inativo.

Relacionamentos:

- Um terceirizado pode executar vários Serviços Terceirizados.
- Um terceirizado pode possuir vários romaneios.
- Um terceirizado possui fechamentos mensais.

Fonte de verdade:

- Cadastro do terceirizado.

DECISÃO PENDENTE: definir campos obrigatórios do cadastro de Terceirizado.

### Serviço

Representa o cadastro reutilizável dos tipos de serviços que podem ser terceirizados.

Exemplos:

- Frente.
- Costas.
- Preparação Frente.
- Pala e Gancho.
- Frente Completa.
- Final Frente.
- Preparação e Bolso Traseiro.

Frente e Costas são apenas Serviços cadastrados. Não existe entidade especial "Frente e Costas" no MVP.

Relacionamentos:

- Um Serviço pode ser usado em vários Serviços Terceirizados.
- Um Serviço pode possuir preço padrão configurável.

Fonte de verdade:

- Cadastro do Serviço.

### Preço de Serviço

Representa os valores unitários padrão dos Serviços terceirizados.

Valores iniciais conhecidos:

- Preparação Frente: R$ 1,10 por peça.
- Pala e Gancho: R$ 0,27 por peça.
- Frente Completa: R$ 1,50 por peça.
- Final Frente: R$ 0,60 por peça.
- Preparação e Bolso Traseiro: R$ 0,70 por peça.

Relacionamentos:

- Um preço pertence a um Serviço.
- O preço atual serve como sugestão para novos Serviços Terceirizados.
- O Serviço Terceirizado guarda uma cópia do preço unitário efetivamente aplicado.

Fonte de verdade:

- Preço padrão vigente para sugestão de novos lançamentos.

Dados derivados:

- Sugestão de valor unitário ao criar um Serviço Terceirizado.

Observação:

- A tabela deve ser configurável.
- Preços não devem ser constantes fixas no código.
- Alterações futuras no preço padrão não podem alterar Serviços Terceirizados antigos.

### Serviço Terceirizado

Representa um serviço real executado externamente para determinada OP.

Exemplos:

- OP 12345, Serviço Frente, Terceirizado Pricila, quantidade enviada 500.
- OP 12345, Serviço Costas, Terceirizado Rafael, quantidade enviada 500.

Os dois registros pertencem à mesma OP, mas são Serviços Terceirizados independentes.

Um Serviço Terceirizado deve estar obrigatoriamente vinculado a:

- Uma OP.
- Um Serviço cadastrado.
- Um Terceirizado.

Deve permitir registrar:

- OP.
- Serviço.
- Terceirizado.
- Quantidade prevista, quando aplicável.
- Quantidade enviada.
- Quantidade retornada.
- Quantidade aprovada para pagamento.
- Preço unitário aplicado.
- Status excepcional, quando aplicável.
- Movimentações de saída.
- Retornos.
- Romaneios relacionados.
- Observações.

Não deve duplicar cliente, produto ou outros dados que já possam ser obtidos através da OP.

Relacionamentos:

- Pertence a uma OP existente.
- Usa um Serviço cadastrado.
- É executado por um Terceirizado.
- Pode possuir múltiplas movimentações de saída.
- Pode possuir múltiplos retornos.
- Pode estar incluído em fechamentos mensais conforme quantidade aprovada e ainda não paga.

Fonte de verdade:

- OP vinculada.
- Serviço cadastrado.
- Terceirizado.
- Quantidade prevista informada.
- Preço unitário aplicado historicamente.
- Status excepcional, quando aplicável, e observações.

Dados derivados:

- Quantidade enviada, quando derivada da soma dos itens de romaneio ou movimentações de saída.
- Quantidade retornada, derivada da soma dos retornos.
- Quantidade pendente, derivada de quantidade enviada menos quantidade retornada.
- Valor previsto do serviço, derivado de quantidade enviada multiplicada pelo preço unitário aplicado.
- Valor elegível para pagamento, derivado de quantidade aprovada para pagamento multiplicada pelo preço unitário aplicado.
- Itens para painel de cobrança.
- Base para fechamento mensal.

### Quantidades do Serviço Terceirizado

As quantidades abaixo são conceitos distintos:

- Quantidade prevista: quantidade que se espera executar naquele serviço. Pode ser inicialmente igual à quantidade da OP, mas não deve ser obrigatoriamente sempre igual.
- Quantidade enviada: quantidade efetivamente enviada ao terceirizado. Pode ser derivada da soma das movimentações de saída.
- Quantidade retornada: quantidade que fisicamente voltou para a Genect. É derivada da soma dos retornos.
- Quantidade aprovada para pagamento: quantidade considerada válida para pagamento ao terceirizado após conferência. Pode ser diferente da quantidade retornada.
- Quantidade pendente: quantidade enviada menos quantidade retornada.

A quantidade pendente é derivada e nunca deve precisar ser digitada manualmente.

Fluxo de aprovação para pagamento:

- Retorno físico.
- Quantidade retornada.
- Conferência.
- Quantidade aprovada para pagamento.

DECISÃO PENDENTE: definir se o sistema deverá preencher inicialmente a quantidade aprovada para pagamento com o mesmo valor da quantidade retornada para o usuário apenas confirmar ou ajustar.

### Status Operacional do Serviço Terceirizado

Representa a situação operacional calculável de um Serviço Terceirizado.

Estados operacionais calculáveis não devem depender de digitação manual.

Regras conceituais:

- Quantidade enviada = 0: AGUARDANDO ENVIO.
- Quantidade enviada > 0 e quantidade retornada = 0: EM TERCEIRIZAÇÃO.
- Quantidade retornada > 0 e quantidade pendente > 0: RETORNO PARCIAL.
- Quantidade enviada > 0 e quantidade pendente = 0: RETORNADO.

Estados excepcionais como CANCELADO e SUSPENSO podem futuramente ser armazenados explicitamente.

Observação:

- Ainda não há enumeração técnica definitiva para status.

### Romaneio

Representa tudo que está saindo fisicamente da Genect em determinada movimentação para um mesmo terceirizado.

Um romaneio pertence a exatamente um terceirizado e pode conter diversos itens. Esses itens podem pertencer a OPs diferentes, clientes diferentes, referências diferentes e serviços diferentes, desde que todos estejam indo para o mesmo terceirizado naquela saída.

Se parte da produção sair para outro terceirizado, deve ser criado outro romaneio.

Estrutura conceitual:

- Número.
- Terceirizado.
- Data de saída.
- Responsável pela saída.
- Observações.
- Status quando aplicável.

Relacionamentos:

- Um Romaneio pertence a um Terceirizado.
- Um Romaneio possui vários Itens de Romaneio.
- Um Romaneio reutiliza dados existentes dos Serviços Terceirizados e suas OPs.

Fonte de verdade:

- Número do romaneio.
- Terceirizado.
- Data de saída.
- Responsável pela saída.
- Observações.
- Status quando aplicável.

Dados reutilizados:

- OP.
- Cliente.
- Produto ou referência quando disponível.
- Serviço.
- Terceirizado.
- Quantidade selecionada para envio.

### Item de Romaneio

Representa um item específico enviado dentro de um romaneio.

Relacionamentos:

- Um Item de Romaneio pertence a um Romaneio.
- Um Item de Romaneio aponta para um Serviço Terceirizado.

Fonte de verdade:

- Serviço Terceirizado relacionado.
- Quantidade enviada naquela movimentação.

Dados derivados:

- Contribuição para a quantidade enviada total do Serviço Terceirizado.
- Data da última saída, quando calculada a partir dos romaneios relacionados.

### Retorno

Representa uma devolução física parcial ou total de um Serviço Terceirizado para a Genect.

Um Serviço Terceirizado pode possuir múltiplos retornos. O histórico não deve ser reduzido a uma única data de retorno.

Relacionamentos:

- Um Retorno pertence a um Serviço Terceirizado.

Fonte de verdade:

- Data.
- Quantidade retornada.
- Serviço Terceirizado relacionado.
- Observações quando necessárias.

Dados derivados:

- Contribuição para a quantidade retornada total do Serviço Terceirizado.
- Atualização da quantidade pendente.
- Saída automática do painel de cobrança quando a quantidade pendente chegar a zero.

### Painel de Cobrança

Representa a visão operacional dos Serviços Terceirizados ainda fora da Genect.

Não é fonte primária de dados. Deve ser derivado dos Serviços Terceirizados, Itens de Romaneio e Retornos.

Critério principal:

- Mostrar apenas Serviços Terceirizados com quantidade pendente maior que zero.

Deve mostrar, quando disponível:

- OP.
- Cliente.
- Serviço.
- Terceirizado.
- Quantidade enviada.
- Quantidade retornada.
- Quantidade pendente.
- Data da última saída.
- Tempo fora.
- Ação recomendada.

Exemplo de ação:

- COBRAR COSTAS DA OP 12345 - RAFAEL.

### Fechamento Mensal de Terceirizado

Representa a consolidação mensal dos Serviços Terceirizados elegíveis para pagamento.

O fechamento deve usar quantidade aprovada para pagamento multiplicada pelo preço unitário aplicado historicamente. Nunca deve recalcular um serviço antigo usando o preço atual do cadastro.

Relacionamentos:

- Um fechamento pertence a um terceirizado.
- Um fechamento consolida Serviços Terceirizados elegíveis para pagamento.
- Um fechamento pode ser filtrado por mês, terceirizado, serviço e OP.
- Um fechamento aprovado pode gerar no máximo uma Conta a Pagar.
- Um fechamento deve permitir gerar recibo.

Fonte de verdade:

- Período.
- Terceirizado.
- Serviços e quantidades incluídas no fechamento.
- Situação de aprovação.

Dados derivados:

- Quantidade de OPs.
- Relação das OPs.
- Serviços realizados.
- Quantidade aprovada.
- Preço unitário aplicado.
- Subtotal por serviço.
- Total geral.
- Recibo.
- Conta a pagar futura após aprovação.

Rastreabilidade:

- O Serviço Terceirizado não deve ser pago novamente em outro fechamento pela mesma quantidade já incluída anteriormente.
- O modelo deve preservar quais quantidades foram incluídas em cada fechamento.

DECISÃO PENDENTE: definir se o sistema deverá preencher inicialmente a quantidade aprovada para pagamento com o mesmo valor da quantidade retornada para o usuário apenas confirmar ou ajustar.

### Faturamento

Representa a cobrança ao cliente por OP faturada. No MVP, cada OP possui seu próprio Faturamento / NFe.

Relacionamentos:

- Um Faturamento / NFe é gerado a partir de uma OP.
- Para o MVP, a relação considerada é 1 OP para 1 NFe / Faturamento.
- Um faturamento alimenta contas a receber.
- O faturamento reutiliza dados da OP sem redigitação.

Fonte de verdade:

- Registro do Faturamento / NFe.
- OP de origem.
- Dados comerciais complementares do faturamento, quando existirem.

Dados derivados:

- Cliente, empresa, produto, quantidade e valores reutilizados da OP quando aplicável.
- Conta a receber gerada a partir do faturamento.
- Receita classificada para DRE, conforme regra futura.

Observação:

- O MVP não deve criar faturamento agrupando várias OPs em uma mesma NFe.

DECISÃO PENDENTE: definir se há aprovação obrigatória antes de faturar uma OP.

### Conta a Receber

Representa um valor a receber de cliente.

Relacionamentos:

- Uma conta a receber pode ser gerada a partir de faturamento.
- Uma Conta a Receber pode possuir várias Alocações de Recebimento.
- Uma Conta a Receber pode ser quitada por mais de um Recebimento.
- Contas a receber alimentam o fluxo de caixa.
- Receitas classificadas alimentam o DRE conforme regra futura.

Fonte de verdade:

- Valor a receber.
- Vencimento.
- Data de competência.
- Classificação financeira ou gerencial.

Dados derivados:

- Valor recebido, derivado da soma das Alocações de Recebimento vinculadas.
- Saldo a receber, derivado do valor original menos o valor recebido.
- Status financeiro conceitual: EM ABERTO, PARCIALMENTE RECEBIDO ou RECEBIDO, derivado de valor recebido e saldo.
- Entradas previstas no fluxo de caixa.
- Receita no DRE por competência, conforme regra futura.

Observação:

- Valor recebido e saldo a receber não devem ser digitados manualmente.
- Ainda não há enumeração técnica definitiva para status financeiro.

### Recebimento

Representa uma entrada financeira real única, como uma transferência recebida pela Genect.

Um Recebimento pode corresponder a várias OPs/NFes ao mesmo tempo. O sistema não deve criar vários recebimentos bancários quando houve apenas uma transferência.

Relacionamentos:

- Um Recebimento pode possuir várias Alocações de Recebimento.
- Um Recebimento pode ser distribuído entre várias Contas a Receber.
- Alimenta o fluxo de caixa como entrada realizada.

Fonte de verdade:

- Data de recebimento.
- Valor recebido.
- Observações quando aplicáveis.

Dados derivados:

- Total alocado, derivado da soma das Alocações de Recebimento vinculadas.

Observação:

- O Fluxo de Caixa realizado deve considerar o Recebimento financeiro real.
- As alocações explicam a quais OPs/NFes aquele pagamento pertence, mas não devem ser somadas novamente como novas entradas de caixa.

### Alocação de Recebimento

Representa a distribuição de um Recebimento entre uma ou mais Contas a Receber.

Resolve conceitualmente a relação muitos-para-muitos entre Recebimento e Conta a Receber.

Relacionamentos:

- Uma Alocação de Recebimento pertence a um Recebimento.
- Uma Alocação de Recebimento aponta para uma Conta a Receber.

Fonte de verdade:

- Recebimento relacionado.
- Conta a Receber relacionada.
- Valor alocado.

Dados derivados:

- Valor recebido de uma Conta a Receber, pela soma das alocações vinculadas.
- Saldo a receber de uma Conta a Receber.

### Conta a Pagar

Na implementação inicial, pertence a uma Company e a exatamente um Fechamento aprovado. Guarda descrição, competência no primeiro dia do mês, vencimento e valor original snapshot. Pago, saldo e situação são derivados; ainda não existe Pagamento físico.

Representa um valor a pagar.

Relacionamentos:

- Uma conta a pagar pode ser gerada a partir de fechamento mensal aprovado.
- Uma Conta a Pagar pode possuir Pagamento.
- Contas a pagar alimentam o fluxo de caixa.
- Despesas classificadas alimentam o DRE.

Fonte de verdade:

- Valor a pagar.
- Vencimento.
- Data de pagamento, quando ocorrer.
- Data de competência.
- Classificação financeira ou gerencial.
- Fechamento de origem, quando gerada por fechamento.

Dados derivados:

- Saídas previstas e realizadas no fluxo de caixa.
- Despesa no DRE por competência.

DECISÃO PENDENTE: definir se uma Conta a Pagar poderá possuir múltiplos pagamentos parciais.

### Pagamento

Representa a saída financeira efetivamente realizada relacionada a uma Conta a Pagar.

Relacionamentos:

- Um Pagamento pertence a uma Conta a Pagar.
- Pagamento alimenta o Fluxo de Caixa como saída realizada.

Fonte de verdade:

- Conta a Pagar relacionada.
- Data do pagamento.
- Valor pago.
- Observações quando aplicáveis.

### Fluxo de Caixa

Representa a visão de entradas e saídas financeiras reais ou previstas.

É diferente do DRE porque trabalha com movimentações financeiras por vencimento, pagamento ou recebimento, enquanto o DRE trabalha principalmente por competência.

Relacionamentos:

- Recebe dados de contas a pagar.
- Recebe dados de contas a receber.
- Recebe Recebimentos como entradas realizadas.
- Recebe Pagamentos como saídas realizadas.

Fonte de verdade:

- Contas a pagar e contas a receber.
- Pagamentos e Recebimentos.
- Saldos por período.

Dados derivados:

- Saldo inicial.
- Total de contas a pagar no período.
- Total de contas a receber no período.
- Saldo final.
- Saldo inicial do período seguinte a partir do saldo final do período anterior.

### DRE

Representa a visão gerencial de resultado por competência.

Relacionamentos:

- Recebe receitas classificadas conforme regra de reconhecimento ainda pendente.
- Recebe despesas classificadas.
- Deve permitir consulta mensal e anual.

Fonte de verdade:

- Lançamentos classificados de receitas e despesas.
- Datas de competência.
- Regra de reconhecimento de receita, quando definida.

Dados derivados:

- Receita Bruta.
- Custos e Despesas Variáveis.
- Margem de Contribuição.
- Custos e Despesas Fixas.
- Lucro Operacional.
- Impostos, investimentos, reservas e outros itens.
- Resultado Líquido.

Observação:

- OP recebida, valor previsto da OP, produção realizada, faturamento, conta a receber, recebimento financeiro e receita reconhecida no DRE são conceitos distintos.

DECISÃO PENDENTE: definir exatamente em qual momento e com qual data o valor de uma OP deve entrar como receita no DRE gerencial.

### Orçamento / Previsto x Real

Representa valores planejados e sua comparação com os valores realizados.

Relacionamentos:

- Compara previsões com dados reais operacionais, financeiros ou gerenciais.

Fonte de verdade:

- Valores orçados ou previstos.

Dados derivados:

- Diferenças entre previsto e real.
- Indicadores de variação.

### Relatórios e Dashboards

Representam consultas e visões consolidadas.

Fonte de verdade:

- Não devem ser fonte primária de dados.

Dados derivados:

- Painel de cobrança de terceirizados.
- Indicadores operacionais.
- Indicadores financeiros.
- Indicadores gerenciais.

## Conceitos removidos do MVP

Os seguintes conceitos não fazem parte do escopo inicial:

- Serviço da OP como entidade separada do Serviço Terceirizado.
- Execução.
- Execução Interna.
- Roteiro Produtivo.
- Dependência configurável entre etapas.
- Motor de workflow de produção.
- Geração automática de serviços baseada no produto.

## Primeira modelagem física

O primeiro schema Prisma materializa somente as seguintes entidades conceituais:

| Conceito | Model Prisma |
| --- | --- |
| Empresa | `Company` |
| Cliente | `Customer` |
| Produto / Referência | `Product` |
| OP | `ProductionOrder` |
| Terceirizado | `Contractor` |
| Serviço | `Service` |
| Preço de Serviço | `ServicePrice` |
| Serviço Terceirizado | `OutsourcedService` |
| Romaneio | `DeliveryNote` |
| Item de Romaneio | `DeliveryNoteItem` |
| Retorno | `OutsourcingReturn` |

Decisões da modelagem física:

- Identificadores internos usam `String` com `cuid()`; números de OP e romaneio não são chaves primárias.
- O número da OP é único por empresa. O número do romaneio permanece apenas indexado até confirmação de sua regra de unicidade.
- Quantidades de peças usam `Int`.
- Preços unitários usam `Decimal(14,4)`; não há `Float` monetário.
- Datas de entrada, vigência, saída e retorno usam o tipo PostgreSQL `date`.
- Todas as relações históricas usam deleção restritiva.
- Não foi criado status operacional armazenado; estados ordinários continuam derivados e os status excepcionais permanecem pendentes.

Dados armazenados em `OutsourcedService`:

- OP, Serviço e Terceirizado relacionados.
- Quantidade prevista opcional.
- Quantidade aprovada para pagamento.
- Preço unitário aplicado historicamente.
- Observações.

Dados não armazenados em `OutsourcedService`:

- Quantidade enviada: soma de `DeliveryNoteItem.quantity`.
- Quantidade retornada: soma de `OutsourcingReturn.quantity`.
- Quantidade pendente: quantidade enviada menos quantidade retornada.
- Valor previsto: quantidade enviada multiplicada pelo preço aplicado.
- Valor elegível para pagamento: quantidade aprovada multiplicada pelo preço aplicado.
- Valor total da OP: quantidade da OP multiplicada pelo preço unitário da OP.

`approvedQuantity` existe somente em `OutsourcedService` nesta fase. `OutsourcingReturn` preserva o retorno físico e não cria uma segunda fonte de aprovação. Permanece pendente definir o momento de conferência, elegibilidade para pagamento e eventual sugestão automática da quantidade retornada.

Invariantes deixadas para a futura camada de domínio/aplicação:

- Quantidades de saída e retorno devem ser maiores que zero.
- Total retornado não deve ultrapassar o total enviado, salvo futura regra explícita.
- Quantidade aprovada não pode ser negativa nem ultrapassar os limites válidos do negócio.
- Todo `DeliveryNoteItem` deve apontar para um `OutsourcedService` do mesmo `Contractor` registrado no cabeçalho do `DeliveryNote`.
- Períodos de `ServicePrice` não devem se sobrepor quando essa validação for implementada.
- Datas recebidas pela interface devem ser tratadas como dias comerciais, sem deslocamento provocado por timezone.

## Fontes de verdade e dados derivados

Fontes de verdade principais:

- Cadastro de empresas.
- Cadastro de clientes.
- Cadastro de produtos / referências.
- Cadastro de terceirizados.
- Cadastro reutilizável de Serviços.
- Preços de Serviço vigentes para sugestão de novos Serviços Terceirizados.
- OP para número, data de entrada, empresa, cliente, Produto / Referência principal, quantidade, preço unitário, valor previsto e informações comerciais.
- Serviço Terceirizado para vínculo com OP, Serviço, Terceirizado, preço aplicado, status e observações.
- Itens de Romaneio para quantidades enviadas em cada movimentação.
- Retornos para quantidades retornadas.
- Quantidade aprovada para pagamento para apuração de fechamentos.
- Fechamento mensal para apuração de quantidades e valores a pagar.
- Faturamento / NFe como fonte de verdade da cobrança de determinada OP.
- Conta a Receber como fonte de verdade da obrigação financeira do cliente.
- Recebimento como fonte de verdade da entrada real de dinheiro.
- Alocação de Recebimento como fonte de verdade da distribuição daquele recebimento entre Contas a Receber.
- Conta a Pagar como fonte de verdade da obrigação financeira a pagar.
- Pagamento como fonte de verdade da saída real de dinheiro.
- Classificações e datas de competência para DRE.
- Orçamento para valores previstos.

Dados derivados principais:

- Valor total da OP.
- Quantidade enviada do Serviço Terceirizado.
- Quantidade retornada do Serviço Terceirizado.
- Quantidade pendente do Serviço Terceirizado.
- Valor previsto do Serviço Terceirizado.
- Valor elegível para pagamento.
- Serviços em poder de terceirizados.
- Itens de cobrança de terceirizados.
- Valor total de fechamento mensal.
- Recibo de fechamento.
- Conta a pagar a partir de fechamento aprovado.
- Conta a receber a partir de faturamento.
- Valor recebido de Conta a Receber.
- Saldo a receber.
- Status financeiro de Conta a Receber.
- Fluxo de caixa.
- DRE mensal e anual.
- Comparação Previsto x Real.
- Relatórios e dashboards.
