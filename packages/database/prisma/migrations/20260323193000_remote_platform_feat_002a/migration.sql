ALTER TABLE "remote_host"
ADD COLUMN "description" TEXT,
ADD COLUMN "installToken" TEXT,
ADD COLUMN "machineName" TEXT,
ADD COLUMN "agentVersion" TEXT;

CREATE UNIQUE INDEX "remote_host_installToken_key" ON "remote_host"("installToken");
CREATE INDEX "remote_host_installToken_idx" ON "remote_host"("installToken");
