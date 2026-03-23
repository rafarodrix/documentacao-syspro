-- CreateEnum
CREATE TYPE "RemoteHostStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "RemoteSessionStatus" AS ENUM ('REQUESTED', 'STARTED', 'ENDED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "remote_host" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" TEXT,
    "provider" TEXT,
    "agentExternalId" TEXT,
    "status" "RemoteHostStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remote_host_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remote_session" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "startedByUserId" TEXT,
    "status" "RemoteSessionStatus" NOT NULL DEFAULT 'REQUESTED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remote_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "remote_host_companyId_status_idx" ON "remote_host"("companyId", "status");

-- CreateIndex
CREATE INDEX "remote_host_agentExternalId_idx" ON "remote_host"("agentExternalId");

-- CreateIndex
CREATE INDEX "remote_session_companyId_status_idx" ON "remote_session"("companyId", "status");

-- CreateIndex
CREATE INDEX "remote_session_hostId_status_idx" ON "remote_session"("hostId", "status");

-- CreateIndex
CREATE INDEX "remote_session_requestedByUserId_idx" ON "remote_session"("requestedByUserId");

-- AddForeignKey
ALTER TABLE "remote_host" ADD CONSTRAINT "remote_host_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remote_session" ADD CONSTRAINT "remote_session_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remote_session" ADD CONSTRAINT "remote_session_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "remote_host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remote_session" ADD CONSTRAINT "remote_session_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remote_session" ADD CONSTRAINT "remote_session_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "tax_ncm_class_map_ncm_classCode_cstCode_anexoCode_sourceAnexoId" RENAME TO "tax_ncm_class_map_ncm_classCode_cstCode_anexoCode_sourceAne_key";
