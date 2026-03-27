-- AlterTable
ALTER TABLE "remote_host"
ADD COLUMN "lastKnownRustDeskAlias" TEXT,
ADD COLUMN "lastKnownRustDeskVersion" TEXT,
ADD COLUMN "lastKnownRustDeskServerHost" TEXT,
ADD COLUMN "lastKnownRustDeskApiHost" TEXT,
ADD COLUMN "lastKnownRustDeskPublicKeyHash" TEXT,
ADD COLUMN "lastRustDeskConfigSyncAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "remote_host_lastRustDeskConfigSyncAt_idx" ON "remote_host"("lastRustDeskConfigSyncAt");
