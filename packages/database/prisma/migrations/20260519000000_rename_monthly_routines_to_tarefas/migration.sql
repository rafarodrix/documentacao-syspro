-- Torna a migracao resiliente a reaplicacao parcial em producao.

DO $$
BEGIN
  IF to_regclass('"monthly_routine_config"') IS NOT NULL
    AND to_regclass('"task_config"') IS NULL THEN
    ALTER TABLE "monthly_routine_config" RENAME TO "task_config";
  END IF;

  IF to_regclass('"monthly_routine_competency"') IS NOT NULL
    AND to_regclass('"task"') IS NULL THEN
    ALTER TABLE "monthly_routine_competency" RENAME TO "task";
  END IF;

  IF to_regclass('"monthly_routine_history"') IS NOT NULL
    AND to_regclass('"task_history"') IS NULL THEN
    ALTER TABLE "monthly_routine_history" RENAME TO "task_history";
  END IF;

  IF to_regclass('"monthly_routine_request"') IS NOT NULL
    AND to_regclass('"task_request"') IS NULL THEN
    ALTER TABLE "monthly_routine_request" RENAME TO "task_request";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'MonthlyRoutineStatus'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'TaskStatus'
  ) THEN
    ALTER TYPE "MonthlyRoutineStatus" RENAME TO "TaskStatus";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'MonthlyRoutineRequestChannel'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'TaskRequestChannel'
  ) THEN
    ALTER TYPE "MonthlyRoutineRequestChannel" RENAME TO "TaskRequestChannel";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'MonthlyRoutineRequestStatus'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'TaskRequestStatus'
  ) THEN
    ALTER TYPE "MonthlyRoutineRequestStatus" RENAME TO "TaskRequestStatus";
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'TaskType'
  ) THEN
    CREATE TYPE "TaskType" AS ENUM ('ROTINA_MENSAL', 'TAREFA');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task'
      AND column_name = 'config_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task'
      AND column_name = 'configId'
  ) THEN
    ALTER TABLE "task" RENAME COLUMN "config_id" TO "configId";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task_request'
      AND column_name = 'competency_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task_request'
      AND column_name = 'taskId'
  ) THEN
    ALTER TABLE "task_request" RENAME COLUMN "competency_id" TO "taskId";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task_request'
      AND column_name = 'competencyId'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task_request'
      AND column_name = 'taskId'
  ) THEN
    ALTER TABLE "task_request" RENAME COLUMN "competencyId" TO "taskId";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task_history'
      AND column_name = 'competency_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task_history'
      AND column_name = 'taskId'
  ) THEN
    ALTER TABLE "task_history" RENAME COLUMN "competency_id" TO "taskId";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task_history'
      AND column_name = 'competencyId'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task_history'
      AND column_name = 'taskId'
  ) THEN
    ALTER TABLE "task_history" RENAME COLUMN "competencyId" TO "taskId";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task'
      AND column_name = 'ticket_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task'
      AND column_name = 'ticketId'
  ) THEN
    ALTER TABLE "task" RENAME COLUMN "ticket_id" TO "ticketId";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task'
      AND column_name = 'assigned_to_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'task'
      AND column_name = 'assignedToId'
  ) THEN
    ALTER TABLE "task" RENAME COLUMN "assigned_to_id" TO "assignedToId";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_config_pkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_config_pkey') THEN
    ALTER TABLE "task_config" RENAME CONSTRAINT "monthly_routine_config_pkey" TO "task_config_pkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_competency_pkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_pkey') THEN
    ALTER TABLE "task" RENAME CONSTRAINT "monthly_routine_competency_pkey" TO "task_pkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_request_pkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_request_pkey') THEN
    ALTER TABLE "task_request" RENAME CONSTRAINT "monthly_routine_request_pkey" TO "task_request_pkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_history_pkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_history_pkey') THEN
    ALTER TABLE "task_history" RENAME CONSTRAINT "monthly_routine_history_pkey" TO "task_history_pkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_config_companyId_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_config_companyId_fkey') THEN
    ALTER TABLE "task_config" RENAME CONSTRAINT "monthly_routine_config_companyId_fkey" TO "task_config_companyId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_config_clientContactId_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_config_clientContactId_fkey') THEN
    ALTER TABLE "task_config" RENAME CONSTRAINT "monthly_routine_config_clientContactId_fkey" TO "task_config_clientContactId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_config_accountingContactId_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_config_accountingContactId_fkey') THEN
    ALTER TABLE "task_config" RENAME CONSTRAINT "monthly_routine_config_accountingContactId_fkey" TO "task_config_accountingContactId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_competency_configId_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_configId_fkey') THEN
    ALTER TABLE "task" RENAME CONSTRAINT "monthly_routine_competency_configId_fkey" TO "task_configId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_competency_companyId_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_companyId_fkey') THEN
    ALTER TABLE "task" RENAME CONSTRAINT "monthly_routine_competency_companyId_fkey" TO "task_companyId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_request_competencyId_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_request_taskId_fkey') THEN
    ALTER TABLE "task_request" RENAME CONSTRAINT "monthly_routine_request_competencyId_fkey" TO "task_request_taskId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_request_companyId_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_request_companyId_fkey') THEN
    ALTER TABLE "task_request" RENAME CONSTRAINT "monthly_routine_request_companyId_fkey" TO "task_request_companyId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_request_contactId_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_request_contactId_fkey') THEN
    ALTER TABLE "task_request" RENAME CONSTRAINT "monthly_routine_request_contactId_fkey" TO "task_request_contactId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_request_requestedByUserId_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_request_requestedByUserId_fkey') THEN
    ALTER TABLE "task_request" RENAME CONSTRAINT "monthly_routine_request_requestedByUserId_fkey" TO "task_request_requestedByUserId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_history_competencyId_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_history_taskId_fkey') THEN
    ALTER TABLE "task_history" RENAME CONSTRAINT "monthly_routine_history_competencyId_fkey" TO "task_history_taskId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_routine_history_authorUserId_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_history_authorUserId_fkey') THEN
    ALTER TABLE "task_history" RENAME CONSTRAINT "monthly_routine_history_authorUserId_fkey" TO "task_history_authorUserId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_ticket_id_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_ticketId_fkey') THEN
    ALTER TABLE "task" RENAME CONSTRAINT "task_ticket_id_fkey" TO "task_ticketId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_assigned_to_id_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_assignedToId_fkey') THEN
    ALTER TABLE "task" RENAME CONSTRAINT "task_assigned_to_id_fkey" TO "task_assignedToId_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"monthly_routine_config_companyId_key"') IS NOT NULL
    AND to_regclass('"task_config_companyId_key"') IS NULL THEN
    ALTER INDEX "monthly_routine_config_companyId_key" RENAME TO "task_config_companyId_key";
  END IF;

  IF to_regclass('"monthly_routine_config_isActive_idx"') IS NOT NULL
    AND to_regclass('"task_config_isActive_idx"') IS NULL THEN
    ALTER INDEX "monthly_routine_config_isActive_idx" RENAME TO "task_config_isActive_idx";
  END IF;

  IF to_regclass('"monthly_routine_config_clientContactId_idx"') IS NOT NULL
    AND to_regclass('"task_config_clientContactId_idx"') IS NULL THEN
    ALTER INDEX "monthly_routine_config_clientContactId_idx" RENAME TO "task_config_clientContactId_idx";
  END IF;

  IF to_regclass('"monthly_routine_config_accountingContactId_idx"') IS NOT NULL
    AND to_regclass('"task_config_accountingContactId_idx"') IS NULL THEN
    ALTER INDEX "monthly_routine_config_accountingContactId_idx" RENAME TO "task_config_accountingContactId_idx";
  END IF;

  IF to_regclass('"monthly_routine_competency_configId_year_month_key"') IS NOT NULL
    AND to_regclass('"task_configId_year_month_key"') IS NULL THEN
    ALTER INDEX "monthly_routine_competency_configId_year_month_key" RENAME TO "task_configId_year_month_key";
  END IF;

  IF to_regclass('"monthly_routine_competency_companyId_year_month_idx"') IS NOT NULL
    AND to_regclass('"task_companyId_year_month_idx"') IS NULL THEN
    ALTER INDEX "monthly_routine_competency_companyId_year_month_idx" RENAME TO "task_companyId_year_month_idx";
  END IF;

  IF to_regclass('"monthly_routine_competency_status_dueDate_idx"') IS NOT NULL
    AND to_regclass('"task_status_dueDate_idx"') IS NULL THEN
    ALTER INDEX "monthly_routine_competency_status_dueDate_idx" RENAME TO "task_status_dueDate_idx";
  END IF;

  IF to_regclass('"monthly_routine_request_competencyId_requestedAt_idx"') IS NOT NULL
    AND to_regclass('"task_request_taskId_requestedAt_idx"') IS NULL THEN
    ALTER INDEX "monthly_routine_request_competencyId_requestedAt_idx" RENAME TO "task_request_taskId_requestedAt_idx";
  END IF;

  IF to_regclass('"monthly_routine_request_competencyId_attemptNumber_key"') IS NOT NULL
    AND to_regclass('"task_request_taskId_attemptNumber_key"') IS NULL THEN
    ALTER INDEX "monthly_routine_request_competencyId_attemptNumber_key" RENAME TO "task_request_taskId_attemptNumber_key";
  END IF;

  IF to_regclass('"monthly_routine_request_companyId_requestedAt_idx"') IS NOT NULL
    AND to_regclass('"task_request_companyId_requestedAt_idx"') IS NULL THEN
    ALTER INDEX "monthly_routine_request_companyId_requestedAt_idx" RENAME TO "task_request_companyId_requestedAt_idx";
  END IF;

  IF to_regclass('"monthly_routine_request_contactId_requestedAt_idx"') IS NOT NULL
    AND to_regclass('"task_request_contactId_requestedAt_idx"') IS NULL THEN
    ALTER INDEX "monthly_routine_request_contactId_requestedAt_idx" RENAME TO "task_request_contactId_requestedAt_idx";
  END IF;

  IF to_regclass('"monthly_routine_request_requestedByUserId_idx"') IS NOT NULL
    AND to_regclass('"task_request_requestedByUserId_idx"') IS NULL THEN
    ALTER INDEX "monthly_routine_request_requestedByUserId_idx" RENAME TO "task_request_requestedByUserId_idx";
  END IF;

  IF to_regclass('"monthly_routine_request_status_requestedAt_idx"') IS NOT NULL
    AND to_regclass('"task_request_status_requestedAt_idx"') IS NULL THEN
    ALTER INDEX "monthly_routine_request_status_requestedAt_idx" RENAME TO "task_request_status_requestedAt_idx";
  END IF;

  IF to_regclass('"monthly_routine_history_competencyId_occurredAt_idx"') IS NOT NULL
    AND to_regclass('"task_history_taskId_occurredAt_idx"') IS NULL THEN
    ALTER INDEX "monthly_routine_history_competencyId_occurredAt_idx" RENAME TO "task_history_taskId_occurredAt_idx";
  END IF;

  IF to_regclass('"monthly_routine_history_authorUserId_idx"') IS NOT NULL
    AND to_regclass('"task_history_authorUserId_idx"') IS NULL THEN
    ALTER INDEX "monthly_routine_history_authorUserId_idx" RENAME TO "task_history_authorUserId_idx";
  END IF;

  IF to_regclass('"monthly_routine_history_type_occurredAt_idx"') IS NOT NULL
    AND to_regclass('"task_history_type_occurredAt_idx"') IS NULL THEN
    ALTER INDEX "monthly_routine_history_type_occurredAt_idx" RENAME TO "task_history_type_occurredAt_idx";
  END IF;

  IF to_regclass('"task_ticket_id_idx"') IS NOT NULL
    AND to_regclass('"task_ticketId_idx"') IS NULL THEN
    ALTER INDEX "task_ticket_id_idx" RENAME TO "task_ticketId_idx";
  END IF;
END $$;

ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "type" "TaskType" NOT NULL DEFAULT 'ROTINA_MENSAL';
ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "ticketId" TEXT;
ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;

UPDATE "task" AS t
SET "title" = COALESCE(t."title", tc."title", 'Rotina mensal')
FROM "task_config" AS tc
WHERE t."configId" = tc."id"
  AND t."title" IS NULL;

UPDATE "task"
SET "title" = 'Rotina mensal'
WHERE "title" IS NULL;

ALTER TABLE "task" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "task" ALTER COLUMN "configId" DROP NOT NULL;
ALTER TABLE "task" ALTER COLUMN "year" DROP NOT NULL;
ALTER TABLE "task" ALTER COLUMN "month" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_ticketId_fkey'
  ) THEN
    ALTER TABLE "task"
    ADD CONSTRAINT "task_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_assignedToId_fkey'
  ) THEN
    ALTER TABLE "task"
    ADD CONSTRAINT "task_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "task_type_status_idx" ON "task"("type", "status");
CREATE INDEX IF NOT EXISTS "task_ticketId_idx" ON "task"("ticketId");
