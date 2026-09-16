import type { DreGroup, FinancialNature } from "@/generated/prisma";

export const dreGroupLabels: Record<DreGroup, string> = {
  VARIABLE_COST_EXPENSE: "Custos e Despesas Variáveis",
  FIXED_COST_EXPENSE: "Custos e Despesas Fixas",
  FINANCIAL_REVENUE: "Receitas Financeiras",
  FINANCIAL_EXPENSE: "Despesas Financeiras",
  INCOME_TAX_EXPENSE: "Tributos sobre o Resultado",
};

export const financialNatureLabels: Record<FinancialNature, string> = {
  OPERATING_EXPENSE: "DRE operacional",
  DRE_POST_OPERATING: "Pós-Lucro Operacional",
  NON_DRE: "Fora da DRE",
};

