CREATE TYPE "ErpRuntimeType" AS ENUM ('SYSPRO_SERVER', 'IIS');
CREATE TYPE "ErpProtocol" AS ENUM ('HTTP', 'HTTPS', 'TCP');
CREATE TYPE "ErpRuntimeSource" AS ENUM ('MANUAL', 'IIS_BINDING', 'PROCESS_ARGUMENT', 'CONFIG_FILE', 'WINDOWS_SERVICE');
CREATE TYPE "ErpRuntimeStatus" AS ENUM ('PENDING_CONFIGURATION', 'CONFIGURED', 'VERIFIED', 'PORT_CONFLICT', 'PORT_MISMATCH', 'RUNTIME_MISMATCH', 'UNREACHABLE', 'INVALID_CONFIGURATION');
CREATE TYPE "ErpEnvironment" AS ENUM ('PRODUCTION', 'HOMOLOGATION', 'TEST', 'DEVELOPMENT');

ALTER TABLE "erp_installation"
  ADD COLUMN "environment" "ErpEnvironment" NOT NULL DEFAULT 'PRODUCTION',
  ADD COLUMN "runtimeType" "ErpRuntimeType",
  ADD COLUMN "detectedRuntimeType" "ErpRuntimeType",
  ADD COLUMN "configuredPort" INTEGER,
  ADD COLUMN "requestedPort" INTEGER,
  ADD COLUMN "detectedPort" INTEGER,
  ADD COLUMN "protocol" "ErpProtocol",
  ADD COLUMN "hostName" TEXT,
  ADD COLUMN "iisSiteName" TEXT,
  ADD COLUMN "iisAppPoolName" TEXT,
  ADD COLUMN "iisApplicationPath" TEXT,
  ADD COLUMN "runtimeSource" "ErpRuntimeSource",
  ADD COLUMN "runtimeStatus" "ErpRuntimeStatus" NOT NULL DEFAULT 'PENDING_CONFIGURATION',
  ADD COLUMN "lastRuntimeCheckAt" TIMESTAMP(3);

CREATE INDEX "erp_installation_deviceId_configuredPort_idx" ON "erp_installation"("deviceId", "configuredPort");
CREATE INDEX "erp_installation_runtimeStatus_idx" ON "erp_installation"("runtimeStatus");
