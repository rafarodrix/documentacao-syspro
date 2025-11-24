-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('SIMPLES_NACIONAL', 'SIMPLES_NACIONAL_EXCESSO', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI');

-- AlterEnum
ALTER TYPE "CompanyStatus" ADD VALUE 'PENDING_DOCS';

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "accountingFirmId" TEXT,
ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "estado" TEXT,
ADD COLUMN     "inscricaoEstadual" TEXT,
ADD COLUMN     "inscricaoMunicipal" TEXT,
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "regimeTributario" "TaxRegime",
ADD COLUMN     "website" TEXT;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_accountingFirmId_fkey" FOREIGN KEY ("accountingFirmId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
