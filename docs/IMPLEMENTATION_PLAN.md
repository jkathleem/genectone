# Plano de Implementação

## Etapa 1 pós-MVP - Base operacional

- [x] Setores internos configuráveis e ordenáveis.
- [x] Capacidades N:N de Serviço por setor interno ou Terceirizado.
- [x] Urgência, previsão opcional e conclusão opcional da OP sem status persistido duplicado.
- [x] Ciclo da OP e disponibilidade para Montagem preparados como derivações.
- [x] Produto ampliado com cliente padrão, cor, preço atual e URL opcional de imagem, preservando o preço snapshot da OP.
- [x] Insumos proporcionais por Produto sem estoque ou snapshot prematuro.
- [x] Cadastro de Terceirizado ampliado com campos opcionais compatíveis.
- [x] Perfil `CONTRACTOR`, vínculo obrigatório e acesso mínimo.
- [x] Pendências operacionais com autoria, resolução e integridade relacional.
- [x] Correção estrutural do preço atual para `Contractor + Service`, sem alterar snapshots históricos.
- [x] Cadastros ampliados e unificados em `/cadastros`, com permissões por aba e compatibilidade das rotas antigas.
- [x] Nova experiência de OP, Kanban e portal do Terceirizado (etapas pós-MVP concluídas até a Etapa 5).

## Estornos financeiros

- [x] Estorno total de Payment e Receipt sem exclusão física.
- [x] Reabertura de saldos e movimentos inversos no Fluxo de Caixa.
- [x] Autoria do estorno total preservada.
- [ ] Estorno parcial (futuro).

## Orçamento / Previsto x Realizado v1

- [x] Budget mensal monoempresa e BudgetEntry com snapshots.
- [x] Receita Bruta especial, classificações DRE e exclusão de NON_DRE.
- [x] Comparação mensal reutilizando fatos da DRE, incluindo gastos não orçados.
- [x] Criação, alteração e exclusão de linhas na rota financeira.
- [x] Visão anual com totais e margens calculadas sobre os totais.
- [x] Cópia transacional entre competências da mesma Company.
- [x] Governança DRAFT → APPROVED → CLOSED com congelamento transacional.
- [x] Autoria de aprovação e fechamento preservada e exibida.
- [ ] Reabertura controlada e versionamento/revisão (futuro).

Este plano propõe fases incrementais. Cada fase deve entregar algo utilizável e testável, preservando o princípio de registrar a informação uma única vez no momento em que o fato ocorre.

Nenhuma tecnologia, banco de dados, frontend, backend ou dependência é escolhida nesta etapa.

## Fase 0 - Documentação inicial

Objetivo:

- Registrar visão de produto, regras conhecidas, modelo de domínio, plano de implementação e decisões.

Entregáveis testáveis:

- Documentos iniciais criados em `docs/`.
- Regras de negócio identificadas.
- Decisões pendentes registradas.

Critério de aceite:

- A equipe consegue revisar o escopo antes de qualquer implementação.

## Fase 1 - Base do sistema e cadastros

Estado atual: implementada a interface de cadastro, consulta, edição e ativação/desativação de empresas, clientes, produtos, terceirizados e serviços. O catálogo de serviços consulta as capacidades externas e o preço atual de cada combinação `Terceirizado + Serviço`; o histórico permanece nos lançamentos operacionais.

Objetivo:

- Criar a base conceitual necessária para registrar OPs e Serviços Terceirizados.

Módulos priorizados:

- Empresas.
- Clientes.
- Produtos.
- Terceirizados.
- Serviços.
- Preços de Serviço.

Entregáveis testáveis:

- Cadastrar, consultar, editar e listar empresas.
- Cadastrar, consultar, editar e listar clientes.
- Cadastrar, consultar, editar e listar produtos.
- Cadastrar, consultar, editar e listar terceirizados.
- Cadastrar Serviços reutilizáveis.
- Registrar preços padrão configuráveis por Serviço.
- Garantir separação de dados por empresa.

