-- Extend the OP workspace without replacing the audited operational facts.
ALTER TABLE "ProductionOrder"
  ADD COLUMN "createdByUserId" TEXT,
  ADD COLUMN "completedByUserId" TEXT;

ALTER TABLE "OutsourcedService"
  ADD COLUMN "expectedReturnDate" DATE,
  ADD COLUMN "createdByUserId" TEXT;

CREATE TABLE "ProductionOrderSupply" (
  "id" TEXT NOT NULL,
  "productionOrderId" TEXT NOT NULL,
  "supplyId" TEXT NOT NULL,
  "supplyNameSnapshot" TEXT NOT NULL,
  "unitSnapshot" TEXT NOT NULL,
  "quantityPerBaseSnapshot" DECIMAL(14,4),
  "baseQuantitySnapshot" INTEGER,
  "plannedQuantity" DECIMAL(14,4),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionOrderSupply_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductionOrderSupply_snapshot_base_check" CHECK (
    ("quantityPerBaseSnapshot" IS NULL AND "baseQuantitySnapshot" IS NULL AND "plannedQuantity" IS NULL)
    OR ("quantityPerBaseSnapshot" IS NOT NULL AND "quantityPerBaseSnapshot" > 0 AND "baseQuantitySnapshot" IS NOT NULL AND "baseQuantitySnapshot" > 0 AND "plannedQuantity" IS NOT NULL AND "plannedQuantity" > 0)
  )
);

CREATE TABLE "InternalProductionService" (
  "id" TEXT NOT NULL,
  "productionOrderId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "internalSectorId" TEXT NOT NULL,
  "plannedQuantity" INTEGER,
  "notes" TEXT,
  "createdByUserId" TEXT,
  "completedAt" TIMESTAMP(3),
  "completedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InternalProductionService_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InternalProductionService_plannedQuantity_check" CHECK ("plannedQuantity" IS NULL OR "plannedQuantity" > 0)
);

CREATE UNIQUE INDEX "ProductionOrderSupply_productionOrderId_supplyId_key" ON "ProductionOrderSupply"("productionOrderId", "supplyId");
CREATE INDEX "ProductionOrderSupply_supplyId_idx" ON "ProductionOrderSupply"("supplyId");
CREATE INDEX "InternalProductionService_productionOrderId_idx" ON "InternalProductionService"("productionOrderId");
CREATE INDEX "InternalProductionService_serviceId_idx" ON "InternalProductionService"("serviceId");
CREATE INDEX "InternalProductionService_internalSectorId_idx" ON "InternalProductionService"("internalSectorId");
CREATE INDEX "InternalProductionService_createdByUserId_idx" ON "InternalProductionService"("createdByUserId");
CREATE INDEX "InternalProductionService_completedByUserId_idx" ON "InternalProductionService"("completedByUserId");
CREATE INDEX "OutsourcedService_expectedReturnDate_idx" ON "OutsourcedService"("expectedReturnDate");
CREATE INDEX "OutsourcedService_createdByUserId_idx" ON "OutsourcedService"("createdByUserId");
CREATE INDEX "ProductionOrder_createdByUserId_idx" ON "ProductionOrder"("createdByUserId");
CREATE INDEX "ProductionOrder_completedByUserId_idx" ON "ProductionOrder"("completedByUserId");

ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutsourcedService" ADD CONSTRAINT "OutsourcedService_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOrderSupply" ADD CONSTRAINT "ProductionOrderSupply_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOrderSupply" ADD CONSTRAINT "ProductionOrderSupply_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalProductionService" ADD CONSTRAINT "InternalProductionService_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalProductionService" ADD CONSTRAINT "InternalProductionService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalProductionService" ADD CONSTRAINT "InternalProductionService_internalSectorId_fkey" FOREIGN KEY ("internalSectorId") REFERENCES "InternalSector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalProductionService" ADD CONSTRAINT "InternalProductionService_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalProductionService" ADD CONSTRAINT "InternalProductionService_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
