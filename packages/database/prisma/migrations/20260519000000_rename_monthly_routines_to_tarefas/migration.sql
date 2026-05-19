-- Renomeia tabelas de monthly_routine_* para task_*
ALTER TABLE "monthly_routine_config" RENAME TO "task_config";
ALTER TABLE "monthly_routine_competency" RENAME TO "task";
ALTER TABLE "monthly_routine_history" RENAME TO "task_history";
ALTER TABLE "monthly_routine_request" RENAME TO "task_request";

-- Renomeia enums
ALTER TYPE "MonthlyRoutineStatus" RENAME TO "TaskStatus";
ALTER TYPE "MonthlyRoutineRequestChannel" RENAME TO "TaskRequestChannel";
ALTER TYPE "MonthlyRoutineRequestStatus" RENAME TO "TaskRequestStatus";

-- Cria enum TaskType
CREATE TYPE "TaskType" AS ENUM ('ROTINA_MENSAL', 'TAREFA');

-- Renomeia colunas competencyId -> taskId em task_request e task_history
-- (a tabela task em si nao tinha coluna competencyId)
ALTER TABLE "task_request" RENAME COLUMN "competencyId" TO "taskId";
ALTER TABLE "task_history" RENAME COLUMN "competencyId" TO "taskId";

-- Renomeia constraints de chave primaria
ALTER TABLE "task_config" RENAME CONSTRAINT "monthly_routine_config_pkey" TO "task_config_pkey";
ALTER TABLE "task" RENAME CONSTRAINT "monthly_routine_competency_pkey" TO "task_pkey";
ALTER TABLE "task_request" RENAME CONSTRAINT "monthly_routine_request_pkey" TO "task_request_pkey";
ALTER TABLE "task_history" RENAME CONSTRAINT "monthly_routine_history_pkey" TO "task_history_pkey";

-- Renomeia constraints de chave estrangeira em task_config
ALTER TABLE "task_config" RENAME CONSTRAINT "monthly_routine_config_companyId_fkey" TO "task_config_companyId_fkey";
ALTER TABLE "task_config" RENAME CONSTRAINT "monthly_routine_config_clientContactId_fkey" TO "task_config_clientContactId_fkey";
ALTER TABLE "task_config" RENAME CONSTRAINT "monthly_routine_config_accountingContactId_fkey" TO "task_config_accountingContactId_fkey";

-- Renomeia constraints de chave estrangeira em task
ALTER TABLE "task" RENAME CONSTRAINT "monthly_routine_competency_configId_fkey" TO "task_configId_fkey";
ALTER TABLE "task" RENAME CONSTRAINT "monthly_routine_competency_companyId_fkey" TO "task_companyId_fkey";

-- Renomeia constraints de chave estrangeira em task_request
ALTER TABLE "task_request" RENAME CONSTRAINT "monthly_routine_request_competencyId_fkey" TO "task_request_taskId_fkey";
ALTER TABLE "task_request" RENAME CONSTRAINT "monthly_routine_request_companyId_fkey" TO "task_request_companyId_fkey";
ALTER TABLE "task_request" RENAME CONSTRAINT "monthly_routine_request_contactId_fkey" TO "task_request_contactId_fkey";
ALTER TABLE "task_request" RENAME CONSTRAINT "monthly_routine_request_requestedByUserId_fkey" TO "task_request_requestedByUserId_fkey";

-- Renomeia constraints de chave estrangeira em task_history
ALTER TABLE "task_history" RENAME CONSTRAINT "monthly_routine_history_competencyId_fkey" TO "task_history_taskId_fkey";
ALTER TABLE "task_history" RENAME CONSTRAINT "monthly_routine_history_authorUserId_fkey" TO "task_history_authorUserId_fkey";

-- Renomeia indexes de task_config
ALTER INDEX "monthly_routine_config_companyId_key" RENAME TO "task_config_companyId_key";
ALTER INDEX "monthly_routine_config_isActive_idx" RENAME TO "task_config_isActive_idx";
ALTER INDEX "monthly_routine_config_clientContactId_idx" RENAME TO "task_config_clientContactId_idx";
ALTER INDEX "monthly_routine_config_accountingContactId_idx" RENAME TO "task_config_accountingContactId_idx";

-- Renomeia indexes de task (era monthly_routine_competency)
ALTER INDEX "monthly_routine_competency_configId_year_month_key" RENAME TO "task_configId_year_month_key";
ALTER INDEX "monthly_routine_competency_companyId_year_month_idx" RENAME TO "task_companyId_year_month_idx";
ALTER INDEX "monthly_routine_competency_status_dueDate_idx" RENAME TO "task_status_dueDate_idx";

-- Renomeia indexes de task_request
ALTER INDEX "monthly_routine_request_competencyId_requestedAt_idx" RENAME TO "task_request_taskId_requestedAt_idx";
ALTER INDEX "monthly_routine_request_competencyId_attemptNumber_key" RENAME TO "task_request_taskId_attemptNumber_key";
ALTER INDEX "monthly_routine_request_companyId_requestedAt_idx" RENAME TO "task_request_companyId_requestedAt_idx";
ALTER INDEX "monthly_routine_request_contactId_requestedAt_idx" RENAME TO "task_request_contactId_requestedAt_idx";
ALTER INDEX "monthly_routine_request_requestedByUserId_idx" RENAME TO "task_request_requestedByUserId_idx";
ALTER INDEX "monthly_routine_request_status_requestedAt_idx" RENAME TO "task_request_status_requestedAt_idx";

-- Renomeia indexes de task_history
ALTER INDEX "monthly_routine_history_competencyId_occurredAt_idx" RENAME TO "task_history_taskId_occurredAt_idx";
ALTER INDEX "monthly_routine_history_authorUserId_idx" RENAME TO "task_history_authorUserId_idx";
ALTER INDEX "monthly_routine_history_type_occurredAt_idx" RENAME TO "task_history_type_occurredAt_idx";

-- Adiciona novos campos em task (colunas em camelCase conforme convencao Prisma)
ALTER TABLE "task" ADD COLUMN "type" "TaskType" NOT NULL DEFAULT 'ROTINA_MENSAL';
ALTER TABLE "task" ADD COLUMN "title" TEXT;
ALTER TABLE "task" ADD COLUMN "description" TEXT;
ALTER TABLE "task" ADD COLUMN "ticketId" TEXT;
ALTER TABLE "task" ADD COLUMN "assignedToId" TEXT;

-- Preenche title com o valor do config (via join) para registros existentes
UPDATE "task" t
SET "title" = COALESCE(tc."title", 'Rotina mensal')
FROM "task_config" tc
WHERE t."configId" = tc."id";

-- Torna title obrigatorio apos backfill
ALTER TABLE "task" ALTER COLUMN "title" SET NOT NULL;

-- Torna configId e year/month opcionais (ROTINA_MENSAL tera, TAREFA nao precisa)
ALTER TABLE "task" ALTER COLUMN "configId" DROP NOT NULL;
ALTER TABLE "task" ALTER COLUMN "year" DROP NOT NULL;
ALTER TABLE "task" ALTER COLUMN "month" DROP NOT NULL;

-- Adiciona foreign keys para novos campos
-- Conversation usa @@map("conversation") portanto tabela minuscula
ALTER TABLE "task" ADD CONSTRAINT "task_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- User usa @@map("user")
ALTER TABLE "task" ADD CONSTRAINT "task_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Novos indices
CREATE INDEX "task_type_status_idx" ON "task"("type", "status");
CREATE INDEX "task_ticketId_idx" ON "task"("ticketId");
