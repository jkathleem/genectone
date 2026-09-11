CREATE TABLE "PaymentReversal" ("id" TEXT NOT NULL,"paymentId" TEXT NOT NULL,"reversalDate" DATE NOT NULL,"reason" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "PaymentReversal_pkey" PRIMARY KEY ("id"),CONSTRAINT "PaymentReversal_reason_check" CHECK (length(btrim("reason")) > 0));
CREATE TABLE "ReceiptReversal" ("id" TEXT NOT NULL,"receiptId" TEXT NOT NULL,"reversalDate" DATE NOT NULL,"reason" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "ReceiptReversal_pkey" PRIMARY KEY ("id"),CONSTRAINT "ReceiptReversal_reason_check" CHECK (length(btrim("reason")) > 0));
CREATE UNIQUE INDEX "PaymentReversal_paymentId_key" ON "PaymentReversal"("paymentId");
CREATE INDEX "PaymentReversal_reversalDate_idx" ON "PaymentReversal"("reversalDate");
CREATE UNIQUE INDEX "ReceiptReversal_receiptId_key" ON "ReceiptReversal"("receiptId");
CREATE INDEX "ReceiptReversal_reversalDate_idx" ON "ReceiptReversal"("reversalDate");
ALTER TABLE "PaymentReversal" ADD CONSTRAINT "PaymentReversal_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptReversal" ADD CONSTRAINT "ReceiptReversal_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
