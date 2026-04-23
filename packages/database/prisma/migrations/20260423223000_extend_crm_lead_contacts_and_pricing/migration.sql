ALTER TABLE "crm_lead"
ADD COLUMN "contacts" JSONB,
ADD COLUMN "licenseValue" DECIMAL(12,2),
ADD COLUMN "monthlyFee" DECIMAL(12,2),
ADD COLUMN "minimumWagePercentage" DECIMAL(8,4);
