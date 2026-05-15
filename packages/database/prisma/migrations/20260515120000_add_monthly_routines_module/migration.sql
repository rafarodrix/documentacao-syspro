CREATE TYPE "MonthlyRoutineStatus" AS ENUM (
    'PENDING',
    'WAITING_CUSTOMER',
    'RECEIVED',
    'SENT_TO_ACCOUNTING',
    'COMPLETED',
    'OVERDUE',
    'CANCELED'
);

CREATE TYPE "MonthlyRoutineRequestChannel" AS ENUM (
    'WHATSAPP'
);

CREATE TYPE "MonthlyRoutineRequestStatus" AS ENUM (
    'SENT',
    'FAILED'
);

CREATE TABLE "monthly_routine_config" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL DEFAULT 'Envio mensal contabil',
    "dueDay" INTEGER NOT NULL DEFAULT 5,
    "reminderDays" INTEGER NOT NULL DEFAULT 3,
    "clientContactId" TEXT,
    "accountingContactId" TEXT,
    "notes" TEXT,
    "requiredDocuments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_routine_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monthly_routine_competency" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "MonthlyRoutineStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "requestedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_routine_competency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monthly_routine_request" (
    "id" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "channel" "MonthlyRoutineRequestChannel" NOT NULL DEFAULT 'WHATSAPP',
    "status" "MonthlyRoutineRequestStatus" NOT NULL,
    "targetPhone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "providerConnectionKey" TEXT,
    "errorMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_routine_request_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "monthly_routine_config_companyId_key" ON "monthly_routine_config"("companyId");
CREATE INDEX "monthly_routine_config_isActive_idx" ON "monthly_routine_config"("isActive");
CREATE INDEX "monthly_routine_config_clientContactId_idx" ON "monthly_routine_config"("clientContactId");
CREATE INDEX "monthly_routine_config_accountingContactId_idx" ON "monthly_routine_config"("accountingContactId");

CREATE UNIQUE INDEX "monthly_routine_competency_configId_year_month_key" ON "monthly_routine_competency"("configId", "year", "month");
CREATE INDEX "monthly_routine_competency_companyId_year_month_idx" ON "monthly_routine_competency"("companyId", "year", "month");
CREATE INDEX "monthly_routine_competency_status_dueDate_idx" ON "monthly_routine_competency"("status", "dueDate");
CREATE INDEX "monthly_routine_request_competencyId_requestedAt_idx" ON "monthly_routine_request"("competencyId", "requestedAt");
CREATE INDEX "monthly_routine_request_companyId_requestedAt_idx" ON "monthly_routine_request"("companyId", "requestedAt");
CREATE INDEX "monthly_routine_request_contactId_requestedAt_idx" ON "monthly_routine_request"("contactId", "requestedAt");
CREATE INDEX "monthly_routine_request_requestedByUserId_idx" ON "monthly_routine_request"("requestedByUserId");
CREATE INDEX "monthly_routine_request_status_requestedAt_idx" ON "monthly_routine_request"("status", "requestedAt");

ALTER TABLE "monthly_routine_config"
ADD CONSTRAINT "monthly_routine_config_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monthly_routine_config"
ADD CONSTRAINT "monthly_routine_config_clientContactId_fkey"
FOREIGN KEY ("clientContactId") REFERENCES "company_contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "monthly_routine_config"
ADD CONSTRAINT "monthly_routine_config_accountingContactId_fkey"
FOREIGN KEY ("accountingContactId") REFERENCES "company_contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "monthly_routine_competency"
ADD CONSTRAINT "monthly_routine_competency_configId_fkey"
FOREIGN KEY ("configId") REFERENCES "monthly_routine_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monthly_routine_competency"
ADD CONSTRAINT "monthly_routine_competency_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monthly_routine_request"
ADD CONSTRAINT "monthly_routine_request_competencyId_fkey"
FOREIGN KEY ("competencyId") REFERENCES "monthly_routine_competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monthly_routine_request"
ADD CONSTRAINT "monthly_routine_request_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monthly_routine_request"
ADD CONSTRAINT "monthly_routine_request_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "company_contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "monthly_routine_request"
ADD CONSTRAINT "monthly_routine_request_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
