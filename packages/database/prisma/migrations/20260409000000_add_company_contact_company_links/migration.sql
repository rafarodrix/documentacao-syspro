CREATE TABLE "company_contact_company_link" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "company_contact_company_link_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_contact_company_link_contactId_companyId_key"
ON "company_contact_company_link"("contactId", "companyId");

CREATE INDEX "company_contact_company_link_companyId_idx"
ON "company_contact_company_link"("companyId");

CREATE INDEX "company_contact_company_link_contactId_isPrimary_idx"
ON "company_contact_company_link"("contactId", "isPrimary");

ALTER TABLE "company_contact_company_link"
ADD CONSTRAINT "company_contact_company_link_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "company_contact"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_contact_company_link"
ADD CONSTRAINT "company_contact_company_link_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "company"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "company_contact_company_link" ("id", "contactId", "companyId", "isPrimary", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || cc."id" || cc."companyId"),
  cc."id",
  cc."companyId",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "company_contact" cc
WHERE cc."companyId" IS NOT NULL
ON CONFLICT ("contactId", "companyId") DO NOTHING;
