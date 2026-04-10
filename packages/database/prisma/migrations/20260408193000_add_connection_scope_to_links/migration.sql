ALTER TABLE "ConversationLink"
ADD COLUMN "companyId" TEXT,
ADD COLUMN "connectionId" TEXT,
ADD COLUMN "connectionKey" TEXT NOT NULL DEFAULT 'env:default';

DO $$
BEGIN
  IF to_regclass('"MessageLink"') IS NOT NULL THEN
    ALTER TABLE "MessageLink"
    ADD COLUMN "companyId" TEXT,
    ADD COLUMN "connectionId" TEXT,
    ADD COLUMN "connectionKey" TEXT NOT NULL DEFAULT 'env:default';
  END IF;
END $$;

DROP INDEX "ConversationLink_whatsappNumber_key";
DROP INDEX "ConversationLink_chatwootConversationId_key";

DO $$
BEGIN
  IF to_regclass('"MessageLink_chatwootMessageId_key"') IS NOT NULL THEN
    DROP INDEX "MessageLink_chatwootMessageId_key";
  END IF;
  IF to_regclass('"MessageLink_evolutionMessageId_key"') IS NOT NULL THEN
    DROP INDEX "MessageLink_evolutionMessageId_key";
  END IF;
END $$;

CREATE UNIQUE INDEX "ConversationLink_connectionKey_whatsappNumber_key"
ON "ConversationLink"("connectionKey", "whatsappNumber");

CREATE UNIQUE INDEX "ConversationLink_connectionKey_chatwootConversationId_key"
ON "ConversationLink"("connectionKey", "chatwootConversationId");

DO $$
BEGIN
  IF to_regclass('"MessageLink"') IS NOT NULL THEN
    CREATE UNIQUE INDEX "MessageLink_connectionKey_chatwootMessageId_key"
    ON "MessageLink"("connectionKey", "chatwootMessageId");
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"MessageLink"') IS NOT NULL THEN
    CREATE UNIQUE INDEX "MessageLink_connectionKey_evolutionMessageId_key"
    ON "MessageLink"("connectionKey", "evolutionMessageId");
  END IF;
END $$;

CREATE INDEX "ConversationLink_companyId_idx" ON "ConversationLink"("companyId");
CREATE INDEX "ConversationLink_connectionId_idx" ON "ConversationLink"("connectionId");
CREATE INDEX "ConversationLink_connectionKey_idx" ON "ConversationLink"("connectionKey");

DO $$
BEGIN
  IF to_regclass('"MessageLink"') IS NOT NULL THEN
    CREATE INDEX "MessageLink_companyId_idx" ON "MessageLink"("companyId");
    CREATE INDEX "MessageLink_connectionId_idx" ON "MessageLink"("connectionId");
    CREATE INDEX "MessageLink_connectionKey_idx" ON "MessageLink"("connectionKey");
  END IF;
END $$;

ALTER TABLE "ConversationLink"
ADD CONSTRAINT "ConversationLink_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
BEGIN
  IF to_regclass('"integration_connection"') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'ConversationLink_connectionId_fkey'
     ) THEN
    ALTER TABLE "ConversationLink"
    ADD CONSTRAINT "ConversationLink_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "integration_connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"MessageLink"') IS NOT NULL THEN
    ALTER TABLE "MessageLink"
    ADD CONSTRAINT "MessageLink_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    IF to_regclass('"integration_connection"') IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM pg_constraint
         WHERE conname = 'MessageLink_connectionId_fkey'
       ) THEN
      ALTER TABLE "MessageLink"
      ADD CONSTRAINT "MessageLink_connectionId_fkey"
      FOREIGN KEY ("connectionId") REFERENCES "integration_connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
