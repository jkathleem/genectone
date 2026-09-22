-- Base de domínio de Estoque / Insumos / Compras.
-- Esta migration cria somente estrutura; não insere dados e não altera unidades existentes.

CREATE TYPE "StockMovementType" AS ENUM (
  'PURCHASE',
  'OP_CONSUMPTION',
  'POSITIVE_ADJUSTMENT',
  'NEGATIVE_ADJUSTMENT',
  'RETURN',
  'REVERSAL'
);

CREATE TYPE "StockMovementDirection" AS ENUM ('IN', 'OUT');

ALTER TYPE "AccountPayableSource" ADD VALUE 'SUPPLY_PURCHASE';

ALTER TABLE "Supply"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "minimumStock" DECIMAL(14,4),
  ADD COLUMN "notes" TEXT;

CREATE UNIQUE INDEX "Supply_code_key" ON "Supply"("code");

ALTER TABLE "Supply"
  ADD CONSTRAINT "Supply_code_check" CHECK ("code" IS NULL OR length(btrim("code")) > 0),
  ADD CONSTRAINT "Supply_minimumStock_check" CHECK ("minimumStock" IS NULL OR "minimumStock" >= 0);

CREATE TABLE "SupplyPurchase" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "supplierNameSnapshot" TEXT NOT NULL,
  "purchaseDate" DATE NOT NULL,
  "dueDate" DATE,
  "documentNumber" TEXT,
  "notes" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplyPurchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplyPurchase_supplierNameSnapshot_check" CHECK (length(btrim("supplierNameSnapshot")) > 0),
  CONSTRAINT "SupplyPurchase_documentNumber_check" CHECK ("documentNumber" IS NULL OR length(btrim("documentNumber")) > 0)
);

CREATE TABLE "SupplyPurchaseItem" (
  "id" TEXT NOT NULL,
  "supplyPurchaseId" TEXT NOT NULL,
  "supplyId" TEXT NOT NULL,
  "supplyNameSnapshot" TEXT NOT NULL,
  "unitSnapshot" TEXT NOT NULL,
  "quantity" DECIMAL(14,4) NOT NULL,
  "unitPrice" DECIMAL(14,4) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplyPurchaseItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplyPurchaseItem_supplyNameSnapshot_check" CHECK (length(btrim("supplyNameSnapshot")) > 0),
  CONSTRAINT "SupplyPurchaseItem_unitSnapshot_check" CHECK (length(btrim("unitSnapshot")) > 0),
  CONSTRAINT "SupplyPurchaseItem_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "SupplyPurchaseItem_unitPrice_check" CHECK ("unitPrice" > 0)
);

CREATE TABLE "StockMovement" (
  "id" TEXT NOT NULL,
  "supplyId" TEXT NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "direction" "StockMovementDirection" NOT NULL,
  "quantity" DECIMAL(14,4) NOT NULL,
  "movementDate" DATE NOT NULL,
  "supplyPurchaseItemId" TEXT,
  "productionOrderId" TEXT,
  "productionOrderSupplyId" TEXT,
  "reversalOfMovementId" TEXT,
  "createdByUserId" TEXT,
  "reason" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockMovement_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "StockMovement_reason_check" CHECK ("reason" IS NULL OR length(btrim("reason")) > 0),
  CONSTRAINT "StockMovement_direction_type_check" CHECK (
    ("type"::text = 'PURCHASE' AND "direction"::text = 'IN' AND "supplyPurchaseItemId" IS NOT NULL AND "productionOrderId" IS NULL AND "productionOrderSupplyId" IS NULL AND "reversalOfMovementId" IS NULL)
    OR ("type"::text = 'OP_CONSUMPTION' AND "direction"::text = 'OUT' AND "productionOrderId" IS NOT NULL AND "supplyPurchaseItemId" IS NULL AND "reversalOfMovementId" IS NULL)
    OR ("type"::text = 'POSITIVE_ADJUSTMENT' AND "direction"::text = 'IN' AND "supplyPurchaseItemId" IS NULL AND "reversalOfMovementId" IS NULL)
    OR ("type"::text = 'NEGATIVE_ADJUSTMENT' AND "direction"::text = 'OUT' AND "supplyPurchaseItemId" IS NULL AND "reversalOfMovementId" IS NULL)
    OR ("type"::text = 'RETURN' AND "direction"::text = 'IN' AND "reversalOfMovementId" IS NULL)
    OR ("type"::text = 'REVERSAL' AND "reversalOfMovementId" IS NOT NULL)
  )
);

CREATE TABLE "ProductionOrderSupplyConsumption" (
  "id" TEXT NOT NULL,
  "productionOrderId" TEXT NOT NULL,
  "productionOrderSupplyId" TEXT,
  "supplyId" TEXT NOT NULL,
  "supplyNameSnapshot" TEXT NOT NULL,
  "unitSnapshot" TEXT NOT NULL,
  "quantity" DECIMAL(14,4) NOT NULL,
  "consumptionDate" DATE NOT NULL,
  "notes" TEXT,
  "createdByUserId" TEXT,
  "stockMovementId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionOrderSupplyConsumption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductionOrderSupplyConsumption_supplyNameSnapshot_check" CHECK (length(btrim("supplyNameSnapshot")) > 0),
  CONSTRAINT "ProductionOrderSupplyConsumption_unitSnapshot_check" CHECK (length(btrim("unitSnapshot")) > 0),
  CONSTRAINT "ProductionOrderSupplyConsumption_quantity_check" CHECK ("quantity" > 0)
);

