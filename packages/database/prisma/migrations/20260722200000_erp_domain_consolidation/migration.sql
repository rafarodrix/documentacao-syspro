-- CreateEnum
CREATE TYPE "ErpCompanyRole" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateTable
CREATE TABLE "erp_installation" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "rootPath" TEXT NOT NULL,
    "canonicalRootPath" TEXT NOT NULL,
    "serverPath" TEXT,
    "executablePath" TEXT,
    "configPath" TEXT,
    "dataPath" TEXT,
    "version" TEXT,
    "serviceName" TEXT,
    "serviceStatus" TEXT,
    "processPid" INTEGER,
    "installationFingerprint" TEXT NOT NULL,
    "discoverySources" JSONB,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "erp_installation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "erp_installation_company" (
    "id" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "companyId" TEXT,
    "companyCode" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "role" "ErpCompanyRole" NOT NULL DEFAULT 'PRIMARY',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "erp_installation_company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "erp_installation_deviceId_canonicalRootPath_key" ON "erp_installation"("deviceId", "canonicalRootPath");

-- CreateIndex
CREATE UNIQUE INDEX "erp_installation_deviceId_installationFingerprint_key" ON "erp_installation"("deviceId", "installationFingerprint");

-- CreateIndex
CREATE INDEX "erp_installation_deviceId_lastSeenAt_idx" ON "erp_installation"("deviceId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "erp_installation_company_installationId_idx" ON "erp_installation_company"("installationId");

-- CreateIndex
CREATE INDEX "erp_installation_company_companyId_idx" ON "erp_installation_company"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "erp_installation_company_installationId_companyCode_key" ON "erp_installation_company"("installationId", "companyCode");

-- AddForeignKey
ALTER TABLE "erp_installation" ADD CONSTRAINT "erp_installation_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "remote_host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erp_installation_company" ADD CONSTRAINT "erp_installation_company_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "erp_installation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erp_installation_company" ADD CONSTRAINT "erp_installation_company_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
