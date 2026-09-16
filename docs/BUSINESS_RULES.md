# Regras de Negócio

## Base operacional pós-MVP

- BR-257: Os cadastros mestres internos são apresentados em `/cadastros` por abas; rotas antigas permanecem como redirecionamentos de compatibilidade.
- BR-258: Campos adicionais de Company e Customer são opcionais para preservar registros históricos. Customer novo informa PF ou PJ, sem tornar CPF/CNPJ obrigatório.
- BR-259: A consulta externa de CNPJ é opcional e nunca pode impedir preenchimento manual; nenhum provedor foi integrado nesta etapa.
- BR-260: Alteração em massa afeta somente `Product.currentUnitPrice`; percentual exige preço atual e todos os cálculos persistidos usam Decimal. `ProductionOrder.unitPrice` permanece snapshot.
- BR-261: Um `ProductSupply` pode permanecer sem regra de consumo, mas quantidade por base e quantidade base devem ser informadas em conjunto e ser positivas.
- BR-262: Setor interno pode habilitar Serviços, sem receber preço de terceirização. A dupla Setor + Serviço é única.
- BR-263: A interface denomina `FinancialClassification` como Categoria Financeira e deriva a natureza técnica do grupo amigável escolhido, preservando as regras de coerência e os snapshots existentes.
- BR-264: ADMIN edita todas as abas; OPERATIONS edita cadastros operacionais; FINANCE edita Categorias e consulta os demais mestres; VIEWER somente consulta; CONTRACTOR não acessa o ambiente geral.
- BR-239: `InternalSector` é um cadastro configurável; nome, ordem, observações e situação podem mudar, mas setor relacionado a um Serviço não pode ser apagado fisicamente.
- BR-240: `Service` representa o trabalho independentemente de quem o executa. Um mesmo Serviço pode habilitar vários setores internos e vários terceirizados, sem duplicar o catálogo.
- BR-241: Os vínculos de executor são capacidades cadastrais; `OutsourcedService` continua sendo o fato de uma execução externa real e preserva todas as regras auditadas de preço e movimentação.
- BR-242: A OP possui flag explícita de urgência, data opcional de previsão e instante opcional de conclusão. A previsão não é calculada automaticamente nesta etapa.
- BR-243: O ciclo conceitual da OP é derivado: `EM_PRODUCAO`, `CONCLUIDA`, `FATURADA` e `RECEBIDA`. Urgência e demais alertas não são status; cancelamento continua sem regra funcional.
- BR-244: Montagem fica parcialmente disponível quando ao menos um Serviço Terceirizado necessário possui envio e retorno integral; fica completamente disponível quando todos possuem retorno integral. Sem serviço concluído, não está disponível.
- BR-245: `Product.name` continua sendo a descrição e `reference` o código já existente. Cliente, cor, preço atual e URL opcional de imagem ampliam o cadastro sem alterar OPs históricas.
- BR-246: `ProductionOrder.unitPrice` permanece o snapshot comercial; alterar `Product.currentUnitPrice` não recalcula OP antiga.
- BR-247: `Supply` é um insumo reutilizável e ativo/inativo. `ProductSupply` relaciona Produto e Insumo sem criar estoque nem movimentação física.
- BR-248: A regra de consumo de `ProductSupply`, quando informada, exige `quantityPerBase` e `baseQuantity` positivas em conjunto; o previsto é `quantidade da OP × quantityPerBase ÷ baseQuantity`, calculado em Decimal.
- BR-249: Dados cadastrais adicionais de Terceirizado são opcionais para preservar prestadores informais e registros históricos; CPF/CNPJ continua não obrigatório.
- BR-250: Usuário `CONTRACTOR` exige exatamente um `contractorId`; outros perfis não podem possuir esse vínculo. O perfil não recebe mutações internas nem acesso financeiro ou operacional amplo nesta etapa.
- BR-251: `OperationalIssue` pertence a uma OP e a um Terceirizado, pode apontar para um Serviço Terceirizado coerente e preserva criador, tipo, descrição e histórico de resolução.
- BR-252: Tipos iniciais de pendência são `MISSING_THREAD`, `MISSING_TRIM`, `MISSING_COMPONENT`, `QUANTITY_ISSUE`, `EXECUTION_QUESTION` e `OTHER`.
- BR-253: Pendências seguem `OPEN`, `IN_PROGRESS` ou `RESOLVED`; somente resolvidas possuem `resolvedAt` e `resolvedByUserId`, e não são apagadas ou reabertas nesta etapa.
- BR-254: O preço atual de terceirização pertence à combinação `Contractor + Service`, armazenada em `ServiceContractor`; preço de setor interno não é tratado nessa estrutura.
- BR-255: Cada combinação `Contractor + Service` possui no máximo um vínculo, que pode ficar inativo ou sem preço. Nova atribuição externa exige vínculo ativo e preço Decimal positivo configurado.
- BR-256: `ServiceContractor.unitPrice` é a única fonte atual; `OutsourcedService.appliedUnitPrice` é a fonte histórica da atribuição e nunca é recalculada pelo cadastro.

## Autenticação e permissões

