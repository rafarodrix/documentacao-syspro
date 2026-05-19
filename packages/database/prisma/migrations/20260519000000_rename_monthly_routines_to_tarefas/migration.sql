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

-- Renomeia colunas em task (era competency)
ALTER TABLE "task" RENAME COLUMN "competency_id" TO "task_id";

-- Renomeia colunas em task_history (era monthly_routine_history)
ALTER TABLE "task_history" RENAME COLUMN "competency_id" TO "task_id";

-- Renomeia colunas em task_request (era monthly_routine_request)
ALTER TABLE "task_request" RENAME COLUMN "competency_id" TO "task_id";

-- Adiciona novos campos em task
ALTER TABLE "task" ADD COLUMN "type" "TaskType" NOT NULL DEFAULT 'ROTINA_MENSAL';
ALTER TABLE "task" ADD COLUMN "title" TEXT;
ALTER TABLE "task" ADD COLUMN "description" TEXT;
ALTER TABLE "task" ADD COLUMN "ticket_id" TEXT;
ALTER TABLE "task" ADD COLUMN "assigned_to_id" TEXT;

-- Preenche title com o valor do config (via join) para registros existentes
UPDATE "task" t
SET "title" = COALESCE(tc."title", 'Rotina mensal')
FROM "task_config" tc
WHERE t."config_id" = tc."id";

-- Torna configId e year/month opcionais (ROTINA_MENSAL terá, TAREFA não precisa)
ALTER TABLE "task" ALTER COLUMN "config_id" DROP NOT NULL;
ALTER TABLE "task" ALTER COLUMN "year" DROP NOT NULL;
ALTER TABLE "task" ALTER COLUMN "month" DROP NOT NULL;

-- Adiciona foreign keys para novos campos
ALTER TABLE "task" ADD CONSTRAINT "task_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "task" ADD CONSTRAINT "task_assigned_to_id_fkey"
  FOREIGN KEY ("assigned_to_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Novos índices
CREATE INDEX "task_type_status_idx" ON "task"("type", "status");
CREATE INDEX "task_ticket_id_idx" ON "task"("ticket_id");
