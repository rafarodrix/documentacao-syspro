DROP TABLE IF EXISTS "company_ticket_email";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'company_contact' AND column_name = 'companyId'
  ) THEN
    ALTER TABLE "company_contact" DROP COLUMN "companyId";
  END IF;
END $$;

DROP INDEX IF EXISTS "company_contact_companyId_status_idx";
CREATE INDEX IF NOT EXISTS "company_contact_status_idx" ON "company_contact"("status");
