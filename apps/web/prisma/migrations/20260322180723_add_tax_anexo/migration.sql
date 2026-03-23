-- AlterTable
ALTER TABLE "tax_classification" ADD COLUMN     "anexo" TEXT,
ADD COLUMN     "indBPe" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indBPeTA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indBPeTM" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indCTeOS" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indDERE" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indNF3e" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indNFABI" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indNFAg" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indNFCom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indNFGas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indNFSVIA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monofasiaDiferimento" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monofasiaPadrao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monofasiaRetidaAnt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monofasiaSujeitaRetencao" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "tax_anexo" (
    "id" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "code" TEXT,
    "title" TEXT,
    "description" TEXT,
    "category" TEXT,
    "publishDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "raw" JSONB NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_anexo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_anexo_externalKey_key" ON "tax_anexo"("externalKey");

-- CreateIndex
CREATE INDEX "tax_anexo_code_idx" ON "tax_anexo"("code");

-- CreateIndex
CREATE INDEX "tax_anexo_category_idx" ON "tax_anexo"("category");
