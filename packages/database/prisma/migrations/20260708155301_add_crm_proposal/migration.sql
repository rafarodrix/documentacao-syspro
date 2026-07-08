/*
  Warnings:

  - You are about to drop the column `cpf` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `jobTitle` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `user` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- DropIndex
DROP INDEX "company_searchText_trgm_idx";

-- DropIndex
DROP INDEX "company_contact_searchText_trgm_idx";

-- DropIndex
DROP INDEX "conversation_searchText_trgm_idx";

-- DropIndex
DROP INDEX "user_cpf_idx";

-- DropIndex
DROP INDEX "user_cpf_key";

-- AlterTable
ALTER TABLE "chatwoot_csat_rating" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "cpf",
DROP COLUMN "jobTitle",
DROP COLUMN "phone";

-- CreateTable
CREATE TABLE "crm_proposal" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "setupValue" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "recurringValue" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contractId" TEXT,

    CONSTRAINT "crm_proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_proposal_item" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "quantityLimit" INTEGER,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "crm_proposal_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_proposal_leadId_key" ON "crm_proposal"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_proposal_contractId_key" ON "crm_proposal"("contractId");

-- AddForeignKey
ALTER TABLE "crm_proposal" ADD CONSTRAINT "crm_proposal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_proposal_item" ADD CONSTRAINT "crm_proposal_item_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "crm_proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