Critério de aceite:

- A base mínima para entrada de OPs e criação manual de Serviços Terceirizados está disponível.

## Fase 2 - OPs

Estado atual: implementadas entrada, listagem com filtros, detalhe e edição de OP. O valor total permanece derivado e não há exclusão física, cancelamento ou bloqueio futuro de edição. A autenticação e as permissões do MVP protegem as ações no servidor.

Objetivo:

- Permitir que a OP seja cadastrada primeiro e se torne a origem operacional do sistema.

Módulos priorizados:

- Ordens de Produção.

Entregáveis testáveis:

- Criar OP vinculada a empresa, cliente e produto.
- Registrar número da OP, data de entrada, quantidade, preço unitário e demais informações comerciais disponíveis.
- Calcular valor total da OP a partir de quantidade multiplicada por preço unitário quando aplicável.
- Consultar OPs por empresa, cliente, produto, data de entrada e situação.
- Visualizar a visão econômica inicial da OP.

Critério de aceite:

- Uma OP pode ser registrada antes de qualquer Serviço Terceirizado ou romaneio.
- Dados da OP ficam disponíveis para reutilização posterior.

DECISÃO PENDENTE: definir quais campos de produção e informações comerciais são obrigatórios na OP.

## Fase 3 - Serviços Terceirizados da OP

Estado atual: implementada a inclusão, listagem e edição de Serviços Terceirizados dentro da OP. O servidor exige vínculo ativo `Contractor + Service`, copia seu preço atual para o snapshot e rejeita combinações sem preço, sem fallback global ou preço manual. Quantidades e situação operacional permanecem derivadas.

Objetivo:

- Permitir que o usuário adicione manualmente os Serviços Terceirizados necessários para uma OP existente.

Módulos priorizados:

- OPs.
- Serviços Terceirizados.
- Serviços.
- Terceirizados.
- Preços de Serviço.

Entregáveis testáveis:

- Abrir uma OP existente.
- Adicionar Serviço Terceirizado manualmente.
- Escolher Serviço cadastrado.
- Escolher Terceirizado.
- Informar quantidade prevista quando aplicável.
- Exibir a quantidade enviada derivada dos futuros itens de romaneio, sem digitá-la no Serviço Terceirizado.
- Exibir o preço unitário atual da combinação exata `Terceirizado + Serviço`.
- Impedir preço manual ou fallback de outro Terceirizado no lançamento.
- Preservar historicamente o preço unitário aplicado.
- Tratar Frente e Costas como Serviços Terceirizados normais e independentes.

Critério de aceite:

- Nenhum Serviço Terceirizado é criado sem OP.
- Cliente, produto e demais dados já disponíveis via OP não são redigitados no Serviço Terceirizado.
- Alterar o preço atual de uma combinação não muda Serviços Terceirizados antigos.

## Fase 4 - Romaneios e múltiplas saídas

Estado atual: implementada a emissão transacional de Romaneios para um único Terceirizado, com múltiplos Serviços Terceirizados e múltiplas OPs, numeração automática segura, consulta, detalhe e impressão em duas vias. Quantidade enviada e saldo disponível são derivados dos itens; Romaneios emitidos não são editados, excluídos ou cancelados nesta fase.

Objetivo:

- Registrar movimentações físicas de saída para terceirizados.

Módulos priorizados:

- Romaneios.
- Itens de Romaneio.
- Serviços Terceirizados.

Entregáveis testáveis:

- Criar romaneio para exatamente um terceirizado.
- Selecionar Serviços Terceirizados já cadastrados para compor o romaneio.
- Permitir itens de OPs, clientes, referências e serviços diferentes no mesmo romaneio, desde que todos saiam para o mesmo terceirizado.
- Registrar quantidade enviada por item de romaneio.
- Permitir mais de uma saída para o mesmo Serviço Terceirizado.
- Derivar quantidade enviada total pela soma das movimentações.
- Gerar romaneio sem redigitar OP, cliente, produto/referência, serviço, terceirizado e quantidade selecionada.

