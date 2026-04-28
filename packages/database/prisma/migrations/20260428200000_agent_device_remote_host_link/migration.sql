-- AlterTable: add remoteHostId FK column to agent_device
ALTER TABLE "agent_device" ADD COLUMN "remoteHostId" TEXT;

-- CreateIndex: unique constraint (1-to-1 — one device per host)
ALTER TABLE "agent_device" ADD CONSTRAINT "agent_device_remoteHostId_key" UNIQUE ("remoteHostId");

-- CreateIndex: lookup index
CREATE INDEX "agent_device_remoteHostId_idx" ON "agent_device"("remoteHostId");

-- AddForeignKey
ALTER TABLE "agent_device" ADD CONSTRAINT "agent_device_remoteHostId_fkey"
  FOREIGN KEY ("remoteHostId") REFERENCES "remote_host"("id") ON DELETE SET NULL ON UPDATE CASCADE;
