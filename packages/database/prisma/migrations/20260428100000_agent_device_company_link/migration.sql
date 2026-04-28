-- AlterTable
ALTER TABLE "agent_device" ADD COLUMN "companyId" TEXT;

-- CreateIndex
CREATE INDEX "agent_device_companyId_idx" ON "agent_device"("companyId");

-- CreateIndex
CREATE INDEX "agent_device_companyId_lastHeartbeatAt_idx" ON "agent_device"("companyId", "lastHeartbeatAt");

-- AddForeignKey
ALTER TABLE "agent_device" ADD CONSTRAINT "agent_device_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