Critério de aceite:

- O romaneio deriva de Serviços Terceirizados existentes.
- O sistema nunca cria OP a partir de romaneio.
- Um romaneio nunca mistura itens enviados para terceirizados diferentes.

## Fase 5 - Retornos parciais e quantidades derivadas

Estado atual: implementados múltiplos Retornos, histórico, validação transacional contra sobre-retorno, conferência acumulada da quantidade aprovada e painel de cobrança dos serviços com pendência física.

Objetivo:

- Registrar múltiplos retornos e calcular saldos de terceirização.

Módulos priorizados:

- Retornos.
- Serviços Terceirizados.

Entregáveis testáveis:

- Registrar múltiplos retornos para o mesmo Serviço Terceirizado.
- Preservar data, quantidade retornada, Serviço Terceirizado relacionado e observações.
- Derivar quantidade retornada pela soma dos retornos.
- Derivar quantidade pendente por quantidade enviada menos quantidade retornada.
- Manter quantidade pendente como dado calculado, não digitado.
- Registrar quantidade aprovada para pagamento separadamente.

Critério de aceite:

- Enquanto houver quantidade pendente maior que zero, o Serviço Terceirizado permanece pendente.
- Quando a quantidade pendente chega a zero, o Serviço Terceirizado deixa de aparecer como pendência de retorno.

DECISÃO PENDENTE: confirmar se toda quantidade retornada é automaticamente aprovada para pagamento ou se existe conferência/ajuste.

## Fase 6 - Painel operacional e cobranças

Objetivo:

- Dar visibilidade ativa aos Serviços Terceirizados ainda fora da Genect.

Módulos priorizados:

- Painel de cobrança.
- Serviços Terceirizados.
- Romaneios.
- Retornos.

Entregáveis testáveis:

- Listar apenas Serviços Terceirizados com quantidade pendente maior que zero.
- Mostrar OP, cliente, serviço, terceirizado, quantidade enviada, quantidade retornada e quantidade pendente.
- Mostrar data da última saída e tempo fora quando disponível.
- Gerar ação recomendada, como "COBRAR COSTAS DA OP 12345 - RAFAEL".
- Remover automaticamente do painel serviços cuja quantidade pendente chegou a zero.

Critério de aceite:

- A equipe consegue responder imediatamente o que ainda está fora da Genect e com quem está.

## Fase 7 - Fechamento de terceirizados

Status: implementada nesta versão. Inclui criação e edição de rascunhos monoempresa, inclusão/alteração/remoção de itens, filtros, aprovação transacional, demonstrativo imprimível e bloqueio integral após aprovação. A geração de Conta a Pagar foi implementada na Fase 8.

Objetivo:

- Automatizar apuração mensal dos valores devidos a terceirizados.

Módulos priorizados:

- Fechamento mensal de terceirizados.
- Serviços Terceirizados.

Entregáveis testáveis:

- Calcular fechamento mensal por terceirizado.
- Filtrar fechamento por mês, terceirizado, serviço e OP.
- Mostrar terceirizado, período, quantidade de OPs, relação das OPs, serviços realizados, quantidade aprovada, preço unitário aplicado, subtotal por serviço e total geral.
- Usar quantidade aprovada para pagamento multiplicada pelo preço unitário aplicado.
- Rastrear quantidades já incluídas em fechamento anterior.
- Impedir pagamento duplicado da mesma quantidade.
- Aprovar fechamento.
- Gerar recibo.

Critério de aceite:

- O fechamento é calculado sem redigitação dos serviços já registrados.
- O fechamento não recalcula serviços antigos usando preço atual do cadastro.
- O recibo reflete os serviços e quantidades incluídos no período.

## Fase 8 - Contas a pagar

