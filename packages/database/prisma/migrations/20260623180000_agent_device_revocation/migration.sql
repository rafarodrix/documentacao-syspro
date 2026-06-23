-- CreateTable
CREATE TABLE "agent_device_revocation" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "hostname" TEXT,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedByUserId" TEXT,
    "reason" TEXT,

    CONSTRAINT "agent_device_revocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_device_revocation_deviceId_key" ON "agent_device_revocation"("deviceId");

-- CreateIndex
CREATE INDEX "agent_device_revocation_revokedAt_idx" ON "agent_device_revocation"("revokedAt");
