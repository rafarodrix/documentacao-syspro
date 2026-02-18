/*
  Warnings:

  - You are about to drop the column `bairro` on the `company` table. All the data in the column will be lost.
  - You are about to drop the column `cep` on the `company` table. All the data in the column will be lost.
  - You are about to drop the column `cidade` on the `company` table. All the data in the column will be lost.
  - You are about to drop the column `complemento` on the `company` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `company` table. All the data in the column will be lost.
  - You are about to drop the column `logradouro` on the `company` table. All the data in the column will be lost.
  - You are about to drop the column `numero` on the `company` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "IndicadorIE" AS ENUM ('CONTRIBUINTE', 'ISENTO', 'NAO_CONTRIBUINTE');

-- AlterTable
ALTER TABLE "company" DROP COLUMN "bairro",
DROP COLUMN "cep",
DROP COLUMN "cidade",
DROP COLUMN "complemento",
DROP COLUMN "estado",
DROP COLUMN "logradouro",
DROP COLUMN "numero",
ADD COLUMN     "crt" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "indicadorIE" "IndicadorIE" NOT NULL DEFAULT 'NAO_CONTRIBUINTE',
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "parentCompanyId" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "address" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "pais" TEXT NOT NULL DEFAULT 'BR',
    "codigoIbgeCidade" TEXT,
    "codigoIbgeEstado" TEXT,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_razaoSocial_idx" ON "company"("razaoSocial");

-- CreateIndex
CREATE INDEX "company_cnpj_idx" ON "company"("cnpj");

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_parentCompanyId_fkey" FOREIGN KEY ("parentCompanyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
