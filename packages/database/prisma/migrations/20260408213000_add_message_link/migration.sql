-- CreateTable
CREATE TABLE "MessageLink" (
    "id" TEXT NOT NULL,
    "chatwootMessageId" TEXT NOT NULL,
    "chatwootConversationId" TEXT NOT NULL,
    "evolutionMessageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageLink_chatwootMessageId_key" ON "MessageLink"("chatwootMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageLink_evolutionMessageId_key" ON "MessageLink"("evolutionMessageId");

-- CreateIndex
CREATE INDEX "MessageLink_chatwootConversationId_idx" ON "MessageLink"("chatwootConversationId");

-- CreateIndex
CREATE INDEX "MessageLink_evolutionMessageId_idx" ON "MessageLink"("evolutionMessageId");
