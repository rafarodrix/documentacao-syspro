CREATE TABLE "remote_host_syspro_update" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "companyId" TEXT,
    "companyLabel" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "lastFileWriteAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remote_host_syspro_update_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "remote_host_syspro_update_hostId_companyLabel_path_key"
ON "remote_host_syspro_update"("hostId", "companyLabel", "path");

CREATE INDEX "remote_host_syspro_update_hostId_lastHeartbeatAt_idx"
ON "remote_host_syspro_update"("hostId", "lastHeartbeatAt");

CREATE INDEX "remote_host_syspro_update_companyId_idx"
ON "remote_host_syspro_update"("companyId");

ALTER TABLE "remote_host_syspro_update"
ADD CONSTRAINT "remote_host_syspro_update_hostId_fkey"
FOREIGN KEY ("hostId") REFERENCES "remote_host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "remote_host_syspro_update"
ADD CONSTRAINT "remote_host_syspro_update_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
