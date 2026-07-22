CREATE TABLE "remote_host_metric_sample" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "cpuLoadPct" DOUBLE PRECISION,
    "memoryUsedPct" DOUBLE PRECISION,
    "memoryUsedMB" INTEGER,
    "memoryTotalMB" INTEGER,

    CONSTRAINT "remote_host_metric_sample_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "remote_host_metric_sample_hostId_collectedAt_key"
ON "remote_host_metric_sample"("hostId", "collectedAt");

CREATE INDEX "remote_host_metric_sample_hostId_collectedAt_idx"
ON "remote_host_metric_sample"("hostId", "collectedAt");

ALTER TABLE "remote_host_metric_sample"
ADD CONSTRAINT "remote_host_metric_sample_hostId_fkey"
FOREIGN KEY ("hostId") REFERENCES "remote_host"("id") ON DELETE CASCADE ON UPDATE CASCADE;
