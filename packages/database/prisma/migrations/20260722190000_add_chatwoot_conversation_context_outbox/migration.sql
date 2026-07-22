CREATE TYPE "ChatwootCompanyContextLinkSource" AS ENUM ('MANUAL', 'CONTACT', 'PHONE', 'CNPJ');
CREATE TYPE "ChatwootCompanyContextSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED', 'OUTDATED');

CREATE TABLE "chatwoot_conversation_context" (
    "id" TEXT NOT NULL,
    "chatwootAccountId" TEXT NOT NULL,
    "chatwootConversationId" TEXT NOT NULL,
    "chatwootContactId" TEXT,
    "portalContactId" TEXT,
    "activeCompanyId" TEXT NOT NULL,
    "linkedByUserId" TEXT,
    "linkSource" "ChatwootCompanyContextLinkSource" NOT NULL DEFAULT 'MANUAL',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chatwoot_conversation_context_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chatwoot_conversation_context_outbox" (
    "id" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'conversation.company-context.changed',
    "payload" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "status" "ChatwootCompanyContextSyncStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chatwoot_conversation_context_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chatwoot_conversation_context_chatwootAccountId_chatwootConversationId_key"
ON "chatwoot_conversation_context"("chatwootAccountId", "chatwootConversationId");
CREATE INDEX "chatwoot_conversation_context_chatwootContactId_idx"
ON "chatwoot_conversation_context"("chatwootContactId");
CREATE INDEX "chatwoot_conversation_context_activeCompanyId_idx"
ON "chatwoot_conversation_context"("activeCompanyId");
CREATE INDEX "chatwoot_conversation_context_portalContactId_idx"
ON "chatwoot_conversation_context"("portalContactId");
CREATE UNIQUE INDEX "chatwoot_conversation_context_outbox_contextId_key"
ON "chatwoot_conversation_context_outbox"("contextId");
CREATE INDEX "chatwoot_conversation_context_outbox_status_nextAttemptAt_idx"
ON "chatwoot_conversation_context_outbox"("status", "nextAttemptAt");
CREATE INDEX "chatwoot_conversation_context_outbox_lockedAt_idx"
ON "chatwoot_conversation_context_outbox"("lockedAt");

ALTER TABLE "chatwoot_conversation_context"
ADD CONSTRAINT "chatwoot_conversation_context_portalContactId_fkey"
FOREIGN KEY ("portalContactId") REFERENCES "company_contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "chatwoot_conversation_context"
ADD CONSTRAINT "chatwoot_conversation_context_activeCompanyId_fkey"
FOREIGN KEY ("activeCompanyId") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chatwoot_conversation_context_outbox"
ADD CONSTRAINT "chatwoot_conversation_context_outbox_contextId_fkey"
FOREIGN KEY ("contextId") REFERENCES "chatwoot_conversation_context"("id") ON DELETE CASCADE ON UPDATE CASCADE;