- Somente usuário ativo com sessão válida acessa o sistema interno.
- ADMIN administra usuários e possui acesso completo.
- OPERATIONS altera cadastros e fluxo operacional; FINANCE altera fluxo financeiro e orçamento; VIEWER possui somente consulta gerencial.
- Autorizações de escrita são verificadas no servidor e não dependem apenas do menu.
- Desativar um usuário encerra suas sessões; usuários não são excluídos fisicamente.
- Registros históricos sem autoria confiável permanecem sem autor.

## Orçamento / Previsto x Realizado

- BR-200: Orçamento é planejamento mensal por Company e competência no primeiro dia do mês; não cria fatos financeiros e não altera DRE realizada ou Fluxo de Caixa.
- BR-201: Cada Company possui no máximo um Budget por competência, com uma Receita Bruta especial e no máximo uma linha por classificação.
- BR-202: Linhas classificadas aceitam somente classificações ativas `OPERATING_EXPENSE` ou `DRE_POST_OPERATING`; `NON_DRE` não participa.
- BR-203: Valores previstos são Decimal, podem ser zero e não podem ser negativos. Linhas preservam snapshots completos da classificação.
- BR-204: O realizado reutiliza Billing e AccountPayable da DRE; Receita Financeira realizada permanece zero até existir origem adequada.
- BR-205: Variação é Realizado menos Previsto. Com previsto zero, percentual é indefinido. Gastos realizados não orçados continuam visíveis.
- BR-206: Somente orçamento `DRAFT` é editável; aprovação e fechamento são irreversíveis nesta versão e não existe reabertura.
- BR-207: A visão anual soma as 12 competências da mesma Company; mês sem Budget tem previsto zero e percentuais anuais são calculados sobre totais anuais.
- BR-208: A cópia de orçamento ocorre apenas entre competências da mesma Company, não copia fatos realizados nem sobrescreve destino existente.
- BR-209: A cópia é atômica e refaz snapshots conforme o cadastro atual; classificação inativa, ausente, `NON_DRE` ou inelegível rejeita toda a operação.
- BR-210: O ciclo permitido é exclusivamente `DRAFT → APPROVED → CLOSED`; timestamps devem ser coerentes com o status.
- BR-211: Budget vazio não pode ser aprovado. Aprovação congela o plano e fechamento encerra a competência sem gerar ou alterar fatos financeiros.
- BR-212: Cópias de Budget em qualquer status sempre criam destino `DRAFT`, sem copiar status ou timestamps.

Este documento registra apenas as regras conhecidas nesta etapa. Pontos não informados são marcados como DECISÃO PENDENTE.

## Empresas, clientes e OPs

- BR-001: O sistema deve permitir múltiplas empresas da Genect sem misturar seus dados.
- BR-002: Uma OP pertence a uma empresa.
- BR-003: Uma OP pertence a um cliente.
- BR-004: Uma OP possui um Produto / Referência principal no MVP.
- BR-005: Uma OP possui quantidade.
- BR-006: Uma OP possui informações de produção.
- BR-007: Uma OP pode possuir vários Serviços Terceirizados.
- BR-008: Uma OP faturada deve alimentar faturamento e contas a receber sem necessidade de redigitar os dados da OP.
- BR-042: A OP deve ser cadastrada antes da criação de Serviços Terceirizados.
- BR-043: A OP deve existir antes da criação de qualquer Serviço Terceirizado vinculado a ela.
- BR-044: A OP deve existir antes da geração de romaneios relacionados a seus Serviços Terceirizados.
- BR-045: Ao receber uma nova OP, o usuário deve cadastrá-la apenas uma vez.
- BR-046: A OP deve possuir, conforme os dados disponíveis, número da OP, data de entrada, empresa responsável, cliente, produto, quantidade, preço unitário, valor total calculado e demais informações comerciais necessárias.
- BR-047: O valor total da OP deve ser derivado de quantidade multiplicada por preço unitário quando aplicável.
- BR-048: Dados da OP não devem ser duplicados posteriormente nos módulos de romaneio, terceirização ou financeiro.
- BR-049: O sistema deve dar visibilidade econômica da OP desde sua entrada.
- BR-125: Para o MVP, uma OP possui exatamente um Produto / Referência principal.
- BR-126: O MVP não deve criar estrutura de múltiplos produtos por OP.
- BR-127: A regra de um Produto / Referência principal por OP pode ser revista futuramente se houver necessidade operacional real.

## Cadastros de terceirização

- BR-079: O sistema deve possuir cadastro de Terceirizados.
- BR-080: O cadastro de Terceirizado deve permitir futuramente registrar nome, documento, telefone, endereço, observações e situação ativo/inativo.
- BR-081: Não devem ser definidos campos obrigatórios adicionais para Terceirizado sem confirmação.
- BR-082: O sistema deve possuir cadastro reutilizável de Serviços que podem ser terceirizados.
- BR-083: Frente e Costas devem ser Serviços cadastrados, não entidades especiais.
- BR-084: Exemplos de Serviços cadastráveis incluem Frente, Costas, Preparação Frente, Pala e Gancho, Frente Completa, Final Frente e Preparação e Bolso Traseiro.

## Serviços Terceirizados

