CREATE TABLE IF NOT EXISTS "monthly_routine_history" (
    "id" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "type" TEXT NOT NULL,
    "fromStatus" "MonthlyRoutineStatus",
    "toStatus" "MonthlyRoutineStatus",
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_routine_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "monthly_routine_history_competencyId_occurredAt_idx"
ON "monthly_routine_history"("competencyId", "occurredAt");

CREATE INDEX IF NOT EXISTS "monthly_routine_history_authorUserId_idx"
ON "monthly_routine_history"("authorUserId");

CREATE INDEX IF NOT EXISTS "monthly_routine_history_type_occurredAt_idx"
ON "monthly_routine_history"("type", "occurredAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'monthly_routine_history_competencyId_fkey'
    ) THEN
        ALTER TABLE "monthly_routine_history"
        ADD CONSTRAINT "monthly_routine_history_competencyId_fkey"
        FOREIGN KEY ("competencyId") REFERENCES "monthly_routine_competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'monthly_routine_history_authorUserId_fkey'
    ) THEN
        ALTER TABLE "monthly_routine_history"
        ADD CONSTRAINT "monthly_routine_history_authorUserId_fkey"
        FOREIGN KEY ("authorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
