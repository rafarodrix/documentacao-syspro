CREATE TYPE "RemoteDiscoveredHostStatus" AS ENUM ('PENDING_LINK', 'LINKED', 'IGNORED');

CREATE TABLE "remote_discovered_host" (
    "id" TEXT NOT NULL,
    "linkedHostId" TEXT,
    "machineName" TEXT,
    "agentExternalId" TEXT,
    "agentVersion" TEXT,
    "provider" TEXT,
    "environment" TEXT,
    "description" TEXT,
    "serviceStatus" TEXT,
    "status" "RemoteDiscoveredHostStatus" NOT NULL DEFAULT 'PENDING_LINK',
    "installationsSnapshot" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3),
    "linkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remote_discovered_host_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "remote_discovered_host_linkedHostId_key" ON "remote_discovered_host"("linkedHostId");
CREATE INDEX "remote_discovered_host_status_updatedAt_idx" ON "remote_discovered_host"("status", "updatedAt");
CREATE INDEX "remote_discovered_host_agentExternalId_idx" ON "remote_discovered_host"("agentExternalId");
CREATE INDEX "remote_discovered_host_machineName_idx" ON "remote_discovered_host"("machineName");

ALTER TABLE "remote_discovered_host"
ADD CONSTRAINT "remote_discovered_host_linkedHostId_fkey"
FOREIGN KEY ("linkedHostId") REFERENCES "remote_host"("id") ON DELETE SET NULL ON UPDATE CASCADE;
