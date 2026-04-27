-- CreateTable
CREATE TABLE "agent_device" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "hostname" TEXT,
    "os" TEXT,
    "identitySource" TEXT,
    "agentVersion" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastRegisteredAt" TIMESTAMP(3),

    CONSTRAINT "agent_device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_device_deviceId_key" ON "agent_device"("deviceId");

-- CreateIndex
CREATE INDEX "agent_device_deviceId_idx" ON "agent_device"("deviceId");

-- CreateIndex
CREATE INDEX "agent_device_lastHeartbeatAt_idx" ON "agent_device"("lastHeartbeatAt");
