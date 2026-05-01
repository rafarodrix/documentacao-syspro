-- AlterTable
ALTER TABLE "remote_host" ADD COLUMN "lastSysproVersionSnapshot" JSONB;
ALTER TABLE "remote_host" ADD COLUMN "lastSysproVersionSnapshotAt" TIMESTAMP(3);
