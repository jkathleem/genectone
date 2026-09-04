ALTER TABLE "ContractorSettlement" ADD COLUMN "companyId" TEXT NOT NULL;

CREATE TABLE "AccountPayable" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "contractorSettlementId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "competenceDate" DATE NOT NULL,
  "dueDate" DATE NOT NULL,
  "originalAmount" DECIMAL(14,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountPayable_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContractorSettlement_companyId_periodYear_periodMonth_idx" ON "ContractorSettlement"("companyId", "periodYear", "periodMonth");
CREATE UNIQUE INDEX "AccountPayable_contractorSettlementId_key" ON "AccountPayable"("contractorSettlementId");
CREATE INDEX "AccountPayable_companyId_dueDate_idx" ON "AccountPayable"("companyId", "dueDate");
CREATE INDEX "AccountPayable_dueDate_idx" ON "AccountPayable"("dueDate");
CREATE INDEX "AccountPayable_competenceDate_idx" ON "AccountPayable"("competenceDate");
ALTER TABLE "ContractorSettlement" ADD CONSTRAINT "ContractorSettlement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountPayable" ADD CONSTRAINT "AccountPayable_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountPayable" ADD CONSTRAINT "AccountPayable_contractorSettlementId_fkey" FOREIGN KEY ("contractorSettlementId") REFERENCES "ContractorSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