- BR-009: Frente e Costas são Serviços Terceirizados independentes quando cadastrados para uma OP.
- BR-010: Serviços Terceirizados diferentes da mesma OP podem ser executados por terceirizados diferentes.
- BR-013: O sistema deve controlar quantidade enviada para terceirização.
- BR-014: O sistema deve controlar quantidade retornada da terceirização.
- BR-017: O sistema deve permitir identificar rapidamente serviços ainda em poder dos terceirizados.
- BR-018: Quando um serviço retorna, deve ser possível identificar quais outros Serviços Terceirizados daquela OP ainda estão pendentes.
- BR-050: Depois da OP cadastrada, o usuário deve poder adicionar manualmente os Serviços Terceirizados necessários.
- BR-055: Não devem ser criados Serviços Terceirizados antes da OP correspondente existir.
- BR-056: Frente e Costas podem ser executados por terceirizados diferentes.
- BR-057: Frente e Costas podem sair em momentos diferentes.
- BR-058: Frente e Costas podem retornar em momentos diferentes.
- BR-059: Frente e Costas podem possuir preços diferentes.
- BR-060: Frente e Costas devem possuir controles independentes.
- BR-062: O sistema deve identificar os estados Frente já retornou e Costas continua fora, Costas já retornou e Frente continua fora, ambos continuam fora e ambos já retornaram.
- BR-063: O sistema deve permitir criar um painel de cobrança de terceirizados.
- BR-064: Serviços com quantidade pendente igual a zero não devem aparecer no painel de cobrança.
- BR-065: Serviços Terceirizados devem sempre estar relacionados a uma OP existente.
- BR-066: Um Serviço Terceirizado deve registrar pelo menos OP, serviço, terceirizado, quantidade prevista quando aplicável, quantidade enviada, quantidade retornada, quantidade aprovada para pagamento, preço unitário aplicado, status excepcional quando aplicável, movimentações de saída, retornos, romaneios relacionados e observações.
- BR-067: O valor previsto do Serviço Terceirizado deve ser derivado de quantidade enviada multiplicada pelo preço unitário aplicado.
- BR-085: Um Serviço Terceirizado representa um serviço real executado externamente para determinada OP.
- BR-086: Um Serviço Terceirizado deve estar obrigatoriamente vinculado a uma OP, um Serviço cadastrado e um Terceirizado.
- BR-087: Um Serviço Terceirizado não deve duplicar cliente, produto ou outros dados que possam ser obtidos através da OP.
- BR-088: O usuário deve escolher o Serviço, escolher o Terceirizado, informar a quantidade e utilizar o preço sugerido ou alterar o preço aplicado quando necessário.
- BR-089: Não devem ser criadas no MVP entidades adicionais como Serviço da OP, Execução, Execução Interna, Roteiro Produtivo ou dependência entre etapas.
- BR-090: Não deve haver motor de dependências entre etapas no MVP.

## Quantidades

- BR-091: Quantidade prevista, quantidade enviada, quantidade retornada, quantidade aprovada para pagamento e quantidade pendente são conceitos distintos.
- BR-092: Quantidade prevista representa a quantidade que se espera executar naquele serviço.
- BR-093: Quantidade prevista pode ser inicialmente igual à quantidade da OP, mas não deve ser obrigatoriamente sempre igual.
- BR-094: Quantidade enviada representa a quantidade efetivamente enviada ao terceirizado.
- BR-095: Quantidade enviada pode ser derivada da soma das movimentações de saída.
- BR-096: Quantidade retornada representa a quantidade que fisicamente voltou para a Genect.
- BR-097: Quantidade retornada deve ser derivada da soma dos retornos.
- BR-098: Quantidade aprovada para pagamento representa a quantidade considerada válida para pagamento ao terceirizado após conferência.
- BR-099: Quantidade aprovada para pagamento pode ser igual à quantidade retornada na maioria dos casos, mas deve existir separadamente para permitir ajustes.
- BR-100: Quantidade pendente deve ser derivada de quantidade enviada menos quantidade retornada.
- BR-101: Quantidade pendente nunca deve ser digitada manualmente.
- BR-128: Quantidade retornada e quantidade aprovada para pagamento são conceitos diferentes.
- BR-129: O fluxo de pagamento do terceirizado deve seguir retorno físico, quantidade retornada, conferência e quantidade aprovada para pagamento.
- BR-130: A quantidade aprovada para pagamento pode ser menor que a quantidade retornada.

## Preços de serviços terceirizados

- BR-019: Cada combinação entre Terceirizado e Serviço pode possuir um valor unitário atual.
- BR-020: O valor elegível para pagamento do Serviço Terceirizado deve ser calculado como quantidade aprovada para pagamento multiplicada pelo preço unitário aplicado.
- BR-021: O preço aplicado ao Serviço Terceirizado deve ficar historicamente registrado.
- BR-022: Mudanças futuras na tabela de preços não devem alterar Serviços Terceirizados antigos.
- BR-023: Os valores iniciais conhecidos são:
  - Neudenio → Preparação Frente: R$ 1,10 por peça.
  - Rafael → Pala e Gancho: R$ 0,27 por peça.
  - Pricila → Frente Completa: R$ 1,50 por peça.
  - Paulo → Final Frente: R$ 0,60 por peça.
  - Paulo Romes → Preparação e Bolso Traseiro: R$ 0,70 por peça.
- BR-068: A tabela inicial de preços deve ser tratada como configurável.
- BR-069: Os valores de serviços terceirizados não devem ser tratados como constantes fixas no código.
- BR-102: O preço atual da combinação Terceirizado + Serviço é copiado para novos Serviços Terceirizados; preço de outro Terceirizado nunca pode ser usado como fallback.
- BR-103: O Serviço Terceirizado deve guardar uma cópia do preço efetivamente aplicado naquele momento.
- BR-104: O fechamento nunca deve recalcular um serviço antigo usando o preço atual do cadastro.