ALTER TABLE "AccountPayable"
  ADD COLUMN "supplyPurchaseId" TEXT;

CREATE UNIQUE INDEX "AccountPayable_supplyPurchaseId_key" ON "AccountPayable"("supplyPurchaseId");

ALTER TABLE "AccountPayable"
  DROP CONSTRAINT "AccountPayable_source_origin_check",
  ADD CONSTRAINT "AccountPayable_source_origin_check" CHECK (
    ("source"::text = 'CONTRACTOR_SETTLEMENT' AND "contractorSettlementId" IS NOT NULL AND "supplyPurchaseId" IS NULL)
    OR ("source"::text = 'MANUAL' AND "contractorSettlementId" IS NULL AND "supplyPurchaseId" IS NULL)
    OR ("source"::text = 'SUPPLY_PURCHASE' AND "contractorSettlementId" IS NULL AND "supplyPurchaseId" IS NOT NULL)
  );

CREATE INDEX "SupplyPurchase_companyId_purchaseDate_idx" ON "SupplyPurchase"("companyId", "purchaseDate");
CREATE INDEX "SupplyPurchase_purchaseDate_idx" ON "SupplyPurchase"("purchaseDate");
CREATE INDEX "SupplyPurchase_createdByUserId_idx" ON "SupplyPurchase"("createdByUserId");

CREATE INDEX "SupplyPurchaseItem_supplyPurchaseId_idx" ON "SupplyPurchaseItem"("supplyPurchaseId");
CREATE INDEX "SupplyPurchaseItem_supplyId_idx" ON "SupplyPurchaseItem"("supplyId");

CREATE UNIQUE INDEX "StockMovement_reversalOfMovementId_key" ON "StockMovement"("reversalOfMovementId");
CREATE INDEX "StockMovement_supplyId_movementDate_idx" ON "StockMovement"("supplyId", "movementDate");
CREATE INDEX "StockMovement_type_movementDate_idx" ON "StockMovement"("type", "movementDate");
CREATE INDEX "StockMovement_productionOrderId_idx" ON "StockMovement"("productionOrderId");
CREATE INDEX "StockMovement_supplyPurchaseItemId_idx" ON "StockMovement"("supplyPurchaseItemId");
CREATE INDEX "StockMovement_createdByUserId_idx" ON "StockMovement"("createdByUserId");

CREATE UNIQUE INDEX "ProductionOrderSupplyConsumption_stockMovementId_key" ON "ProductionOrderSupplyConsumption"("stockMovementId");
CREATE INDEX "ProductionOrderSupplyConsumption_productionOrderId_idx" ON "ProductionOrderSupplyConsumption"("productionOrderId");
CREATE INDEX "ProductionOrderSupplyConsumption_supplyId_idx" ON "ProductionOrderSupplyConsumption"("supplyId");
CREATE INDEX "ProductionOrderSupplyConsumption_consumptionDate_idx" ON "ProductionOrderSupplyConsumption"("consumptionDate");
CREATE INDEX "ProductionOrderSupplyConsumption_createdByUserId_idx" ON "ProductionOrderSupplyConsumption"("createdByUserId");

ALTER TABLE "SupplyPurchase" ADD CONSTRAINT "SupplyPurchase_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplyPurchase" ADD CONSTRAINT "SupplyPurchase_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplyPurchaseItem" ADD CONSTRAINT "SupplyPurchaseItem_supplyPurchaseId_fkey"
  FOREIGN KEY ("supplyPurchaseId") REFERENCES "SupplyPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplyPurchaseItem" ADD CONSTRAINT "SupplyPurchaseItem_supplyId_fkey"
  FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_supplyId_fkey"
  FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_supplyPurchaseItemId_fkey"
  FOREIGN KEY ("supplyPurchaseItemId") REFERENCES "SupplyPurchaseItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productionOrderId_fkey"
  FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productionOrderSupplyId_fkey"
  FOREIGN KEY ("productionOrderSupplyId") REFERENCES "ProductionOrderSupply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_reversalOfMovementId_fkey"
  FOREIGN KEY ("reversalOfMovementId") REFERENCES "StockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductionOrderSupplyConsumption" ADD CONSTRAINT "ProductionOrderSupplyConsumption_productionOrderId_fkey"
  FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOrderSupplyConsumption" ADD CONSTRAINT "ProductionOrderSupplyConsumption_productionOrderSupplyId_fkey"
  FOREIGN KEY ("productionOrderSupplyId") REFERENCES "ProductionOrderSupply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOrderSupplyConsumption" ADD CONSTRAINT "ProductionOrderSupplyConsumption_supplyId_fkey"
  FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOrderSupplyConsumption" ADD CONSTRAINT "ProductionOrderSupplyConsumption_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOrderSupplyConsumption" ADD CONSTRAINT "ProductionOrderSupplyConsumption_stockMovementId_fkey"
  FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountPayable" ADD CONSTRAINT "AccountPayable_supplyPurchaseId_fkey"
  FOREIGN KEY ("supplyPurchaseId") REFERENCES "SupplyPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
