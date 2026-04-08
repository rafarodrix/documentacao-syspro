ALTER TABLE "ConversationLink"
ADD COLUMN "companyId" TEXT,
ADD COLUMN "connectionId" TEXT,
ADD COLUMN "connectionKey" TEXT NOT NULL DEFAULT 'env:default';

ALTER TABLE "MessageLink"
ADD COLUMN "companyId" TEXT,
ADD COLUMN "connectionId" TEXT,
ADD COLUMN "connectionKey" TEXT NOT NULL DEFAULT 'env:default';

DROP INDEX "ConversationLink_whatsappNumber_key";
DROP INDEX "ConversationLink_chatwootConversationId_key";
DROP INDEX "MessageLink_chatwootMessageId_key";
DROP INDEX "MessageLink_evolutionMessageId_key";

CREATE UNIQUE INDEX "ConversationLink_connectionKey_whatsappNumber_key"
ON "ConversationLink"("connectionKey", "whatsappNumber");

CREATE UNIQUE INDEX "ConversationLink_connectionKey_chatwootConversationId_key"
ON "ConversationLink"("connectionKey", "chatwootConversationId");

CREATE UNIQUE INDEX "MessageLink_connectionKey_chatwootMessageId_key"
ON "MessageLink"("connectionKey", "chatwootMessageId");

CREATE UNIQUE INDEX "MessageLink_connectionKey_evolutionMessageId_key"
ON "MessageLink"("connectionKey", "evolutionMessageId");

CREATE INDEX "ConversationLink_companyId_idx" ON "ConversationLink"("companyId");
CREATE INDEX "ConversationLink_connectionId_idx" ON "ConversationLink"("connectionId");
CREATE INDEX "ConversationLink_connectionKey_idx" ON "ConversationLink"("connectionKey");

CREATE INDEX "MessageLink_companyId_idx" ON "MessageLink"("companyId");
CREATE INDEX "MessageLink_connectionId_idx" ON "MessageLink"("connectionId");
CREATE INDEX "MessageLink_connectionKey_idx" ON "MessageLink"("connectionKey");

ALTER TABLE "ConversationLink"
ADD CONSTRAINT "ConversationLink_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConversationLink"
ADD CONSTRAINT "ConversationLink_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "integration_connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MessageLink"
ADD CONSTRAINT "MessageLink_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MessageLink"
ADD CONSTRAINT "MessageLink_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "integration_connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
