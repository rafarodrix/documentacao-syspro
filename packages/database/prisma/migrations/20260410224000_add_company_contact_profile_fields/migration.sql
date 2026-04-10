ALTER TABLE "company_contact"
ADD COLUMN IF NOT EXISTS "cpf" TEXT,
ADD COLUMN IF NOT EXISTS "jobTitle" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "company_contact_cpf_key"
ON "company_contact"("cpf");
