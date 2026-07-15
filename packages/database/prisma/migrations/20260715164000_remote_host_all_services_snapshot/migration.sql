ALTER TABLE "remote_host"
ADD COLUMN "lastAllServicesSnapshot" JSONB,
ADD COLUMN "lastAllServicesSnapshotAt" TIMESTAMP(3);
