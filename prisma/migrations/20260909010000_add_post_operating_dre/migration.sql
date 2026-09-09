-- Amplia a classificacao da DRE sem alterar fatos ou snapshots existentes.
ALTER TYPE "DreGroup" ADD VALUE 'FINANCIAL_REVENUE';
ALTER TYPE "DreGroup" ADD VALUE 'FINANCIAL_EXPENSE';
ALTER TYPE "DreGroup" ADD VALUE 'INCOME_TAX_EXPENSE';
ALTER TYPE "FinancialNature" ADD VALUE 'DRE_POST_OPERATING';

ALTER TABLE "FinancialClassification"
  DROP CONSTRAINT "FinancialClassification_nature_dre_group_check",
  ADD CONSTRAINT "FinancialClassification_nature_dre_group_check" CHECK (
    ("financialNature" = 'OPERATING_EXPENSE' AND "dreGroup" IN ('VARIABLE_COST_EXPENSE', 'FIXED_COST_EXPENSE'))
    OR ("financialNature" = 'DRE_POST_OPERATING' AND "dreGroup" IN ('FINANCIAL_REVENUE', 'FINANCIAL_EXPENSE', 'INCOME_TAX_EXPENSE'))
    OR ("financialNature" = 'NON_DRE' AND "dreGroup" IS NULL)
  );

ALTER TABLE "AccountPayable"
  DROP CONSTRAINT "AccountPayable_nature_dre_group_snapshot_check",
  ADD CONSTRAINT "AccountPayable_nature_dre_group_snapshot_check" CHECK (
    ("financialNatureSnapshot" = 'OPERATING_EXPENSE' AND "dreGroupSnapshot" IN ('VARIABLE_COST_EXPENSE', 'FIXED_COST_EXPENSE'))
    OR ("financialNatureSnapshot" = 'DRE_POST_OPERATING' AND "dreGroupSnapshot" IN ('FINANCIAL_EXPENSE', 'INCOME_TAX_EXPENSE'))
    OR ("financialNatureSnapshot" = 'NON_DRE' AND "dreGroupSnapshot" IS NULL)
  ),
  ADD CONSTRAINT "AccountPayable_no_financial_revenue_check" CHECK (
    "dreGroupSnapshot" IS DISTINCT FROM 'FINANCIAL_REVENUE'
  );
