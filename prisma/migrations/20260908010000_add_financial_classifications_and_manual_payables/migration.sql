-- Classificações gerenciais inicialmente confirmadas para a futura DRE.
CREATE TYPE "DreGroup" AS ENUM ('VARIABLE_COST_EXPENSE', 'FIXED_COST_EXPENSE');
CREATE TYPE "AccountPayableSource" AS ENUM ('CONTRACTOR_SETTLEMENT', 'MANUAL');

CREATE TABLE "FinancialClassification" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dreGroup" "DreGroup" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialClassification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialClassification_code_key" ON "FinancialClassification"("code");
CREATE INDEX "FinancialClassification_dreGroup_active_idx" ON "FinancialClassification"("dreGroup", "active");
CREATE INDEX "FinancialClassification_name_idx" ON "FinancialClassification"("name");

-- A classificação oficial é criada antes do backfill das obrigações históricas.
INSERT INTO "FinancialClassification" (
  "id", "code", "name", "dreGroup", "active", "notes", "createdAt", "updatedAt"
) VALUES (
  'seed-financial-classification-outsourced-production',
  'OUTSOURCED_PRODUCTION',
  'Serviços terceirizados de produção',
  'VARIABLE_COST_EXPENSE',
  true,
  'Classificação padrão das Contas a Pagar originadas de Fechamentos de Terceirizados.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

ALTER TABLE "AccountPayable"
  ADD COLUMN "source" "AccountPayableSource",
  ADD COLUMN "classificationId" TEXT,
  ADD COLUMN "classificationCodeSnapshot" TEXT,
  ADD COLUMN "classificationNameSnapshot" TEXT,
  ADD COLUMN "dreGroupSnapshot" "DreGroup",
  ADD COLUMN "payeeName" TEXT;

UPDATE "AccountPayable" AS ap
SET
  "source" = 'CONTRACTOR_SETTLEMENT',
  "classificationId" = 'seed-financial-classification-outsourced-production',
  "classificationCodeSnapshot" = 'OUTSOURCED_PRODUCTION',
  "classificationNameSnapshot" = 'Serviços terceirizados de produção',
  "dreGroupSnapshot" = 'VARIABLE_COST_EXPENSE',
  "payeeName" = contractor."name"
FROM "ContractorSettlement" AS settlement
JOIN "Contractor" AS contractor ON contractor."id" = settlement."contractorId"
WHERE ap."contractorSettlementId" = settlement."id";

ALTER TABLE "AccountPayable"
  ALTER COLUMN "contractorSettlementId" DROP NOT NULL,
  ALTER COLUMN "source" SET NOT NULL,
  ALTER COLUMN "classificationId" SET NOT NULL,
  ALTER COLUMN "classificationCodeSnapshot" SET NOT NULL,
  ALTER COLUMN "classificationNameSnapshot" SET NOT NULL,
  ALTER COLUMN "dreGroupSnapshot" SET NOT NULL,
  ALTER COLUMN "payeeName" SET NOT NULL;

ALTER TABLE "AccountPayable"
  ADD CONSTRAINT "AccountPayable_source_origin_check" CHECK (
    ("source" = 'CONTRACTOR_SETTLEMENT' AND "contractorSettlementId" IS NOT NULL)
    OR ("source" = 'MANUAL' AND "contractorSettlementId" IS NULL)
  ),
  ADD CONSTRAINT "AccountPayable_payeeName_not_blank_check" CHECK (length(btrim("payeeName")) > 0),
  ADD CONSTRAINT "AccountPayable_originalAmount_positive_check" CHECK ("originalAmount" > 0),
  ADD CONSTRAINT "AccountPayable_classificationCodeSnapshot_not_blank_check" CHECK (length(btrim("classificationCodeSnapshot")) > 0),
  ADD CONSTRAINT "AccountPayable_classificationNameSnapshot_not_blank_check" CHECK (length(btrim("classificationNameSnapshot")) > 0),
  ADD CONSTRAINT "AccountPayable_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "FinancialClassification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "AccountPayable_companyId_competenceDate_dreGroupSnapshot_idx" ON "AccountPayable"("companyId", "competenceDate", "dreGroupSnapshot");
CREATE INDEX "AccountPayable_classificationId_idx" ON "AccountPayable"("classificationId");
CREATE INDEX "AccountPayable_source_idx" ON "AccountPayable"("source");