## Romaneios e saídas

- BR-011: Cada envio para terceirização deve gerar ou pertencer a um romaneio.
- BR-012: Um romaneio registra saída de serviços para um terceirizado.
- BR-015: O sistema deve controlar data de saída para terceirização.
- BR-070: Romaneios são derivados de Serviços Terceirizados já existentes.
- BR-071: O sistema nunca deve criar uma nova OP a partir de um romaneio.
- BR-072: O usuário deve conseguir selecionar Serviços Terceirizados já cadastrados e gerar o romaneio sem redigitar OP, cliente, produto/referência quando disponível, serviço, terceirizado e quantidade selecionada para envio.
- BR-073: Um romaneio deve registrar a movimentação física de serviços para um terceirizado.
- BR-105: Um romaneio pertence a exatamente um terceirizado.
- BR-106: Um romaneio pode conter diversos itens.
- BR-107: Itens de um mesmo romaneio podem pertencer a OPs diferentes, clientes diferentes, referências diferentes e serviços diferentes.
- BR-108: Todos os itens de um romaneio devem estar indo para o mesmo terceirizado naquela saída.
- BR-109: Se parte da produção sair para outro terceirizado, deve ser criado outro romaneio.
- BR-110: Um item de romaneio deve estar vinculado a um Serviço Terceirizado e à quantidade enviada naquela movimentação.
- BR-111: Um mesmo Serviço Terceirizado pode ser enviado em mais de uma movimentação quando necessário.
- BR-112: O sistema não deve obrigar que toda a quantidade de um Serviço Terceirizado seja enviada de uma única vez.
- BR-138: O saldo disponível para nova saída deve ser derivado de quantidade prevista menos a soma dos itens de Romaneios anteriores.
- BR-139: A criação do Romaneio e de todos os seus itens deve ser atômica e deve validar no servidor quantidade disponível e igualdade do Terceirizado.
- BR-140: Romaneios recebem número sequencial automático global; o usuário não informa o número manualmente.
- BR-141: Romaneios emitidos não podem ser editados ou excluídos nesta fase.

## Retornos

- BR-016: O sistema deve controlar retornos da terceirização.
- BR-113: Um Serviço Terceirizado pode possuir múltiplos retornos.
- BR-114: Cada retorno deve preservar data, quantidade retornada, Serviço Terceirizado relacionado e observações quando necessárias.
- BR-115: O histórico de retorno não deve ser representado apenas por uma única Data de Retorno.
- BR-116: Enquanto houver quantidade pendente maior que zero, o serviço continua aparecendo como pendente no controle de terceirização.
- BR-142: Um Retorno não pode superar a quantidade enviada ainda pendente e deve ser validado transacionalmente.
- BR-143: A quantidade aprovada é um total acumulado confirmado pelo usuário, nunca automático, entre zero e o total retornado.
- BR-144: O painel de cobrança mostra somente Serviços Terceirizados com pendência física maior que zero.

## Status de Serviços Terceirizados

- BR-131: Estados operacionais calculáveis de Serviço Terceirizado não devem depender de digitação manual.
- BR-132: Quando quantidade enviada for igual a zero, o status operacional conceitual pode ser derivado como AGUARDANDO ENVIO.
- BR-133: Quando quantidade enviada for maior que zero e quantidade retornada for igual a zero, o status operacional conceitual pode ser derivado como EM TERCEIRIZAÇÃO.
- BR-134: Quando quantidade retornada for maior que zero e quantidade pendente for maior que zero, o status operacional conceitual pode ser derivado como RETORNO PARCIAL.
- BR-135: Quando quantidade enviada for maior que zero e quantidade pendente for igual a zero, o status operacional conceitual pode ser derivado como RETORNADO.
- BR-136: Estados excepcionais, como CANCELADO e SUSPENSO, podem futuramente ser armazenados explicitamente.
- BR-137: Ainda não deve ser definida enumeração técnica definitiva para status.

## Painel de cobrança

- BR-117: O painel de cobrança deve ser derivado dos Serviços Terceirizados e seus retornos.
- BR-118: O painel deve mostrar apenas serviços com quantidade pendente maior que zero.
- BR-119: O painel deve responder imediatamente o que ainda está fora da Genect e com quem está.
- BR-120: Para cada pendência, o painel deve mostrar, quando disponível, OP, cliente, serviço, terceirizado, quantidade enviada, quantidade retornada, quantidade pendente, data da última saída, tempo fora e ação recomendada.
- BR-121: Quando a quantidade pendente chegar a zero, o serviço deve desaparecer do painel automaticamente.

## Fechamento mensal de terceirizados

- BR-161: Retorno físico, aprovação de quantidade, fechamento e pagamento são fatos distintos.
- BR-162: Um fechamento em Rascunho pode ter competência, observações, terceirizado e itens editados; o terceirizado só pode mudar enquanto não houver itens.
- BR-163: Fechamentos em Rascunho não reservam nem consomem saldo elegível.
- BR-164: Somente fechamentos Aprovados consomem saldo; a aprovação é explícita, transacional e torna o fechamento imutável.
- BR-165: O preço do item é um snapshot do preço aplicado no Serviço Terceirizado e não muda durante edições posteriores.
- BR-166: Subtotais e total do fechamento são derivados de quantidade incluída multiplicada pelo preço snapshot.
- BR-167: Vários fechamentos para o mesmo terceirizado e período são permitidos, respeitando o saldo elegível.
- BR-168: Um fechamento aprovado pode gerar no máximo uma Conta a Pagar, mas não representa pagamento.

