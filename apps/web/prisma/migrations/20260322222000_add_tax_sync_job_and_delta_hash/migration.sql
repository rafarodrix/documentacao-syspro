-- CreateEnum
CREATE TYPE "TaxSyncStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "tax_cst" ADD COLUMN "payloadHash" TEXT;

-- AlterTable
ALTER TABLE "tax_classification" ADD COLUMN "payloadHash" TEXT;

-- AlterTable
ALTER TABLE "tax_anexo" ADD COLUMN "payloadHash" TEXT;

-- AlterTable
ALTER TABLE "tax_cred_presumido" ADD COLUMN "payloadHash" TEXT;

-- AlterTable
ALTER TABLE "tax_ncm" ADD COLUMN "payloadHash" TEXT;

-- CreateTable
CREATE TABLE "tax_sync_job" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "source" TEXT,
    "status" "TaxSyncStatus" NOT NULL DEFAULT 'PENDING',
    "snapshotVersion" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3),
    "payloadHash" TEXT,
    "totalChunks" INTEGER NOT NULL DEFAULT 0,
    "currentChunk" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "insertedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_sync_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_sync_job_mode_createdAt_idx" ON "tax_sync_job"("mode", "createdAt");

-- CreateIndex
CREATE INDEX "tax_sync_job_status_createdAt_idx" ON "tax_sync_job"("status", "createdAt");
