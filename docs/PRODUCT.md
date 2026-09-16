# Genect Confecções - Produto

## Visão do sistema

O sistema de gestão da Genect Confecções será uma plataforma integrada para controlar a operação de confecção de roupas, partindo da entrada da Ordem de Produção (OP) como entidade operacional central.

Os dados mestres internos são organizados em um único ambiente de Cadastros com abas, busca e filtros consistentes, reduzindo itens de menu sem criar cópias das entidades existentes.

A OP nasce primeiro no sistema. Depois da OP cadastrada, o usuário adiciona manualmente os Serviços Terceirizados necessários para aquela OP, escolhe o Serviço, o Terceirizado e a quantidade. O sistema aplica o preço atual da combinação exata `Terceirizado + Serviço` e preserva esse valor historicamente.

O MVP não terá roteiro produtivo, motor de workflow, dependências configuráveis entre etapas, execução interna detalhada nem geração automática de serviços baseada no produto. O princípio é construir primeiro o fluxo que a Genect realmente utiliza hoje.

O sistema também deve dar visibilidade econômica da OP desde sua entrada, registrando quantidade, preço unitário e valor previsto quando essas informações estiverem disponíveis. Essa visibilidade não significa que a OP cadastrada seja automaticamente receita realizada no DRE.

## Problemas que resolve

- Substituir planilhas isoladas usadas para OPs, produção terceirizada, romaneios, faturamento, pagamentos, fluxo de caixa e DRE.
- Evitar que a mesma informação seja digitada várias vezes em módulos diferentes.
- Reduzir divergências entre produção terceirizada, financeiro e DRE.
- Permitir que a OP seja cadastrada uma única vez antes de qualquer Serviço Terceirizado.
- Dar visibilidade econômica da OP desde sua entrada.
- Rastrear Serviços Terceirizados por OP, serviço, terceirizado, quantidades, status, romaneios, saídas e retornos.
- Permitir múltiplas saídas para o mesmo Serviço Terceirizado.
- Permitir múltiplos retornos para o mesmo Serviço Terceirizado.
- Identificar rapidamente o que ainda está fora da Genect e com quem está.
- Criar base para painel de cobrança de terceirizados.
- Gerar fechamento mensal de terceirizados a partir de quantidades aprovadas para pagamento.
- Evitar pagamento duplicado da mesma quantidade já incluída em fechamento anterior.
- Separar corretamente OP recebida, valor previsto, faturamento, conta a receber, recebimento financeiro e receita reconhecida no DRE.
- Separar corretamente visão de caixa e visão de competência.
- Permitir gestão de múltiplas empresas da Genect sem mistura de dados.

## Usuários

- Equipe administrativa da Genect Confecções.
- Responsáveis pela entrada de OPs.
- Responsáveis por Serviços Terceirizados.
- Responsáveis por romaneios, saídas e retornos.
- Responsáveis pelo fechamento de terceirizados.
- Responsáveis pelo faturamento.
- Responsáveis por contas a pagar e contas a receber.
- Gestores que acompanham fluxo de caixa, DRE, orçamento e relatórios.

Decisão confirmada no MVP: os perfis são Administrador, Operação, Financeiro e Consulta, com permissões aplicadas na navegação e obrigatoriamente validadas no servidor.

## Módulos

1. Empresas
2. Clientes
3. Produtos
4. Ordens de Produção (OP)
5. Terceirizados
6. Serviços
7. Preços por Terceirizado e Serviço
8. Serviços Terceirizados
9. Romaneios
10. Retornos
11. Painel de cobrança de terceirizados
12. Fechamento mensal de terceirizados
13. Contas a pagar
14. Faturamento
15. Contas a receber
16. Fluxo de caixa
17. DRE
18. Orçamento / Previsto x Real
19. Relatórios e dashboards

## Fluxo operacional do MVP

