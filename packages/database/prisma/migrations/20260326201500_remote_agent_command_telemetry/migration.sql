-- AlterTable
ALTER TABLE "remote_agent_command"
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "resultMessage" TEXT,
ADD COLUMN "resultPayload" JSONB,
ADD COLUMN "failedAt" TIMESTAMP(3);
