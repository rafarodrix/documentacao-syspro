ALTER TABLE "task_config"
ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_config_assignedToId_fkey'
  ) THEN
    ALTER TABLE "task_config"
    ADD CONSTRAINT "task_config_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "task_config_assignedToId_idx" ON "task_config"("assignedToId");