- BR-024: O fechamento mensal de um terceirizado deve ser calculado automaticamente a partir dos Serviços Terceirizados elegíveis para pagamento.
- BR-025: O fechamento mensal deve permitir gerar um recibo.
- BR-026: Um fechamento aprovado pode futuramente gerar uma conta a pagar.
- BR-027: A geração de conta a pagar a partir de fechamento aprovado deve evitar novo lançamento manual.
- BR-074: Os valores a pagar aos terceirizados devem ser derivados dos serviços realmente aprovados para pagamento.
- BR-075: O fechamento mensal deve permitir filtrar por terceirizado, mês, serviço e OP.
- BR-076: O fechamento mensal deve mostrar pelo menos terceirizado, período, quantidade de OPs, relação das OPs, serviços realizados, quantidade aprovada, preço unitário aplicado, subtotal por serviço e total geral.
- BR-122: O fechamento mensal deve consolidar Serviços Terceirizados elegíveis para pagamento.
- BR-123: Um Serviço Terceirizado não deve ser pago novamente em outro fechamento pela mesma quantidade já incluída anteriormente.
- BR-124: O modelo deve manter rastreabilidade das quantidades incluídas em fechamentos para evitar pagamento duplicado.

## Financeiro

- BR-213: Correção financeira ocorre por estorno total e novo lançamento; Payment, Receipt e allocations não são apagados.
- BR-214: PaymentReversal e ReceiptReversal exigem motivo e data não anterior ao fato original, com no máximo um estorno por fato.
- BR-215: Estornos reabrem saldos efetivos e geram movimento inverso no Fluxo de Caixa pela data do estorno, sem alterar a DRE.

- BR-169: Fechamento pertence a exatamente uma Company e não aceita itens de OPs de outra empresa.
- BR-170: Um fechamento aprovado gera no máximo uma Conta a Pagar; Conta a Pagar não equivale a Pagamento.
- BR-171: A competência usa o primeiro dia do mês, enquanto vencimento e pagamento são fatos distintos.
- BR-172: O valor original é snapshot Decimal do total dos itens do fechamento.
- BR-173: Sem Pagamentos, pago é zero, saldo é o valor original e a situação Em aberto/Vencida é derivada.
- BR-174: Uma Conta a Pagar aceita um pagamento total ou múltiplos pagamentos parciais, sempre em valor Decimal maior que zero e limitado ao saldo atual.
- BR-175: Valor pago é a soma dos Pagamentos; saldo é o valor original menos essa soma. Ambos são derivados e não devem ser armazenados na Conta a Pagar.
- BR-176: A situação financeira é derivada: Em aberto, Vencida, Parcial ou Pago. Parcial prevalece sobre vencida quando já houve pagamento e ainda existe saldo.
- BR-177: O registro de Pagamento deve bloquear a Conta a Pagar e recalcular o saldo na mesma transação antes da gravação.
- BR-178: Pagamento é imutável nesta versão e sua `paymentDate` representa a saída financeira efetiva usada pelo futuro Fluxo de Caixa.