Estado atual: implementada a geração a partir de fechamento aprovado e também o lançamento manual, sempre com vínculo monoempresa, snapshot financeiro, vencimento, consulta e detalhe. Pagamentos parciais ou totais, histórico, saldo e situação derivados, estorno total com autoria e bloqueio transacional contra pagamento excedente concorrente também estão implementados.

Objetivo:

- Transformar fechamento aprovado em controle financeiro de pagamentos.

Módulos priorizados:

- Contas a pagar.
- Fechamento mensal de terceirizados.

Entregáveis testáveis:

- Gerar conta a pagar a partir de fechamento aprovado.
- Manter vínculo entre conta a pagar e fechamento de origem.
- Registrar vencimento, competência e pagamento como datas distintas.
- Consultar contas a pagar por vencimento, pagamento, competência e origem.
- Registrar e consultar múltiplos pagamentos sem edição ou exclusão física, com estorno total auditável.

Critério de aceite:

- Um fechamento aprovado pode virar conta a pagar sem redigitação.

## Fase 9 - Faturamento e contas a receber

Estado atual: implementado o registro interno de faturamento externo por OP e a criação atômica da Conta a Receber, com snapshots de Company, Customer, valor e competência. Recebimentos permitem alocação integral em múltiplas contas compatíveis, mantêm histórico e podem ser estornados integralmente com autoria; saldo e situação permanecem derivados.

Objetivo:

- Usar a OP como origem para faturamento e contas a receber.

Módulos priorizados:

- Faturamento.
- Contas a receber.
- OP.

Entregáveis testáveis:

- Faturar uma OP.
- Gerar faturamento com dados reaproveitados da OP.
- Gerar conta a receber a partir do faturamento.
- Consultar contas a receber por vencimento, recebimento, competência e origem.
- Distinguir OP recebida, valor previsto, faturamento, conta a receber e recebimento.

Critério de aceite:

- Uma OP faturada alimenta faturamento e contas a receber sem redigitação dos dados da OP.
- OP cadastrada não vira receita realizada automaticamente.

Decisão desta versão: qualquer OP ainda não faturada pode receber o registro manual, sem exigir status produtivo. A regra poderá ser revista quando o ciclo de vida da OP existir.

## Fase 10 - Fluxo de caixa

Estado atual: implementadas as visões Previsto e Realizado do Fluxo de Caixa, derivadas diretamente de contas, Payments e Receipts. Inclui filtros, totais, líquido, agrupamento diário, movimentos detalhados e vencidos anteriores ao período. Não representa saldo bancário e não possui tabela própria.

Objetivo:

- Consolidar entradas e saídas financeiras reais ou previstas.

Módulos priorizados:

- Contas a pagar.
- Contas a receber.
- Recebimentos.
- Pagamentos.
- Fluxo de caixa.

Entregáveis testáveis:

- Calcular saldo inicial, contas a pagar, contas a receber e saldo final por período.
- Usar o saldo final de um período como saldo inicial do seguinte.
- Separar valores previstos e realizados.
- Trabalhar com vencimento, pagamento e recebimento sem confundir com competência.

Critério de aceite:

- O fluxo de caixa reflete contas a pagar e receber sem lançamentos duplicados.

## Fase 11 - DRE

Estado atual: DRE Gerencial mensal e anual implementada por Company e competência até o Resultado Líquido Gerencial. Inclui Receita Bruta, Variáveis, Margem de Contribuição, Fixas, Lucro Operacional, Receitas e Despesas Financeiras, Resultado Antes dos Tributos, Tributos sobre o Resultado, margens e composição auditável. O plano possui 13 classificações oficiais. Demais impostos, investimentos e reservas continuam fora desta versão; Orçamento / Previsto x Real está implementado na Fase 12.

Evolução estrutural concluída: `FinancialClassification` é um catálogo financeiro amplo, com `OPERATING_EXPENSE`, `DRE_POST_OPERATING` ou `NON_DRE`. A DRE preserva sua fórmula operacional, acrescenta despesas financeiras e tributos para derivar o Resultado Líquido Gerencial e ignora `NON_DRE`; essas contas continuam no Fluxo de Caixa. O plano oficial possui 13 classificações. Receitas Financeiras permanecem zero até existir uma fonte própria.

