-- CreateEnum
CREATE TYPE "CompanySegment" AS ENUM ('AUTO_PECAS', 'COMERCIAL', 'FARMACIA', 'PANIFICACAO', 'AGRICOLA', 'PETSHOP', 'ESQUADRIAS', 'MARMORARIA', 'ASSISTENCIA');

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "segment" "CompanySegment";
