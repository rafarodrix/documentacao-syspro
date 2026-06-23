/*
  Warning:

  - This migration will fail if "remote_host" already contains duplicate non-null
    values in "agentExternalId". Clean the duplicated hosts before applying it.
*/

-- DropIndex
DROP INDEX "remote_host_agentExternalId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "remote_host_agentExternalId_key" ON "remote_host"("agentExternalId");
