-- Extend the authenticated profiles without granting any permissions by default.
ALTER TYPE "UserRole" ADD VALUE 'CONTRACTOR';

CREATE TYPE "OperationalIssueType" AS ENUM (
  'MISSING_THREAD',
  'MISSING_TRIM',
  'MISSING_COMPONENT',
  'QUANTITY_ISSUE',
  'EXECUTION_QUESTION',
  'OTHER'
);

CREATE TYPE "OperationalIssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

ALTER TABLE "Contractor"
  ADD COLUMN "whatsapp" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "addressNumber" TEXT,
  ADD COLUMN "addressComplement" TEXT,
  ADD COLUMN "neighborhood" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "pixKey" TEXT;

ALTER TABLE "Product"
  ADD COLUMN "customerId" TEXT,
  ADD COLUMN "color" TEXT,
  ADD COLUMN "currentUnitPrice" DECIMAL(14,4),
  ADD COLUMN "imageUrl" TEXT,
  ADD CONSTRAINT "Product_currentUnitPrice_check" CHECK (
    "currentUnitPrice" IS NULL OR "currentUnitPrice" >= 0
  );

ALTER TABLE "ProductionOrder"
  ADD COLUMN "isUrgent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "expectedCompletionDate" DATE,
  ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "User" ADD COLUMN "contractorId" TEXT;

ALTER TABLE "User"
  ADD CONSTRAINT "User_role_contractor_check" CHECK (
    ("role" = 'CONTRACTOR' AND "contractorId" IS NOT NULL)
    OR ("role" <> 'CONTRACTOR' AND "contractorId" IS NULL)
  );

CREATE TABLE "InternalSector" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InternalSector_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InternalSector_displayOrder_check" CHECK ("displayOrder" >= 0)
);

CREATE TABLE "ServiceInternalSector" (
  "serviceId" TEXT NOT NULL,
  "internalSectorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceInternalSector_pkey" PRIMARY KEY ("serviceId", "internalSectorId")
);

CREATE TABLE "ServiceContractor" (
  "serviceId" TEXT NOT NULL,
  "contractorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceContractor_pkey" PRIMARY KEY ("serviceId", "contractorId")
);

CREATE TABLE "Supply" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Supply_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Supply_name_check" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "Supply_unit_check" CHECK (length(btrim("unit")) > 0)
);

CREATE TABLE "ProductSupply" (
  "productId" TEXT NOT NULL,
  "supplyId" TEXT NOT NULL,
  "quantityPerBase" DECIMAL(14,4),
  "baseQuantity" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSupply_pkey" PRIMARY KEY ("productId", "supplyId"),
  CONSTRAINT "ProductSupply_consumption_base_check" CHECK (
    ("quantityPerBase" IS NULL AND "baseQuantity" IS NULL)
    OR ("quantityPerBase" IS NOT NULL AND "quantityPerBase" > 0 AND "baseQuantity" IS NOT NULL AND "baseQuantity" > 0)
  )
);

CREATE TABLE "OperationalIssue" (
  "id" TEXT NOT NULL,
  "productionOrderId" TEXT NOT NULL,
  "outsourcedServiceId" TEXT,
  "contractorId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "type" "OperationalIssueType" NOT NULL,
  "description" TEXT NOT NULL,
  "status" "OperationalIssueStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByUserId" TEXT,
  CONSTRAINT "OperationalIssue_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OperationalIssue_description_check" CHECK (length(btrim("description")) > 0),
  CONSTRAINT "OperationalIssue_resolution_check" CHECK (
    ("status" = 'RESOLVED' AND "resolvedAt" IS NOT NULL AND "resolvedByUserId" IS NOT NULL)
    OR ("status" <> 'RESOLVED' AND "resolvedAt" IS NULL AND "resolvedByUserId" IS NULL)
  )
);

CREATE UNIQUE INDEX "InternalSector_name_key" ON "InternalSector"("name");
CREATE INDEX "InternalSector_active_displayOrder_idx" ON "InternalSector"("active", "displayOrder");
CREATE INDEX "ServiceInternalSector_internalSectorId_idx" ON "ServiceInternalSector"("internalSectorId");
CREATE INDEX "ServiceContractor_contractorId_idx" ON "ServiceContractor"("contractorId");
CREATE UNIQUE INDEX "Supply_name_key" ON "Supply"("name");
CREATE INDEX "Supply_active_name_idx" ON "Supply"("active", "name");
CREATE INDEX "ProductSupply_supplyId_idx" ON "ProductSupply"("supplyId");
CREATE INDEX "OperationalIssue_productionOrderId_status_idx" ON "OperationalIssue"("productionOrderId", "status");
CREATE INDEX "OperationalIssue_outsourcedServiceId_idx" ON "OperationalIssue"("outsourcedServiceId");
CREATE INDEX "OperationalIssue_contractorId_status_idx" ON "OperationalIssue"("contractorId", "status");
CREATE INDEX "OperationalIssue_createdByUserId_idx" ON "OperationalIssue"("createdByUserId");
CREATE INDEX "OperationalIssue_resolvedByUserId_idx" ON "OperationalIssue"("resolvedByUserId");
CREATE INDEX "Product_customerId_idx" ON "Product"("customerId");
CREATE INDEX "Product_reference_idx" ON "Product"("reference");
CREATE INDEX "User_contractorId_idx" ON "User"("contractorId");

ALTER TABLE "User" ADD CONSTRAINT "User_contractorId_fkey"
  FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceInternalSector" ADD CONSTRAINT "ServiceInternalSector_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceInternalSector" ADD CONSTRAINT "ServiceInternalSector_internalSectorId_fkey"
  FOREIGN KEY ("internalSectorId") REFERENCES "InternalSector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceContractor" ADD CONSTRAINT "ServiceContractor_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceContractor" ADD CONSTRAINT "ServiceContractor_contractorId_fkey"
  FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductSupply" ADD CONSTRAINT "ProductSupply_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductSupply" ADD CONSTRAINT "ProductSupply_supplyId_fkey"
  FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalIssue" ADD CONSTRAINT "OperationalIssue_productionOrderId_fkey"
  FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalIssue" ADD CONSTRAINT "OperationalIssue_outsourcedServiceId_fkey"
  FOREIGN KEY ("outsourcedServiceId") REFERENCES "OutsourcedService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalIssue" ADD CONSTRAINT "OperationalIssue_contractorId_fkey"
  FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalIssue" ADD CONSTRAINT "OperationalIssue_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalIssue" ADD CONSTRAINT "OperationalIssue_resolvedByUserId_fkey"
  FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
