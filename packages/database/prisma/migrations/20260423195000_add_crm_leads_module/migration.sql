CREATE TYPE "CrmLeadStage" AS ENUM (
  'LEAD',
  'MQL',
  'SQL',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST'
);

CREATE TYPE "CrmLeadSource" AS ENUM (
  'MANUAL',
  'WHATSAPP',
  'REFERRAL',
  'FORM',
  'EVENT',
  'OUTBOUND',
  'CAMPAIGN',
  'OTHER'
);

CREATE TABLE "crm_lead" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "stage" "CrmLeadStage" NOT NULL DEFAULT 'LEAD',
  "source" "CrmLeadSource" NOT NULL DEFAULT 'MANUAL',
  "ownerUserId" TEXT,
  "contactId" TEXT,
  "convertedCompanyId" TEXT,
  "companyName" TEXT NOT NULL,
  "tradeName" TEXT,
  "document" TEXT,
  "industry" TEXT,
  "companySize" TEXT,
  "city" TEXT,
  "state" TEXT,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "estimatedValue" DECIMAL(12,2),
  "expectedCloseAt" TIMESTAMP(3),
  "nextStep" TEXT,
  "qualificationNotes" TEXT,
  "lostReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_lead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_lead_stage_createdAt_idx" ON "crm_lead"("stage", "createdAt");
CREATE INDEX "crm_lead_source_createdAt_idx" ON "crm_lead"("source", "createdAt");
CREATE INDEX "crm_lead_ownerUserId_stage_idx" ON "crm_lead"("ownerUserId", "stage");
CREATE INDEX "crm_lead_contactId_idx" ON "crm_lead"("contactId");
CREATE INDEX "crm_lead_convertedCompanyId_idx" ON "crm_lead"("convertedCompanyId");
CREATE INDEX "crm_lead_companyName_idx" ON "crm_lead"("companyName");

ALTER TABLE "crm_lead"
ADD CONSTRAINT "crm_lead_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_lead"
ADD CONSTRAINT "crm_lead_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "company_contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_lead"
ADD CONSTRAINT "crm_lead_convertedCompanyId_fkey"
FOREIGN KEY ("convertedCompanyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
