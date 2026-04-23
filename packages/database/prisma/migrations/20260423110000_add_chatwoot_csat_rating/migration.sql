CREATE TABLE "chatwoot_csat_rating" (
    "id" TEXT NOT NULL,
    "chatwootConversationId" TEXT NOT NULL,
    "connectionKey" TEXT NOT NULL DEFAULT 'env:default',
    "contact" TEXT,
    "agentId" TEXT,
    "agentName" TEXT,
    "score" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECORDED',
    "requestedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatwoot_csat_rating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chatwoot_csat_rating_chatwootConversationId_key" ON "chatwoot_csat_rating"("chatwootConversationId");
CREATE INDEX "chatwoot_csat_rating_connectionKey_respondedAt_idx" ON "chatwoot_csat_rating"("connectionKey", "respondedAt");
CREATE INDEX "chatwoot_csat_rating_agentId_respondedAt_idx" ON "chatwoot_csat_rating"("agentId", "respondedAt");
