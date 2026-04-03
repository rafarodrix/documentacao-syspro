ALTER TABLE "remote_host_syspro_update"
  ADD COLUMN IF NOT EXISTS "isServerHost" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "hasClientFolder" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "hasDllFolder" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "firebirdVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "firebirdPath" TEXT;
