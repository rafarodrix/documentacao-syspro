ALTER TABLE "remote_host"
ADD COLUMN "lastHardwareIdentity" JSONB,
ADD COLUMN "lastHardwareIdentityAt" TIMESTAMP(3),
ADD COLUMN "lastDiskSnapshot" JSONB,
ADD COLUMN "lastDiskSnapshotAt" TIMESTAMP(3),
ADD COLUMN "lastSysproProcessSnapshot" JSONB,
ADD COLUMN "lastSysproProcessSnapshotAt" TIMESTAMP(3),
ADD COLUMN "lastWindowsUpdateStatus" JSONB,
ADD COLUMN "lastWindowsUpdateStatusAt" TIMESTAMP(3),
ADD COLUMN "lastRebootPending" BOOLEAN,
ADD COLUMN "lastRebootPendingAt" TIMESTAMP(3);
