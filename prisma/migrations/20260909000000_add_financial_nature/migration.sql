-- FinancialClassification passa a classificar fatos financeiros amplos.
-- O backfill preserva todas as classificacoes e Contas a Pagar operacionais existentes.
CREATE TYPE "FinancialNature" AS ENUM ('OPERATING_EXPENSE', 'NON_DRE');

ALTER TABLE "FinancialClassification"
  ADD COLUMN "financialNature" "FinancialNature";

UPDATE "FinancialClassification"
SET "financialNature" = 'OPERATING_EXPENSE';

ALTER TABLE "FinancialClassification"
  ALTER COLUMN "financialNature" SET NOT NULL,
  ALTER COLUMN "dreGroup" DROP NOT NULL,
  ADD CONSTRAINT "FinancialClassification_nature_dre_group_check" CHECK (
    ("financialNature" = 'OPERATING_EXPENSE' AND "dreGroup" IS NOT NULL)
    OR ("financialNature" = 'NON_DRE' AND "dreGroup" IS NULL)
  );

DROP INDEX "FinancialClassification_dreGroup_active_idx";
CREATE INDEX "FinancialClassification_financialNature_dreGroup_active_idx"
  ON "FinancialClassification"("financialNature", "dreGroup", "active");

ALTER TABLE "AccountPayable"
  ADD COLUMN "financialNatureSnapshot" "FinancialNature";

UPDATE "AccountPayable"
SET "financialNatureSnapshot" = 'OPERATING_EXPENSE';

ALTER TABLE "AccountPayable"
  ALTER COLUMN "financialNatureSnapshot" SET NOT NULL,
  ALTER COLUMN "dreGroupSnapshot" DROP NOT NULL,
  ADD CONSTRAINT "AccountPayable_nature_dre_group_snapshot_check" CHECK (
    ("financialNatureSnapshot" = 'OPERATING_EXPENSE' AND "dreGroupSnapshot" IS NOT NULL)
    OR ("financialNatureSnapshot" = 'NON_DRE' AND "dreGroupSnapshot" IS NULL)
  );

DROP INDEX "AccountPayable_companyId_competenceDate_dreGroupSnapshot_idx";
CREATE INDEX "AccountPayable_companyId_competenceDate_financialNatureSnapshot_dreGroupSnapshot_idx"
  ON "AccountPayable"("companyId", "competenceDate", "financialNatureSnapshot", "dreGroupSnapshot");
