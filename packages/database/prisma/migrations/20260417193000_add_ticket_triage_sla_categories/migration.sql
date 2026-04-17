ALTER TYPE "ConversationStatus" ADD VALUE IF NOT EXISTS 'TRIAGE';
ALTER TYPE "ConversationStatus" ADD VALUE IF NOT EXISTS 'TESTING';

CREATE TABLE "ticket_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "slaResponseMinutes" INTEGER NOT NULL DEFAULT 60,
    "slaResolutionMinutes" INTEGER NOT NULL DEFAULT 1440,
    "defaultTeam" TEXT,

    CONSTRAINT "ticket_category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ticket_category_slug_key" ON "ticket_category"("slug");

ALTER TABLE "conversation"
ADD COLUMN "slaResponseDueAt" TIMESTAMP(3),
ADD COLUMN "slaResolutionDueAt" TIMESTAMP(3),
ADD COLUMN "slaResponseHitAt" TIMESTAMP(3),
ADD COLUMN "slaResolutionHitAt" TIMESTAMP(3),
ADD COLUMN "ticketCategoryId" TEXT;

CREATE INDEX "conversation_ticketCategoryId_idx" ON "conversation"("ticketCategoryId");

ALTER TABLE "conversation"
ADD CONSTRAINT "conversation_ticketCategoryId_fkey"
FOREIGN KEY ("ticketCategoryId") REFERENCES "ticket_category"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
