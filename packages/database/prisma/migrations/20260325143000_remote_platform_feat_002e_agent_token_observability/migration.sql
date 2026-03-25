-- AlterTable
ALTER TABLE "remote_host"
ADD COLUMN "agentTokenHash" TEXT,
ADD COLUMN "agentTokenIssuedAt" TIMESTAMP(3),
ADD COLUMN "agentTokenLastUsedAt" TIMESTAMP(3),
ADD COLUMN "lastHeartbeatErrorAt" TIMESTAMP(3),
ADD COLUMN "lastHeartbeatErrorMessage" TEXT,
ADD COLUMN "lastHeartbeatSuccessAt" TIMESTAMP(3),
ADD COLUMN "lastKnownIp" TEXT,
ADD COLUMN "lastRegisterAt" TIMESTAMP(3),
ADD COLUMN "lastRegisterSource" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "remote_host_agentTokenHash_key" ON "remote_host"("agentTokenHash");

-- CreateIndex
CREATE INDEX "remote_host_agentTokenHash_idx" ON "remote_host"("agentTokenHash");

-- CreateIndex
CREATE INDEX "remote_host_lastHeartbeatSuccessAt_idx" ON "remote_host"("lastHeartbeatSuccessAt");
