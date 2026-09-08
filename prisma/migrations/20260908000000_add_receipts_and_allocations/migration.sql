-- Receipt is one real cash entry; allocations only distribute it across receivables.
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "receiptDate" DATE NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Receipt_amount_positive" CHECK ("amount" > 0)
);
CREATE TABLE "ReceiptAllocation" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "accountReceivableId" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReceiptAllocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReceiptAllocation_amount_positive" CHECK ("amount" > 0)
);
CREATE INDEX "Receipt_companyId_receiptDate_idx" ON "Receipt"("companyId", "receiptDate");
CREATE INDEX "Receipt_customerId_receiptDate_idx" ON "Receipt"("customerId", "receiptDate");
CREATE INDEX "Receipt_receiptDate_idx" ON "Receipt"("receiptDate");
CREATE UNIQUE INDEX "ReceiptAllocation_receiptId_accountReceivableId_key" ON "ReceiptAllocation"("receiptId", "accountReceivableId");
CREATE INDEX "ReceiptAllocation_accountReceivableId_idx" ON "ReceiptAllocation"("accountReceivableId");
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptAllocation" ADD CONSTRAINT "ReceiptAllocation_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptAllocation" ADD CONSTRAINT "ReceiptAllocation_accountReceivableId_fkey" FOREIGN KEY ("accountReceivableId") REFERENCES "AccountReceivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
