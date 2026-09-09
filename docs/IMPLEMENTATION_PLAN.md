# Plano de Implementação

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

Estado atual: implementada a interface de cadastro, consulta, edição e ativação/desativação de empresas, clientes, produtos, terceirizados e serviços. O catálogo de serviços permite registrar novos preços sem sobrescrever o histórico e consultar o preço vigente.

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

Estado atual: implementadas entrada, listagem com filtros, detalhe e edição de OP. O valor total permanece derivado e não há exclusão física, cancelamento, autenticação ou bloqueio futuro de edição.

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

Estado atual: implementada a inclusão, listagem e edição de Serviços Terceirizados dentro da OP. A interface sugere o preço padrão vigente, permite informar manualmente serviços sem preço, preserva o preço aplicado e exibe quantidades e situação operacional derivadas. Nesta fase, a quantidade aprovada permanece zero e não há criação de romaneio ou retorno.

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
- Sugerir preço unitário a partir do Preço de Serviço.
- Permitir ajuste do preço unitário aplicado.
- Preservar historicamente o preço unitário aplicado.
- Tratar Frente e Costas como Serviços Terceirizados normais e independentes.

Critério de aceite:

- Nenhum Serviço Terceirizado é criado sem OP.
- Cliente, produto e demais dados já disponíveis via OP não são redigitados no Serviço Terceirizado.
- Alterar um preço padrão futuro não muda Serviços Terceirizados antigos.

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

Estado atual: implementada a geração exclusiva a partir de fechamento aprovado, com vínculo monoempresa, snapshot financeiro, vencimento, consulta e detalhe. Implementados também pagamentos parciais ou totais, histórico, saldo e situação derivados, com bloqueio transacional contra pagamento excedente concorrente.

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
- Registrar e consultar múltiplos pagamentos sem edição, exclusão ou estorno nesta fase.

Critério de aceite:

- Um fechamento aprovado pode virar conta a pagar sem redigitação.

## Fase 9 - Faturamento e contas a receber

Estado atual: implementado o registro interno de faturamento externo por OP e a criação atômica da Conta a Receber, com snapshots de Company, Customer, valor e competência. A consulta financeira deriva recebido zero, saldo e situação enquanto Recebimentos ainda não existem.

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

Estado atual: DRE Gerencial operacional mensal implementada por Company e competência. Inclui Receita Bruta, Custos e Despesas Variáveis, Margem de Contribuição, Custos e Despesas Fixas, Lucro Operacional, percentuais e detalhamento auditável por fatos de origem e snapshots. Resultado Líquido, visão anual definitiva, impostos, investimentos, reservas e orçamento continuam pendentes.

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
DECISÃO PENDENTE: completar o plano de categorias e a fórmula posterior ao Lucro Operacional.

## Fase 12 - Previsto x Real

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