- BR-028: Contas a pagar alimentam o fluxo de caixa.
- BR-029: Contas a receber alimentam o fluxo de caixa.
- BR-030: Receitas classificadas alimentam o DRE.
- BR-031: Despesas classificadas alimentam o DRE.
- BR-032: Fluxo de caixa e DRE são conceitos diferentes.
- BR-033: O DRE deve trabalhar principalmente com competência.
- BR-034: O fluxo de caixa deve trabalhar com entradas e saídas financeiras reais ou previstas.
- BR-035: Data de competência, vencimento e pagamento ou recebimento não devem ser tratadas como a mesma informação.
- BR-077: Uma OP cadastrada não deve ser transformada automaticamente em receita realizada sem regra definida.
- BR-078: O sistema deve distinguir OP recebida, valor previsto da OP, produção realizada, faturamento, conta a receber, recebimento financeiro e receita reconhecida no DRE conforme regra futura.
- BR-138: Cada OP possui seu próprio Faturamento / NFe no MVP.
- BR-139: Para o MVP, deve ser considerada a relação 1 OP para 1 NFe / Faturamento.
- BR-140: O MVP não deve criar faturamento agrupando várias OPs em uma mesma NFe.
- BR-141: A NFe deve reutilizar dados já existentes da OP sempre que aplicável.
- BR-142: O fluxo conceitual de receita deve ser OP, Faturamento / NFe e Conta a Receber.
- BR-143: Um pagamento recebido pela Genect pode corresponder a várias OPs/NFes.
- BR-144: Um Recebimento representa uma entrada financeira real única.
- BR-145: O sistema não deve criar múltiplos recebimentos bancários quando houve apenas uma transferência.
- BR-146: Um Recebimento pode ser distribuído entre várias Contas a Receber.
- BR-147: Uma Conta a Receber pode ser quitada por mais de um Recebimento.
- BR-148: A relação muitos-para-muitos entre Recebimento e Conta a Receber deve ser resolvida por Alocação de Recebimento.
- BR-149: Valor recebido de uma Conta a Receber deve ser derivado da soma das Alocações de Recebimento vinculadas.
- BR-150: Saldo a receber deve ser derivado do valor original da Conta a Receber menos o valor recebido.
- BR-151: Valor recebido e saldo a receber não devem ser digitados manualmente.
- BR-152: Status financeiro de Conta a Receber pode ser derivado conceitualmente: EM ABERTO quando valor recebido for zero, PARCIALMENTE RECEBIDO quando valor recebido for maior que zero e saldo maior que zero, e RECEBIDO quando saldo for zero.
- BR-153: Ainda não deve ser definida enumeração técnica definitiva para status financeiro.
- BR-154: O Fluxo de Caixa realizado deve considerar o Recebimento financeiro real como entrada.
- BR-155: Alocações de Recebimento servem para explicar a quais OPs/NFes o recebimento pertence.
- BR-156: O Fluxo de Caixa não deve somar alocações novamente como novas entradas de caixa.
- BR-157: Conta a Pagar deve possuir conceitualmente Pagamento.
- BR-158: Pagamento representa a saída financeira efetivamente realizada.
- BR-159: Pagamento registra Conta a Pagar relacionada, data do pagamento, valor pago e observações quando aplicáveis.
- BR-160: Pagamento alimenta o Fluxo de Caixa como saída realizada.
- BR-179: O sistema registra internamente Faturamento/NFe emitido externamente e não emite, autoriza ou integra documentos fiscais.
- BR-180: Cada OP possui no máximo um Billing; qualquer OP ainda não faturada pode ser registrada manualmente nesta versão, sem exigir status operacional.
- BR-181: O número da NFe é texto informado e único por Company; a Company do Billing é sempre copiada da OP.
- BR-182: `Billing.amount` é o valor efetivamente faturado, Decimal positivo e independente do valor previsto da OP.
- BR-183: Billing e AccountReceivable são criados atomicamente; um Billing origina exatamente uma Conta a Receber no fluxo normal do MVP.
- BR-184: Company e Customer da Conta a Receber são copiados da OP, sem escolha ou redigitação.
- BR-185: `AccountReceivable.originalAmount` copia `Billing.amount` e `competenceDate` copia a competência do Billing como snapshots financeiros.
- BR-186: Sem Recebimentos, recebido é zero, saldo é o valor original e a situação Em aberto/Vencida é derivada do vencimento.
- BR-187: OP, Faturamento, Conta a Receber e Recebimento são fatos distintos; apenas o futuro Receipt representará entrada real de caixa.
- BR-188: Receipt representa uma única entrada real e pertence a exatamente uma Company e um Customer.
- BR-189: Um Receipt pode ser distribuído entre várias Contas a Receber do mesmo Customer e Company; uma Conta pode receber alocações de vários Receipts.
- BR-190: A soma das ReceiptAllocations deve ser exatamente igual a Receipt.amount; não existe saldo não identificado nesta versão.
- BR-191: Recebido e saldo da Conta a Receber são derivados das alocações e não armazenados novamente.
- BR-192: A situação derivada é Em aberto, Vencida, Parcial ou Recebida; Parcial prevalece sobre vencida.
- BR-193: A criação bloqueia as Contas a Receber em ordem estável e recalcula seus saldos na mesma transação antes de criar Receipt e alocações.
- BR-194: Receipt e ReceiptAllocation são imutáveis nesta versão; `receiptDate` representa a entrada real usada pelo futuro Fluxo de Caixa.
- BR-195: O futuro Fluxo de Caixa deve contar Receipt uma única vez e não somar suas alocações como novas entradas.
- BR-196: Fluxo de Caixa é uma visão derivada e não deve possuir tabela para duplicar Payment, Receipt ou saldos de contas.
- BR-197: Realizado usa exclusivamente Receipt por `receiptDate` como entrada e Payment por `paymentDate` como saída.
- BR-198: Previsto usa somente o saldo remanescente de AccountReceivable e AccountPayable por `dueDate`; contas quitadas não entram.
- BR-199: ReceiptAllocation baixa Contas a Receber, mas não é movimento adicional de caixa.
- BR-200: Contas vencidas com saldo permanecem visíveis separadamente e não têm vencimento alterado ou movido para hoje.
- BR-201: Competência não determina Fluxo de Caixa; ela permanece destinada à futura visão da DRE.
- BR-202: A movimentação líquida exibida representa apenas os fatos registrados no sistema e não deve ser apresentada como saldo bancário.

## DRE

