ALTER TABLE "conversation"
ADD COLUMN "resolutionSummary" TEXT,
ADD COLUMN "resolutionVideoUrl" TEXT,
ADD COLUMN "releaseType" TEXT,
ADD COLUMN "releaseModule" TEXT,
ADD COLUMN "publishToReleases" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "conversation_publishToReleases_closedAt_idx"
ON "conversation"("publishToReleases", "closedAt");
