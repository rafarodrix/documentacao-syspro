CREATE TYPE "CompanyServerType" AS ENUM ('SYSPRO_SERVER', 'IIS');
CREATE TYPE "CompanyServerProtocol" AS ENUM ('HTTP', 'HTTPS');
CREATE TYPE "CompanyRemoteConnectionType" AS ENUM ('DDNS_NOIP', 'RADMIN_VPN');

ALTER TABLE "company"
ADD COLUMN "serverType" "CompanyServerType" NOT NULL DEFAULT 'SYSPRO_SERVER',
ADD COLUMN "serverPort" INTEGER NOT NULL DEFAULT 1234,
ADD COLUMN "serverHost" TEXT NOT NULL DEFAULT 'sysproerp (localhost)',
ADD COLUMN "serverProtocol" "CompanyServerProtocol" NOT NULL DEFAULT 'HTTP',
ADD COLUMN "iisIsapiPath" TEXT DEFAULT 'SYSPROSERVERISAPI.DLL',
ADD COLUMN "installationDirectory" TEXT,
ADD COLUMN "remoteConnectionType" "CompanyRemoteConnectionType",
ADD COLUMN "remoteConnectionDetails" TEXT;
