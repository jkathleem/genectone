-- PostgreSQL CHECK constraints accept UNKNOWN. Explicit null checks ensure that
-- DRE natures which require a group cannot be persisted with a null group.
ALTER TABLE "FinancialClassification"
  DROP CONSTRAINT "FinancialClassification_nature_dre_group_check",
  ADD CONSTRAINT "FinancialClassification_nature_dre_group_check" CHECK (
    ("financialNature" = 'OPERATING_EXPENSE' AND "dreGroup" IS NOT NULL AND "dreGroup" IN ('VARIABLE_COST_EXPENSE', 'FIXED_COST_EXPENSE'))
    OR ("financialNature" = 'DRE_POST_OPERATING' AND "dreGroup" IS NOT NULL AND "dreGroup" IN ('FINANCIAL_REVENUE', 'FINANCIAL_EXPENSE', 'INCOME_TAX_EXPENSE'))
    OR ("financialNature" = 'NON_DRE' AND "dreGroup" IS NULL)
  );

ALTER TABLE "AccountPayable"
  DROP CONSTRAINT "AccountPayable_nature_dre_group_snapshot_check",
  ADD CONSTRAINT "AccountPayable_nature_dre_group_snapshot_check" CHECK (
    ("financialNatureSnapshot" = 'OPERATING_EXPENSE' AND "dreGroupSnapshot" IS NOT NULL AND "dreGroupSnapshot" IN ('VARIABLE_COST_EXPENSE', 'FIXED_COST_EXPENSE'))
    OR ("financialNatureSnapshot" = 'DRE_POST_OPERATING' AND "dreGroupSnapshot" IS NOT NULL AND "dreGroupSnapshot" IN ('FINANCIAL_REVENUE', 'FINANCIAL_EXPENSE', 'INCOME_TAX_EXPENSE'))
    OR ("financialNatureSnapshot" = 'NON_DRE' AND "dreGroupSnapshot" IS NULL)
  );
