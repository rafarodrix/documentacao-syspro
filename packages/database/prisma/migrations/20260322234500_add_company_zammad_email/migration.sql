CREATE TABLE "company_zammad_email" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_zammad_email_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_zammad_email_companyId_email_key" ON "company_zammad_email"("companyId", "email");
CREATE INDEX "company_zammad_email_companyId_isActive_idx" ON "company_zammad_email"("companyId", "isActive");
CREATE INDEX "company_zammad_email_email_idx" ON "company_zammad_email"("email");

ALTER TABLE "company_zammad_email"
ADD CONSTRAINT "company_zammad_email_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "company"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
