-- Records external billing and creates its financial receivable without fiscal issuance.
CREATE TABLE "Billing" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "competenceDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Billing_amount_positive" CHECK ("amount" > 0)
);
CREATE TABLE "AccountReceivable" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "billingId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "competenceDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "originalAmount" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountReceivable_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AccountReceivable_originalAmount_positive" CHECK ("originalAmount" > 0)
);
CREATE UNIQUE INDEX "Billing_productionOrderId_key" ON "Billing"("productionOrderId");
CREATE UNIQUE INDEX "Billing_companyId_invoiceNumber_key" ON "Billing"("companyId", "invoiceNumber");
CREATE INDEX "Billing_issueDate_idx" ON "Billing"("issueDate");
CREATE INDEX "Billing_competenceDate_idx" ON "Billing"("competenceDate");
CREATE UNIQUE INDEX "AccountReceivable_billingId_key" ON "AccountReceivable"("billingId");
CREATE INDEX "AccountReceivable_companyId_dueDate_idx" ON "AccountReceivable"("companyId", "dueDate");
CREATE INDEX "AccountReceivable_customerId_dueDate_idx" ON "AccountReceivable"("customerId", "dueDate");
CREATE INDEX "AccountReceivable_competenceDate_idx" ON "AccountReceivable"("competenceDate");
CREATE INDEX "AccountReceivable_dueDate_idx" ON "AccountReceivable"("dueDate");
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountReceivable" ADD CONSTRAINT "AccountReceivable_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountReceivable" ADD CONSTRAINT "AccountReceivable_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountReceivable" ADD CONSTRAINT "AccountReceivable_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
