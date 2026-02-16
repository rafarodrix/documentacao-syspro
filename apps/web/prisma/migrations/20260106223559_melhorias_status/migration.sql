-- CreateEnum
CREATE TYPE "SefazServiceType" AS ENUM ('NFE', 'NFCE');

-- CreateEnum
CREATE TYPE "SefazStatusType" AS ENUM ('ONLINE', 'UNSTABLE', 'OFFLINE');

-- CreateTable
CREATE TABLE "SefazStatus" (
    "id" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "service" "SefazServiceType" NOT NULL,
    "status" "SefazStatusType" NOT NULL,
    "latency" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SefazStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SefazStatus_uf_service_createdAt_idx" ON "SefazStatus"("uf", "service", "createdAt");
