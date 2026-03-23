-- AlterTable
ALTER TABLE "remote_session" ADD COLUMN     "ticketId" TEXT,
ADD COLUMN     "ticketNumber" TEXT;

-- CreateIndex
CREATE INDEX "remote_session_companyId_ticketNumber_idx" ON "remote_session"("companyId", "ticketNumber");
