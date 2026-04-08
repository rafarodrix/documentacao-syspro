-- AlterTable
ALTER TABLE "company_ticket_email" RENAME CONSTRAINT "company_zammad_email_pkey" TO "company_ticket_email_pkey";

-- RenameForeignKey
ALTER TABLE "company_ticket_email" RENAME CONSTRAINT "company_zammad_email_companyId_fkey" TO "company_ticket_email_companyId_fkey";
