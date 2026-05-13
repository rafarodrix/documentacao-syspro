-- CreateEnum
CREATE TYPE "ConversationMessageAttachmentStorageBackend" AS ENUM ('DATABASE', 'R2');

-- CreateTable
CREATE TABLE "conversation_message_attachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "ConversationMessageType" NOT NULL,
    "filename" TEXT NOT NULL,
    "mediaMimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT,
    "storageBackend" "ConversationMessageAttachmentStorageBackend" NOT NULL DEFAULT 'DATABASE',
    "mediaUrl" TEXT,
    "storageKey" TEXT,
    "binaryData" BYTEA,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_message_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_message_attachment_messageId_createdAt_idx" ON "conversation_message_attachment"("messageId", "createdAt");

-- CreateIndex
CREATE INDEX "conversation_message_attachment_storageBackend_idx" ON "conversation_message_attachment"("storageBackend");

-- AddForeignKey
ALTER TABLE "conversation_message_attachment" ADD CONSTRAINT "conversation_message_attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "conversation_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
