-- CreateTable
CREATE TABLE "ConversationLink" (
    "id" TEXT NOT NULL,
    "whatsappNumber" TEXT NOT NULL,
    "chatwootContactId" TEXT NOT NULL,
    "chatwootConversationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationLink_whatsappNumber_key" ON "ConversationLink"("whatsappNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationLink_chatwootConversationId_key" ON "ConversationLink"("chatwootConversationId");

-- CreateIndex
CREATE INDEX "ConversationLink_whatsappNumber_idx" ON "ConversationLink"("whatsappNumber");

-- CreateIndex
CREATE INDEX "ConversationLink_chatwootConversationId_idx" ON "ConversationLink"("chatwootConversationId");
