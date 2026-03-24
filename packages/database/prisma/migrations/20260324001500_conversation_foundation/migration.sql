-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'PORTAL', 'PHONE');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('NEW', 'UNASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConversationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ConversationEntryPoint" AS ENUM ('INBOUND', 'OUTBOUND', 'CAMPAIGN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ConversationParticipantKind" AS ENUM ('COMPANY_CONTACT', 'USER', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ConversationMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "ConversationMessageType" AS ENUM ('TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO', 'SYSTEM_EVENT');

-- CreateEnum
CREATE TYPE "ConversationMessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "ConversationAssignmentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'RELEASED');

-- CreateEnum
CREATE TYPE "ConversationAssignmentType" AS ENUM ('AUTO', 'MANUAL', 'TRANSFER');

-- CreateEnum
CREATE TYPE "ConversationQueueKey" AS ENUM ('new', 'unassigned', 'in_progress', 'waiting_customer', 'resolved', 'archived');

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "channel" "ConversationChannel" NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'NEW',
    "priority" "ConversationPriority" NOT NULL DEFAULT 'NORMAL',
    "entryPoint" "ConversationEntryPoint" NOT NULL DEFAULT 'INBOUND',
    "companyId" TEXT,
    "companyContactId" TEXT,
    "assignedUserId" TEXT,
    "resolvedByUserId" TEXT,
    "ticketId" TEXT,
    "ticketNumber" TEXT,
    "subject" TEXT,
    "externalThreadId" TEXT,
    "connectionId" TEXT,
    "contactPhoneSnapshot" TEXT,
    "contactWhatsappSnapshot" TEXT,
    "contactNameSnapshot" TEXT,
    "lastMessagePreview" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "ConversationMessageDirection" NOT NULL,
    "type" "ConversationMessageType" NOT NULL,
    "authorKind" "ConversationParticipantKind" NOT NULL,
    "authorUserId" TEXT,
    "authorContactId" TEXT,
    "externalMessageId" TEXT,
    "replyToMessageId" TEXT,
    "quotedExternalMessageId" TEXT,
    "body" TEXT,
    "mediaUrl" TEXT,
    "storageKey" TEXT,
    "mediaMimeType" TEXT,
    "fileSize" INTEGER,
    "checksum" TEXT,
    "status" "ConversationMessageStatus" NOT NULL DEFAULT 'PENDING',
    "providerStatus" TEXT,
    "providerError" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_queue_event" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "queueKey" "ConversationQueueKey" NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "position" INTEGER,
    "assignedTeam" TEXT,
    "slaDeadlineAt" TIMESTAMP(3),
    "breachedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_queue_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_assignment" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "assignedUserId" TEXT NOT NULL,
    "assignedByUserId" TEXT,
    "transferFromUserId" TEXT,
    "assignmentType" "ConversationAssignmentType" NOT NULL DEFAULT 'MANUAL',
    "status" "ConversationAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_channel_status_idx" ON "conversation"("channel", "status");
CREATE INDEX "conversation_companyId_status_idx" ON "conversation"("companyId", "status");
CREATE INDEX "conversation_companyContactId_status_idx" ON "conversation"("companyContactId", "status");
CREATE INDEX "conversation_assignedUserId_status_idx" ON "conversation"("assignedUserId", "status");
CREATE INDEX "conversation_ticketNumber_idx" ON "conversation"("ticketNumber");
CREATE INDEX "conversation_lastMessageAt_idx" ON "conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "conversation_message_conversationId_createdAt_idx" ON "conversation_message"("conversationId", "createdAt");
CREATE INDEX "conversation_message_externalMessageId_idx" ON "conversation_message"("externalMessageId");
CREATE INDEX "conversation_message_authorUserId_idx" ON "conversation_message"("authorUserId");
CREATE INDEX "conversation_message_authorContactId_idx" ON "conversation_message"("authorContactId");

-- CreateIndex
CREATE INDEX "conversation_queue_event_conversationId_enteredAt_idx" ON "conversation_queue_event"("conversationId", "enteredAt");
CREATE INDEX "conversation_queue_event_queueKey_leftAt_idx" ON "conversation_queue_event"("queueKey", "leftAt");
CREATE INDEX "conversation_queue_event_slaDeadlineAt_idx" ON "conversation_queue_event"("slaDeadlineAt");

-- CreateIndex
CREATE INDEX "conversation_assignment_conversationId_status_idx" ON "conversation_assignment"("conversationId", "status");
CREATE INDEX "conversation_assignment_assignedUserId_status_idx" ON "conversation_assignment"("assignedUserId", "status");
CREATE INDEX "conversation_assignment_assignedByUserId_idx" ON "conversation_assignment"("assignedByUserId");
CREATE INDEX "conversation_assignment_transferFromUserId_idx" ON "conversation_assignment"("transferFromUserId");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_companyContactId_fkey" FOREIGN KEY ("companyContactId") REFERENCES "company_contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_authorContactId_fkey" FOREIGN KEY ("authorContactId") REFERENCES "company_contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "conversation_message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_queue_event" ADD CONSTRAINT "conversation_queue_event_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_assignment" ADD CONSTRAINT "conversation_assignment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_assignment" ADD CONSTRAINT "conversation_assignment_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversation_assignment" ADD CONSTRAINT "conversation_assignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversation_assignment" ADD CONSTRAINT "conversation_assignment_transferFromUserId_fkey" FOREIGN KEY ("transferFromUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