- BR-203: A Receita Bruta da DRE é derivada exclusivamente de `Billing.amount`, por `Billing.competenceDate` e `Billing.companyId`; Receipt e AccountReceivable não são somados novamente como receita.
- BR-204: O catálogo de Classificações Financeiras é global e usa código técnico estável, nome amigável, grupo DRE, situação e observações.
- BR-205: Nesta fase, os únicos grupos físicos são Custos e Despesas Variáveis e Custos e Despesas Fixas.
- BR-206: Toda nova Conta a Pagar possui classificação viva e snapshots de código, nome e grupo; alterações no cadastro não reclassificam fatos históricos.
- BR-207: Contas originadas de Fechamento recebem automaticamente `OUTSOURCED_PRODUCTION`, no grupo Custos e Despesas Variáveis, sem escolha do usuário.
- BR-208: Conta a Pagar pode ter origem `CONTRACTOR_SETTLEMENT` ou `MANUAL`; a primeira exige Fechamento e a segunda não pode possuí-lo.
- BR-209: Conta a Pagar manual exige Company ativa, beneficiário, descrição, classificação ativa, competência mensal, vencimento e valor Decimal positivo; não cria Pagamento.
- BR-210: O grupo DRE de uma classificação já usada não pode ser alterado nesta versão; código técnico não é editável e classificações não são excluídas fisicamente pela interface.
- BR-211: Despesas futuras da DRE usam `AccountPayable.originalAmount`, `competenceDate`, `companyId` e `dreGroupSnapshot`, nunca Payment.
- BR-212: A DRE permanece derivada e sua tela ainda não é implementada nesta fase.
- BR-213: A DRE Gerencial v1 é mensal, exige uma única Company e usa intervalo de competência do primeiro dia inclusive ao primeiro dia do mês seguinte exclusive.
- BR-214: Receita Bruta é a soma de `Billing.amount`; custos e despesas são a soma de `AccountPayable.originalAmount` agrupada pelos snapshots de classificação.
- BR-215: Margem de Contribuição é Receita Bruta menos Custos e Despesas Variáveis; Lucro Operacional é Margem de Contribuição menos Custos e Despesas Fixas.
- BR-216: Percentuais de Margem de Contribuição e Margem Operacional usam Receita Bruta como denominador e ficam indefinidos quando ela é zero.
- BR-217: Payment, Receipt, vencimento, saldo e situação financeira não alteram a DRE por competência.
- BR-218: A DRE operacional preserva o subtotal de Lucro Operacional antes da camada pós-operacional e do Resultado Líquido Gerencial.
- BR-219: Totais da DRE são derivados em Decimal, não persistidos, e devem aceitar resultados negativos e competências sem movimento.
- BR-220: O plano operacional inicial possui 11 classificações; com as duas classificações pós-operacionais, o plano oficial totaliza 13 e não representa plano contábil fiscal.
- BR-221: `OUTSOURCED_PRODUCTION`, `PRODUCTION_MATERIALS` e `PRODUCTION_SUPPLIES` pertencem a Custos e Despesas Variáveis.
- BR-222: `PAYROLL`, `PAYROLL_CHARGES`, `ELECTRICITY`, `RENT`, `ACCOUNTING`, `MAINTENANCE`, `ADMIN_EXPENSES` e `COMMERCIAL_EXPENSES` pertencem a Custos e Despesas Fixas nesta versão.
- BR-223: Salários e encargos sobre folha são lançamentos manuais independentes e não implicam integração ou cálculo de folha.
- BR-224: Energia e manutenção permanecem classificadas como fixas nesta primeira versão para garantir regra gerencial simples e consistente.
- BR-225: Materiais e suprimentos produtivos não implicam estoque, ativo ou consumo automatizado por OP.
- BR-226: Impostos, investimentos, reservas, empréstimos, juros, amortizações e movimentações patrimoniais não pertencem ao plano operacional inicial.
- BR-227: `FinancialClassification` é um catálogo financeiro gerencial amplo; `financialNature` informa se a classificação participa da DRE operacional.
- BR-228: `OPERATING_EXPENSE` exige grupo operacional; `DRE_POST_OPERATING` exige grupo pós-operacional; `NON_DRE` exige grupo nulo. A coerência deve ser validada na aplicação e no banco.
- BR-229: Toda nova Conta a Pagar preserva `financialNatureSnapshot`; `dreGroupSnapshot` é obrigatório para naturezas que afetam DRE e nulo para `NON_DRE`.
- BR-230: A DRE considera Contas a Pagar operacionais e pós-operacionais por competência e ignora integralmente `NON_DRE`.
- BR-231: Uma Conta a Pagar `NON_DRE` continua compondo o Fluxo de Caixa previsto, e seu Payment continua compondo o realizado.
- BR-232: Natureza financeira e grupo DRE não podem ser alterados em classificação já usada.
- BR-233: `DRE_POST_OPERATING` exige um dos grupos `FINANCIAL_REVENUE`, `FINANCIAL_EXPENSE` ou `INCOME_TAX_EXPENSE`.
- BR-234: Conta a Pagar manual aceita `FINANCIAL_EXPENSE` e `INCOME_TAX_EXPENSE`, mas rejeita `FINANCIAL_REVENUE`.
- BR-235: Resultado Antes dos Tributos é Lucro Operacional mais Receitas Financeiras menos Despesas Financeiras.
- BR-236: Resultado Líquido Gerencial é Resultado Antes dos Tributos menos Tributos sobre o Resultado; sua margem usa Receita Bruta como denominador e fica indefinida quando ela é zero.
- BR-237: Enquanto não houver fato de origem próprio, Receitas Financeiras são zero; Billing e Receipt não podem ser usados artificialmente.
- BR-238: Contas `NON_DRE` não alteram nenhuma linha da DRE, embora obrigações e pagamentos continuem no Fluxo de Caixa.

- BR-036: O DRE deve preservar a estrutura conceitual atual:
  - Receita Bruta.
  - (-) Custos e Despesas Variáveis.
  - (=) Margem de Contribuição.
  - (-) Custos e Despesas Fixas.
  - (=) Lucro Operacional.
  - Outros itens, como impostos, investimentos e reservas.
  - Resultado Líquido.
