-- CreateEnum
CREATE TYPE "RemoteAgentCommandType" AS ENUM ('REAPPLY_ALIAS', 'REAPPLY_CONFIG', 'UPGRADE_CLIENT', 'ROTATE_TOKEN_REQUIRED');

-- CreateEnum
CREATE TYPE "RemoteAgentCommandStatus" AS ENUM ('PENDING', 'DELIVERED', 'ACKNOWLEDGED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "remote_agent_command" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "type" "RemoteAgentCommandType" NOT NULL,
    "status" "RemoteAgentCommandStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "remote_agent_command_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "remote_agent_command_hostId_status_createdAt_idx" ON "remote_agent_command"("hostId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "remote_agent_command_hostId_type_status_idx" ON "remote_agent_command"("hostId", "type", "status");

-- AddForeignKey
ALTER TABLE "remote_agent_command" ADD CONSTRAINT "remote_agent_command_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "remote_host"("id") ON DELETE CASCADE ON UPDATE CASCADE;