1. Entrada da OP.
2. Registro das informações comerciais e econômicas da OP.
3. Cadastro manual dos Serviços Terceirizados necessários para a OP.
4. Escolha do Serviço cadastrado.
5. Escolha do Terceirizado.
6. Registro da quantidade prevista, quando aplicável.
7. Registro das movimentações de saída em romaneios.
8. Registro dos retornos parciais ou totais.
9. Acompanhamento do saldo pendente.
10. Painel de cobrança de serviços ainda fora da Genect.
11. Conferência da quantidade aprovada para pagamento.
12. Fechamento mensal de terceirizados.
13. Geração de conta a pagar e registro de pagamentos a partir do fechamento aprovado.
14. Faturamento, recebimento e alimentação das visões financeiras.

## Escopo inicial

O escopo inicial deve priorizar o fluxo simples de terceirização:

- Cadastro de empresas.
- Cadastro de clientes.
- Cadastro de produtos.
- Entrada de OPs.
- Registro de número da OP, data de entrada, empresa, cliente, produto, quantidade, preço unitário, valor total calculado e demais informações comerciais necessárias.
- Cadastro de terceirizados.
- Cadastro reutilizável de Serviços, incluindo Frente, Costas, Preparação Frente, Pala e Gancho, Frente Completa, Final Frente e Preparação e Bolso Traseiro.
- Cadastro configurável do preço atual por combinação de Terceirizado e Serviço.
- Cadastro manual de Serviços Terceirizados vinculados a uma OP existente.
- Geração de romaneios para um único terceirizado por romaneio.
- Inclusão de vários itens em um romaneio, inclusive de OPs, clientes, referências e serviços diferentes, desde que todos saiam para o mesmo terceirizado.
- Controle de múltiplas saídas para um mesmo Serviço Terceirizado.
- Controle de múltiplos retornos para um mesmo Serviço Terceirizado.
- Controle de quantidade prevista, enviada, retornada, aprovada para pagamento e pendente.
- Consulta de serviços com quantidade pendente maior que zero.
- Painel de cobrança de terceirizados.

O fluxo descrito acima está implementado no MVP; os itens da seção seguinte permanecem fora de escopo ou reservados para evoluções posteriores.

## Fora do MVP

- Roteiro produtivo por produto.
- Geração automática de etapas por produto.
- Dependências configuráveis entre etapas.
- Motor de sequência de produção.
- Workflow produtivo complexo.
- Execução interna detalhada.

## Funcionalidades futuras

- Relatórios e dashboards operacionais, financeiros e gerenciais.
- Reabertura/versionamento de orçamentos fechados e estornos parciais.
- Importação ou conciliação com dados históricos das planilhas atuais.

## Critérios de sucesso

- A OP deve ser cadastrada antes de Serviços Terceirizados e romaneios.
- O usuário deve conseguir adicionar manualmente os Serviços Terceirizados necessários para cada OP.
- Frente e Costas devem ser tratados como Serviços Terceirizados normais, não como entidade especial.
- Serviços e romaneios devem reutilizar dados já cadastrados.
- Um romaneio deve pertencer a exatamente um terceirizado.
- Um romaneio pode conter itens de OPs, clientes, referências e serviços diferentes se todos forem para o mesmo terceirizado.
- A equipe deve conseguir identificar rapidamente o que ainda está fora da Genect e com quem está.
- O painel operacional deve mostrar apenas serviços com quantidade pendente maior que zero.
- O fechamento mensal deve usar quantidade aprovada para pagamento multiplicada pelo preço unitário aplicado.
- O fechamento não deve pagar novamente uma quantidade já incluída em fechamento anterior.
- O valor econômico da OP deve estar visível desde a entrada, sem ser confundido automaticamente com receita realizada.

## Cadastro de OPs como centro operacional

A experiência pós-MVP concentra o acompanhamento da entrada ao recebimento em uma tela com abas. O operador adiciona executores habilitados, emite a saída oficial, registra retornos e aprovação, trata pendências, consulta insumos congelados para a ordem e conclui a produção. O Financeiro usa os fluxos existentes de faturamento e recebimento.

A simplificação é de navegação: Romaneios, Retornos, Billing, Contas a Receber e Receipts continuam fatos independentes e auditáveis. O Kanban reutilizará os mesmos helpers em uma etapa futura.
