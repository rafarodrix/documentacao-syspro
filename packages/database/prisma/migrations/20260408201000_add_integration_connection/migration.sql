-- CreateEnum
CREATE TYPE "IntegrationConnectionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "integration_connection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "evolutionApiUrl" TEXT NOT NULL,
    "evolutionApiKeyEncrypted" TEXT NOT NULL,
    "evolutionInstance" TEXT NOT NULL,
    "evolutionInstanceId" TEXT,
    "evolutionWebhookSecretEncrypted" TEXT,
    "chatwootUrl" TEXT NOT NULL,
    "chatwootApiTokenEncrypted" TEXT NOT NULL,
    "chatwootAccountId" TEXT NOT NULL,
    "chatwootInboxId" TEXT,
    "chatwootInboxIdentifier" TEXT,
    "chatwootWebhookSecretEncrypted" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_connection_companyId_name_key" ON "integration_connection"("companyId", "name");

-- CreateIndex
CREATE INDEX "integration_connection_status_companyId_idx" ON "integration_connection"("status", "companyId");

-- CreateIndex
CREATE INDEX "integration_connection_evolutionInstance_idx" ON "integration_connection"("evolutionInstance");

-- CreateIndex
CREATE INDEX "integration_connection_evolutionInstanceId_idx" ON "integration_connection"("evolutionInstanceId");

-- AddForeignKey
ALTER TABLE "integration_connection" ADD CONSTRAINT "integration_connection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

