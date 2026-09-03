-- Romaneios use an independent PostgreSQL sequence for concurrency-safe numbering.
-- The application formats the BIGINT value as a string with at least six digits.
CREATE SEQUENCE "delivery_note_number_seq"
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO MAXVALUE
    CACHE 1;

-- Replace the non-unique lookup index with a database-enforced global invariant.
DROP INDEX "DeliveryNote_number_idx";
CREATE UNIQUE INDEX "DeliveryNote_number_key" ON "DeliveryNote"("number");
