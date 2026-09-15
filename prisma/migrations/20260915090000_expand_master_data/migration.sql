-- Expand Company and Customer with optional master-data fields.
-- All columns are nullable so existing records remain valid without invented data.
CREATE TYPE "CustomerType" AS ENUM ('PF', 'PJ');

ALTER TABLE "Company"
  ADD COLUMN "stateRegistration" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "whatsapp" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "addressNumber" TEXT,
  ADD COLUMN "addressComplement" TEXT,
  ADD COLUMN "neighborhood" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT;

ALTER TABLE "Customer"
  ADD COLUMN "personType" "CustomerType",
  ADD COLUMN "tradeName" TEXT,
  ADD COLUMN "stateRegistration" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "whatsapp" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "addressNumber" TEXT,
  ADD COLUMN "addressComplement" TEXT,
  ADD COLUMN "neighborhood" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT;
