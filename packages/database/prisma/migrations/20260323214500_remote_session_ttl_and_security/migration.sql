ALTER TABLE "remote_session"
ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE INDEX "remote_session_status_expiresAt_idx" ON "remote_session"("status", "expiresAt");
