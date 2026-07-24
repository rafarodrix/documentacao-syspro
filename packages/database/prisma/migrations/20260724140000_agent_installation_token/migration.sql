-- Per-installation fleet auth token (SHA-256). Issued on register; used by heartbeat/desired-state/telemetry.

ALTER TABLE "agent_installation"
ADD COLUMN IF NOT EXISTS "installationTokenHash" TEXT,
ADD COLUMN IF NOT EXISTS "installationTokenIssuedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "installationTokenLastUsedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "agent_installation_installationTokenHash_idx"
ON "agent_installation"("installationTokenHash");
