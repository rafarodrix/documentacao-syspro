-- AlterTable
ALTER TABLE "agent_device"
ADD COLUMN "agentInstanceId" TEXT,
ADD COLUMN "credentialId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "agent_device_agentInstanceId_key" ON "agent_device"("agentInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_device_credentialId_key" ON "agent_device"("credentialId");

-- CreateIndex
CREATE INDEX "agent_device_agentInstanceId_idx" ON "agent_device"("agentInstanceId");

-- CreateIndex
CREATE INDEX "agent_device_credentialId_idx" ON "agent_device"("credentialId");
