-- Orçamentos mensais da DRE: planejamento sem geração de fatos financeiros.
CREATE TYPE "BudgetEntryType" AS ENUM ('GROSS_REVENUE', 'FINANCIAL_CLASSIFICATION');

CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "competenceDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Budget_competence_first_day_check" CHECK (EXTRACT(DAY FROM "competenceDate") = 1)
);

CREATE TABLE "BudgetEntry" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "entryType" "BudgetEntryType" NOT NULL,
    "classificationId" TEXT,
    "classificationCodeSnapshot" TEXT,
    "classificationNameSnapshot" TEXT,
    "financialNatureSnapshot" "FinancialNature",
    "dreGroupSnapshot" "DreGroup",
    "amount" DECIMAL(14,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BudgetEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BudgetEntry_amount_nonnegative_check" CHECK ("amount" >= 0),
    CONSTRAINT "BudgetEntry_coherence_check" CHECK (
      ("entryType" = 'GROSS_REVENUE' AND "classificationId" IS NULL AND "classificationCodeSnapshot" IS NULL AND "classificationNameSnapshot" IS NULL AND "financialNatureSnapshot" IS NULL AND "dreGroupSnapshot" IS NULL)
      OR
      ("entryType" = 'FINANCIAL_CLASSIFICATION' AND "classificationId" IS NOT NULL AND "classificationCodeSnapshot" IS NOT NULL AND "classificationNameSnapshot" IS NOT NULL AND "financialNatureSnapshot" IN ('OPERATING_EXPENSE', 'DRE_POST_OPERATING') AND (
        ("financialNatureSnapshot" = 'OPERATING_EXPENSE' AND "dreGroupSnapshot" IN ('VARIABLE_COST_EXPENSE', 'FIXED_COST_EXPENSE')) OR
        ("financialNatureSnapshot" = 'DRE_POST_OPERATING' AND "dreGroupSnapshot" IN ('FINANCIAL_REVENUE', 'FINANCIAL_EXPENSE', 'INCOME_TAX_EXPENSE'))
      ))
    )
);

CREATE UNIQUE INDEX "Budget_companyId_competenceDate_key" ON "Budget"("companyId", "competenceDate");
CREATE INDEX "Budget_competenceDate_idx" ON "Budget"("competenceDate");
CREATE UNIQUE INDEX "BudgetEntry_budgetId_classificationId_key" ON "BudgetEntry"("budgetId", "classificationId");
CREATE UNIQUE INDEX "BudgetEntry_one_gross_revenue_per_budget" ON "BudgetEntry"("budgetId") WHERE "entryType" = 'GROSS_REVENUE';
CREATE INDEX "BudgetEntry_budgetId_entryType_idx" ON "BudgetEntry"("budgetId", "entryType");
CREATE INDEX "BudgetEntry_classificationId_idx" ON "BudgetEntry"("classificationId");
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BudgetEntry" ADD CONSTRAINT "BudgetEntry_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BudgetEntry" ADD CONSTRAINT "BudgetEntry_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "FinancialClassification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
