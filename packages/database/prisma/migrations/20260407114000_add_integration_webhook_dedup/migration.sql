-- CreateTable
CREATE TABLE "integration_webhook_dedup" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "instanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_webhook_dedup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_webhook_dedup_provider_eventKey_key" ON "integration_webhook_dedup"("provider", "eventKey");

-- CreateIndex
CREATE INDEX "integration_webhook_dedup_provider_createdAt_idx" ON "integration_webhook_dedup"("provider", "createdAt");
