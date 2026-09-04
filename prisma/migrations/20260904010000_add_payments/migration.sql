-- Payments are immutable financial events. Totals and status remain derived.
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "accountPayableId" TEXT NOT NULL,
    "paymentDate" DATE NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Payment_amount_positive" CHECK ("amount" > 0)
);
CREATE INDEX "Payment_accountPayableId_paymentDate_idx" ON "Payment"("accountPayableId", "paymentDate");
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_accountPayableId_fkey" FOREIGN KEY ("accountPayableId") REFERENCES "AccountPayable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