Objetivo:

- Apurar resultado por competência sem confundir OP cadastrada com receita realizada.

Módulos priorizados:

- DRE.
- Classificações de receitas e despesas.
- Contas a pagar.
- Contas a receber.
- Faturamento.

Entregáveis testáveis:

- Consultar DRE mensal.
- Consultar DRE anual.
- Apurar Receita Bruta, Custos e Despesas Variáveis, Margem de Contribuição, Custos e Despesas Fixas, Lucro Operacional e Resultado Líquido.
- Separar OP recebida, valor previsto, faturamento, conta a receber, recebimento financeiro e receita reconhecida.
- Separar data de competência, vencimento e pagamento ou recebimento.

Critério de aceite:

- O DRE apresenta visão de competência e não se confunde com fluxo de caixa.

Decisão confirmada: Receita Bruta usa Billing por competência e Company; terceirização usa a classificação variável oficial.
Decisão confirmada: a fórmula posterior ao Lucro Operacional deriva o Resultado Líquido Gerencial; Receitas Financeiras ficam zero até existir uma fonte própria.

## Fase 12 - Previsto x Real

Estado atual: implementado orçamento mensal monoempresa com rascunho editável, aprovação, fechamento, autoria, cópia de competência, visão mensal e anual e comparação com os fatos da DRE. Orçamentos aprovados ou fechados são somente leitura nesta versão.

Objetivo:

- Comparar valores planejados, previstos e realizados.

Módulos priorizados:

- Orçamento / Previsto x Real.
- OPs.
- Financeiro.
- DRE.

Entregáveis testáveis:

- Registrar orçamento ou valores previstos.
- Comparar previsto com real por período.
- Comparar valor previsto de OP com fatos posteriores quando aplicável.
- Exibir variações entre orçamento, faturamento, recebimento, custos, despesas e resultado.

Critério de aceite:

- A gestão consegue comparar previsto e real sem duplicar lançamentos.

## Fase 13 - Dashboards e relatórios

Objetivo:

- Dar visão gerencial consolidada da operação e do financeiro.

Módulos priorizados:

- Relatórios e dashboards.
- OPs.
- Terceirização.
- Financeiro.
- DRE.
- Previsto x Real.

Entregáveis testáveis:

- Exibir relatórios operacionais de OPs e terceirização.
- Exibir painel de cobrança de terceirizados.
- Exibir relatórios financeiros de contas, caixa e DRE.
- Exibir relatórios de orçamento e Previsto x Real.

Critério de aceite:

- A gestão consegue acompanhar operação, cobranças, financeiro, DRE e variações entre previsto e realizado.

## Fora do escopo do MVP

- Roteiro produtivo por produto.
- Geração automática de etapas por produto.
- Dependências configuráveis entre etapas.
- Workflow produtivo complexo.
- Motor de sequência de produção.
- Execução interna detalhada.

## Etapa 3 pós-MVP - Workspace operacional da OP

- [x] Lista compacta com busca ampla e filtros cadastrais/derivados.
- [x] Criação por Produto com Cliente sugerido e snapshots de preço e insumos.
- [x] Detalhe em Resumo, Serviços, Insumos, Financeiro e Histórico.
- [x] Executores filtrados pelas capacidades, internos sem preço e externos com snapshot.
- [x] Envio, retorno, aprovação e pendências dentro da OP reutilizando fatos oficiais.
- [x] Montagem, progresso e atraso derivados.
- [x] Conclusão sem faturamento automático e visão financeira consolidada.
- [x] Timeline derivada sem tabela duplicada.
- [x] Kanban/Home operacional (Etapa 4).

## Etapa 4 pós-MVP - Home operacional e Kanban de OPs

