ALTER TABLE "remote_host"
ADD COLUMN "lastSystemSnapshot" JSONB,
ADD COLUMN "lastSystemSnapshotAt" TIMESTAMP(3),
ADD COLUMN "lastNetworkSnapshot" JSONB,
ADD COLUMN "lastNetworkSnapshotAt" TIMESTAMP(3),
ADD COLUMN "lastSoftwareSnapshot" JSONB,
ADD COLUMN "lastSoftwareSnapshotAt" TIMESTAMP(3),
ADD COLUMN "lastAgentMetrics" JSONB,
ADD COLUMN "lastAgentMetricsAt" TIMESTAMP(3);

