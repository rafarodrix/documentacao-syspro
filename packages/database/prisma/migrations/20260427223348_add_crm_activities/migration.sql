-- CreateEnum
CREATE TYPE "CrmActivityType" AS ENUM ('NOTE', 'CALL', 'MEETING', 'EMAIL', 'WHATSAPP', 'SYSTEM_EVENT');

-- CreateEnum
CREATE TYPE "CrmTaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');

-- CreateTable
CREATE TABLE "crm_activity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "CrmActivityType" NOT NULL DEFAULT 'NOTE',
    "title" TEXT,
    "body" TEXT,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_task" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "CrmTaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "assigneeUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_activity_leadId_createdAt_idx" ON "crm_activity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "crm_activity_authorUserId_idx" ON "crm_activity"("authorUserId");

-- CreateIndex
CREATE INDEX "crm_task_leadId_status_idx" ON "crm_task"("leadId", "status");

-- CreateIndex
CREATE INDEX "crm_task_assigneeUserId_status_idx" ON "crm_task"("assigneeUserId", "status");

-- CreateIndex
CREATE INDEX "crm_task_dueDate_idx" ON "crm_task"("dueDate");

-- AddForeignKey
ALTER TABLE "crm_activity" ADD CONSTRAINT "crm_activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activity" ADD CONSTRAINT "crm_activity_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_task" ADD CONSTRAINT "crm_task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_task" ADD CONSTRAINT "crm_task_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
