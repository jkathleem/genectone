# Orçamento / Previsto x Realizado

Planejamento mensal da DRE por Company. `BudgetEntry` guarda valores previstos e snapshots de classificações; nenhum registro gera fatos financeiros ou altera DRE/Fluxo de Caixa.

O realizado é derivado das mesmas fontes da DRE: Billing para Receita Bruta e AccountPayable por competência e snapshots para despesas. Receitas Financeiras realizadas permanecem zero nesta versão. A variação é `Realizado - Previsto`; quando o previsto é zero, o percentual é indefinido.

A visão anual agrega as 12 competências com consultas por intervalo e calcula margens sobre os totais. A cópia de orçamento é atômica, limitada à mesma Company, rejeita destino existente e usa o estado atual das classificações para os novos snapshots; nenhum fato realizado é copiado.
