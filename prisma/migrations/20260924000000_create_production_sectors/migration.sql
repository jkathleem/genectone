-- Base estrutural de Setores Macro de Produção.
-- ProductionSector classifica a etapa macro principal de um Service.
-- InternalSector permanece como executor/capacidade interna e não é alterado.

CREATE TABLE "ProductionSector" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionSector_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductionSector_code_check" CHECK (length(btrim("code")) > 0),
  CONSTRAINT "ProductionSector_name_check" CHECK (length(btrim("name")) > 0)
);

CREATE UNIQUE INDEX "ProductionSector_code_key" ON "ProductionSector"("code");
CREATE UNIQUE INDEX "ProductionSector_name_key" ON "ProductionSector"("name");
CREATE INDEX "ProductionSector_active_displayOrder_idx" ON "ProductionSector"("active", "displayOrder");

ALTER TABLE "Service"
  ADD COLUMN "productionSectorId" TEXT;

CREATE INDEX "Service_productionSectorId_idx" ON "Service"("productionSectorId");

ALTER TABLE "Service"
  ADD CONSTRAINT "Service_productionSectorId_fkey"
  FOREIGN KEY ("productionSectorId") REFERENCES "ProductionSector"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ProductionSector" ("id", "code", "name", "displayOrder", "active", "createdAt", "updatedAt")
VALUES
  ('prod_sector_standby', 'STANDBY', 'Stand by', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('prod_sector_preparation', 'PREPARATION', 'Preparação', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('prod_sector_front', 'FRONT', 'Frente', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('prod_sector_back', 'BACK', 'Costa', 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('prod_sector_assembly', 'ASSEMBLY', 'Montagem', 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('prod_sector_final', 'FINAL', 'Final', 60, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('prod_sector_review', 'REVIEW', 'Revisão', 70, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "Service"
SET "productionSectorId" = 'prod_sector_preparation'
WHERE "name" = 'Preparação Frente';

UPDATE "Service"
SET "productionSectorId" = 'prod_sector_front'
WHERE "name" IN ('Pala e Gancho', 'Frente Completa', 'Frente');

UPDATE "Service"
SET "productionSectorId" = 'prod_sector_back'
WHERE "name" = 'Costas';
