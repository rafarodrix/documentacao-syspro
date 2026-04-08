-- Rename old dedup key column to the standardized provider event id contract
ALTER TABLE "integration_webhook_dedup"
RENAME COLUMN "eventKey" TO "providerEventId";

-- Add TTL support for dedup records
ALTER TABLE "integration_webhook_dedup"
ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "integration_webhook_dedup"
SET "expiresAt" = "createdAt" + INTERVAL '1 day'
WHERE "expiresAt" IS NULL;

ALTER TABLE "integration_webhook_dedup"
ALTER COLUMN "expiresAt" SET NOT NULL;

DROP INDEX IF EXISTS "integration_webhook_dedup_provider_eventKey_key";
CREATE UNIQUE INDEX "integration_webhook_dedup_provider_providerEventId_key"
ON "integration_webhook_dedup"("provider", "providerEventId");

CREATE INDEX "integration_webhook_dedup_expiresAt_idx"
ON "integration_webhook_dedup"("expiresAt");

