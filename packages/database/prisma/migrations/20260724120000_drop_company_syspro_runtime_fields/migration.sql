-- Runtime Syspro/IIS now lives on ErpInstallation (+ RemoteHostSysproUpdate).
-- Company-level server fields are obsolete ownership/config leftovers.

ALTER TABLE "company"
DROP COLUMN IF EXISTS "serverType",
DROP COLUMN IF EXISTS "serverPort",
DROP COLUMN IF EXISTS "serverHost",
DROP COLUMN IF EXISTS "serverProtocol",
DROP COLUMN IF EXISTS "iisIsapiPath",
DROP COLUMN IF EXISTS "installationDirectory";

DROP TYPE IF EXISTS "CompanyServerType";
DROP TYPE IF EXISTS "CompanyServerProtocol";
