DO $$
BEGIN
  IF to_regclass('"MessageLink"') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'MessageLink' AND column_name = 'companyId'
  ) THEN
    ALTER TABLE "MessageLink" ADD COLUMN "companyId" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'MessageLink' AND column_name = 'connectionId'
  ) THEN
    ALTER TABLE "MessageLink" ADD COLUMN "connectionId" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'MessageLink' AND column_name = 'connectionKey'
  ) THEN
    ALTER TABLE "MessageLink" ADD COLUMN "connectionKey" TEXT NOT NULL DEFAULT 'env:default';
  END IF;
END $$;

DROP INDEX IF EXISTS "MessageLink_chatwootMessageId_key";
DROP INDEX IF EXISTS "MessageLink_evolutionMessageId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "MessageLink_connectionKey_chatwootMessageId_key"
ON "MessageLink"("connectionKey", "chatwootMessageId");

CREATE UNIQUE INDEX IF NOT EXISTS "MessageLink_connectionKey_evolutionMessageId_key"
ON "MessageLink"("connectionKey", "evolutionMessageId");

CREATE INDEX IF NOT EXISTS "MessageLink_companyId_idx" ON "MessageLink"("companyId");
CREATE INDEX IF NOT EXISTS "MessageLink_connectionId_idx" ON "MessageLink"("connectionId");
CREATE INDEX IF NOT EXISTS "MessageLink_connectionKey_idx" ON "MessageLink"("connectionKey");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'MessageLink_companyId_fkey'
  ) THEN
    ALTER TABLE "MessageLink"
    ADD CONSTRAINT "MessageLink_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'MessageLink_connectionId_fkey'
  ) THEN
    ALTER TABLE "MessageLink"
    ADD CONSTRAINT "MessageLink_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "integration_connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
