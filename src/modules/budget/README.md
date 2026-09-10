# Orçamento / Previsto x Realizado

Planejamento mensal da DRE por Company. `BudgetEntry` guarda valores previstos e snapshots de classificações; nenhum registro gera fatos financeiros ou altera DRE/Fluxo de Caixa.

O realizado é derivado das mesmas fontes da DRE: Billing para Receita Bruta e AccountPayable por competência e snapshots para despesas. Receitas Financeiras realizadas permanecem zero nesta versão. A variação é `Realizado - Previsto`; quando o previsto é zero, o percentual é indefinido.
