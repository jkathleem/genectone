-- ServiceContractor becomes the single source for the current outsourcing price.
-- Existing global prices are copied only when their mapping is unambiguous.
DO $$
DECLARE
  price_count INTEGER;
BEGIN
  SELECT count(*) INTO price_count FROM "ServicePrice";

  IF price_count > 0 AND price_count <> 5 THEN
    RAISE EXCEPTION 'Expected either an empty ServicePrice table or exactly the 5 audited reference prices; found %.', price_count;
  END IF;

  IF EXISTS (
    SELECT sp."serviceId"
    FROM "ServicePrice" sp
    GROUP BY sp."serviceId"
    HAVING count(*) <> 1
  ) THEN
    RAISE EXCEPTION 'Global price history is ambiguous and cannot be collapsed into a current Contractor + Service price.';
  END IF;

  IF EXISTS (
    SELECT sp.id
    FROM "ServicePrice" sp
    LEFT JOIN "ServiceContractor" sc ON sc."serviceId" = sp."serviceId"
    GROUP BY sp.id
    HAVING count(sc."contractorId") <> 1
  ) THEN
    RAISE EXCEPTION 'A priced Service does not have exactly one audited Contractor mapping.';
  END IF;
END $$;

ALTER TABLE "ServiceContractor"
  ADD COLUMN "unitPrice" DECIMAL(14,4),
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "ServiceContractor" sc
SET
  "unitPrice" = sp."unitPrice",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "ServicePrice" sp
WHERE sp."serviceId" = sc."serviceId";

ALTER TABLE "ServiceContractor"
  ADD CONSTRAINT "ServiceContractor_unitPrice_check" CHECK (
    "unitPrice" IS NULL OR "unitPrice" > 0
  );

ALTER TABLE "ServiceContractor" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Historical execution prices live in OutsourcedService.appliedUnitPrice and
-- ContractorSettlementItem.appliedUnitPriceSnapshot. Keeping ServicePrice here
-- would create a second competing source for the current price.
DROP TABLE "ServicePrice";
