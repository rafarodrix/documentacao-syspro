CREATE TYPE "CompanyContactSource" AS ENUM ('MANUAL', 'WHATSAPP', 'IMPORT');
CREATE TYPE "CompanyContactStatus" AS ENUM ('PENDING_LINK', 'LINKED', 'ARCHIVED');

CREATE TABLE "company_contact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "notes" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "source" "CompanyContactSource" NOT NULL DEFAULT 'MANUAL',
    "status" "CompanyContactStatus" NOT NULL DEFAULT 'LINKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_contact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "company_contact_companyId_status_idx" ON "company_contact"("companyId", "status");
CREATE INDEX "company_contact_whatsapp_idx" ON "company_contact"("whatsapp");

ALTER TABLE "company_contact" ADD CONSTRAINT "company_contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