- BR-037: O sistema deve permitir consultar DRE mensal.
- BR-038: O sistema deve permitir consultar DRE anual.

## Fluxo de caixa

- BR-039: O fluxo de caixa atual segue a estrutura:
  - Saldo Inicial.
  - (-) Contas a Pagar.
  - (+) Contas a Receber.
  - (=) Saldo Final.
- BR-040: O saldo final de um período alimenta o período seguinte.

## Orçamento

- BR-041: O sistema deve possuir orçamento com comparação Previsto x Real.

## Decisões Pendentes

- DECISÃO PENDENTE: definir campos obrigatórios dos cadastros de empresa, cliente, produto e terceirizado.
- DECISÃO PENDENTE: definir quais campos compõem as informações de produção de uma OP.
- DECISÃO PENDENTE: definir quais são as demais informações comerciais necessárias na OP.
- DECISÃO PENDENTE: definir ciclo de vida e status da OP.
- DECISÃO PENDENTE: definir ciclo de vida e status excepcionais dos Serviços Terceirizados.
- DECISÃO PENDENTE: definir quando um Serviço Terceirizado é considerado elegível para pagamento.
- DECISÃO PENDENTE: definir se o sistema deverá preencher inicialmente a quantidade aprovada para pagamento com o mesmo valor da quantidade retornada para o usuário apenas confirmar ou ajustar.
- DECISÃO PENDENTE: definir o tratamento de impostos distintos dos tributos sobre o resultado, investimentos e reservas.
- DECISÃO PENDENTE: definir regras para edição, cancelamento ou estorno de OPs, Serviços Terceirizados, romaneios, retornos, fechamentos, contas e faturamentos.
- DECISÃO PENDENTE: definir formato e informações do recibo de fechamento.
- DECISÃO PENDENTE: definir necessidade de importação de dados históricos das planilhas atuais.

## Workspace operacional da OP pós-MVP

- BR-265: A OP é apresentada como workspace central em lista, criação e detalhe com abas, sem substituir os fatos oficiais de terceirização e financeiro.
- BR-266: A criação copia `Product.currentUnitPrice` para `ProductionOrder.unitPrice`; alterações futuras do Produto não recalculam a OP.
- BR-267: O Cliente padrão do Produto é sugerido, mas o Cliente efetivo permanece salvo na OP e pode ser alterado durante a criação sem CHECK Produto ↔ Cliente.
- BR-268: Insumos do Produto são copiados para `ProductionOrderSupply`; nome, unidade, regra-base e quantidade planejada ficam preservados e podem ser ajustados somente na OP.
- BR-269: Serviço interno é uma atribuição operacional a um Setor habilitado e não possui preço ou custo contábil nesta etapa.
- BR-270: Nova atribuição externa exige capacidade ativa `Contractor + Service`, usa seu preço atual e preserva `OutsourcedService.appliedUnitPrice`.
- BR-271: Envio iniciado na OP cria `DeliveryNote` e `DeliveryNoteItem`; retorno cria `OutsourcingReturn`. Quantidades continuam derivadas.
- BR-272: Receber e aprovar pode ocorrer na mesma interação, mas retorno e aprovação permanecem fatos conceitualmente distintos na mesma transação.
- BR-273: Atraso é derivado quando o prazo externo passou e existe saldo pendente; `isLate` não é persistido.
- BR-274: Montagem fica indisponível sem retorno integral, aguardando complemento quando parte das atribuições externas está completa e completa quando todas estão retornadas.
- BR-275: Concluir produção preenche `completedAt` e não cria Billing ou AccountReceivable. Reabertura não é permitida nesta etapa.
- BR-276: A timeline é derivada dos fatos existentes e de autoria mínima; não existe tabela paralela de eventos.

## Home operacional e Kanban de OPs

- BR-277: A Home interna é um painel operacional derivado das OPs, serviços internos, `OutsourcedService`, Romaneios, Retornos e Pendências; ela não cria fonte de movimentação própria.
- BR-278: Uma mesma OP pode aparecer simultaneamente em várias colunas porque cada card representa `OP + Serviço + Executor`, não uma localização única da OP.
- BR-279: O Kanban não altera responsável, não registra envio, retorno, aprovação, conclusão, faturamento ou recebimento; essas ações continuam na OP ou nos módulos oficiais.
- BR-280: Serviços concluídos ficam ocultos por padrão no Kanban e podem ser exibidos por filtro, com aparência discreta.
- BR-281: A coluna Montagem é derivada da regra já aprovada: sem serviço externo completo não aparece; com parte completa e parte pendente fica `Aguardando complemento`; com todos completos fica `Completa para montagem`.
- BR-282: O bloco `Precisam de atenção` prioriza pendências abertas/em tratamento, serviços atrasados, aguardando complemento, urgência e previsão geral vencida, evitando duplicar a mesma OP sem necessidade.
- BR-283: Quando um serviço está atrasado e possui pendência operacional aberta/em tratamento relacionada, o painel destaca `Bloqueado por pendência` em vez de tratar somente como atraso do terceirizado.
- BR-284: O atraso continua derivado de `expectedReturnDate`, saldo pendente e data operacional em `America/Fortaleza`; `isLate` não é persistido.