- [x] Home substituída por Painel de Produção com busca, filtros e botão de Nova OP para perfis operacionais.
- [x] Indicadores compactos de OPs em produção, urgentes, atrasadas, aguardando complemento e pendências abertas.
- [x] Bloco `Precisam de atenção` priorizando pendências, bloqueios, atrasos, urgência e previsão vencida.
- [x] Kanban derivado com colunas de Setores Internos, Terceirizados e Montagem, sem drag-and-drop.
- [x] Mesma OP pode aparecer em múltiplas colunas porque o card representa `OP + Serviço + Executor`.
- [x] Montagem usa os helpers derivados da OP e exibe quem concluiu e quem falta.
- [x] Filtros por situação, Cliente, Produto, Terceirizado, Serviço, busca ampla e opção de mostrar concluídos.
- [x] Testes de domínio cobrem múltiplas colunas, retorno parcial, atraso, pendência, bloqueio e prioridade.
- [x] Portal do Terceirizado (Etapa 5).

## Etapa 5 pós-MVP - Portal do Terceirizado

- [x] `/` de usuário `CONTRACTOR` redireciona para `/portal`, sem exibir Kanban interno.
- [x] Menu reduzido com Início, Minhas OPs, Financeiro e Sair.
- [x] Home do portal com identidade do Terceirizado, indicadores operacionais e financeiros.
- [x] Lista `OP + Serviço` filtrada por `session.user.contractorId`, com busca por OP, referência, produto e serviço.
- [x] Detalhe restrito do serviço, com quantidades, prazo, entregas confirmadas e pendências.
- [x] Criação segura de pendência operacional pelo Contractor, usando tipos existentes e `createdByUserId`.
- [x] Contractor não resolve pendências; Home interna continua refletindo `OPEN` e `IN_PROGRESS`.
- [x] Financeiro restrito com produzido aguardando fechamento, fechado aguardando pagamento, pagamentos efetivos e estornos.
- [x] Nenhuma migration criada.
- [ ] Notificações, WhatsApp, confirmação de entrega pelo Contractor, upload e assinatura digital permanecem futuros.

## Etapa 6 pós-MVP - Simplificação visual do Financeiro e da DRE

- [x] Menu Financeiro reorganizado com Visão Geral, Contas a Pagar, Contas a Receber, Fluxo de Caixa, DRE e Orçamento / Previsto x Realizado.
- [x] Nova rota `/financeiro` com indicadores de A/P, A/R, vencidos, caixa realizado, carteira, concluído a faturar e faturado a receber.
- [x] Carteira de produção identificada como previsão, sem impacto na DRE.
- [x] Concluído a faturar derivado de OP concluída sem Billing.
- [x] Faturado a receber derivado de Contas a Receber e recebimentos/estornos.
- [x] DRE mantida como cálculo único por competência, com apresentação hierárquica e drill-down por categoria.
- [x] Rótulos amigáveis para grupos e tipos financeiros nas telas principais.
- [x] Nenhuma migration criada.

## Etapa 10.2 pós-MVP - Estoque, Insumos e Compras

- [x] Auditoria funcional de Estoque, Insumos e Compras concluída antes da implementação.
- [x] Decisões de domínio fechadas: `Supply` reutilizado, unidade textual preservada, saldo derivado de movimentos e compra separando Company interna de fornecedor snapshot.
- [x] Base de schema/migration criada para `SupplyPurchase`, `SupplyPurchaseItem`, `StockMovement` e `ProductionOrderSupplyConsumption`.
- [x] `AccountPayableSource` preparado para `SUPPLY_PURCHASE`, preservando `CONTRACTOR_SETTLEMENT` e `MANUAL`.
- [x] Serviços de domínio para registrar compra, consumo real, ajustes, saldos e consultas de movimentação.
- [x] Interface de Estoque, Compras e Movimentações.
- [ ] Integração de consumo real no workspace da OP.
- [ ] Integração financeira da compra com Conta a Pagar.
