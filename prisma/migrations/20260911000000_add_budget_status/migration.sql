-- Ciclo de governança do orçamento. Budgets existentes permanecem como rascunho.
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'APPROVED', 'CLOSED');

ALTER TABLE "Budget"
  ADD COLUMN "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD CONSTRAINT "Budget_status_timestamps_check" CHECK (
    ("status" = 'DRAFT' AND "approvedAt" IS NULL AND "closedAt" IS NULL) OR
    ("status" = 'APPROVED' AND "approvedAt" IS NOT NULL AND "closedAt" IS NULL) OR
    ("status" = 'CLOSED' AND "approvedAt" IS NOT NULL AND "closedAt" IS NOT NULL)
  );

CREATE INDEX "Budget_status_idx" ON "Budget"("status");
