-- CreateEnum
CREATE TYPE "AgentCapabilityKind" AS ENUM ('REMOTE', 'BACKUP', 'TUNNEL', 'SUPPORT', 'DEVICE');

-- CreateEnum
CREATE TYPE "AgentCapabilityStatus" AS ENUM ('PENDING', 'ACTIVE', 'DEGRADED', 'DISABLED', 'REVOKED');

-- CreateTable
CREATE TABLE "device" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "hostname" TEXT,
    "os" TEXT,
    "identitySource" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_installation" (
    "id" TEXT NOT NULL,
    "deviceRecordId" TEXT NOT NULL,
    "agentInstanceId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "agentVersion" TEXT,
    "companyId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastRegisteredAt" TIMESTAMP(3),
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_installation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_capability" (
    "id" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "kind" "AgentCapabilityKind" NOT NULL,
    "status" "AgentCapabilityStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "companyId" TEXT,
    "remoteHostId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_capability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_deviceId_key" ON "device"("deviceId");

-- CreateIndex
CREATE INDEX "device_lastSeenAt_idx" ON "device"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "agent_installation_agentInstanceId_key" ON "agent_installation"("agentInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_installation_credentialId_key" ON "agent_installation"("credentialId");

-- CreateIndex
CREATE INDEX "agent_installation_deviceRecordId_idx" ON "agent_installation"("deviceRecordId");

-- CreateIndex
CREATE INDEX "agent_installation_companyId_idx" ON "agent_installation"("companyId");

-- CreateIndex
CREATE INDEX "agent_installation_lastHeartbeatAt_idx" ON "agent_installation"("lastHeartbeatAt");

-- CreateIndex
CREATE INDEX "agent_installation_supersededAt_idx" ON "agent_installation"("supersededAt");

-- CreateIndex
CREATE INDEX "agent_installation_companyId_lastHeartbeatAt_idx" ON "agent_installation"("companyId", "lastHeartbeatAt");

-- CreateIndex
CREATE INDEX "agent_installation_deviceRecordId_supersededAt_idx" ON "agent_installation"("deviceRecordId", "supersededAt");

-- CreateIndex
CREATE UNIQUE INDEX "agent_capability_remoteHostId_key" ON "agent_capability"("remoteHostId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_capability_installationId_kind_key" ON "agent_capability"("installationId", "kind");

-- CreateIndex
CREATE INDEX "agent_capability_kind_status_idx" ON "agent_capability"("kind", "status");

-- CreateIndex
CREATE INDEX "agent_capability_companyId_idx" ON "agent_capability"("companyId");

-- CreateIndex
CREATE INDEX "agent_capability_externalId_idx" ON "agent_capability"("externalId");

-- CreateIndex
CREATE INDEX "agent_capability_lastSeenAt_idx" ON "agent_capability"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "agent_installation" ADD CONSTRAINT "agent_installation_deviceRecordId_fkey" FOREIGN KEY ("deviceRecordId") REFERENCES "device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_installation" ADD CONSTRAINT "agent_installation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_capability" ADD CONSTRAINT "agent_capability_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "agent_installation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_capability" ADD CONSTRAINT "agent_capability_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_capability" ADD CONSTRAINT "agent_capability_remoteHostId_fkey" FOREIGN KEY ("remoteHostId") REFERENCES "remote_host"("id") ON DELETE SET NULL ON UPDATE CASCADE;
