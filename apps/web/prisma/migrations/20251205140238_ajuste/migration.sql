-- CreateTable
CREATE TABLE "tax_cst" (
    "id" TEXT NOT NULL,
    "cst" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "indIBSCBS" BOOLEAN NOT NULL DEFAULT false,
    "indRedBC" BOOLEAN NOT NULL DEFAULT false,
    "indRedAliq" BOOLEAN NOT NULL DEFAULT false,
    "indTransfCred" BOOLEAN NOT NULL DEFAULT false,
    "indDif" BOOLEAN NOT NULL DEFAULT false,
    "indAjusteCompet" BOOLEAN NOT NULL DEFAULT false,
    "indIBSCBSMono" BOOLEAN NOT NULL DEFAULT false,
    "indCredPresIBSZFM" BOOLEAN NOT NULL DEFAULT false,
    "publishDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_cst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_classification" (
    "id" TEXT NOT NULL,
    "cstId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pRedIBS" DECIMAL(5,2),
    "pRedCBS" DECIMAL(5,2),
    "tipoAliquota" TEXT,
    "link" TEXT,
    "indTribRegular" BOOLEAN NOT NULL DEFAULT false,
    "indCredPresOper" BOOLEAN NOT NULL DEFAULT false,
    "indEstornoCred" BOOLEAN NOT NULL DEFAULT false,
    "indNFe" BOOLEAN NOT NULL DEFAULT false,
    "indNFCe" BOOLEAN NOT NULL DEFAULT false,
    "indCTe" BOOLEAN NOT NULL DEFAULT false,
    "indNFSe" BOOLEAN NOT NULL DEFAULT false,
    "publishDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "tax_classification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_cst_cst_key" ON "tax_cst"("cst");

-- CreateIndex
CREATE UNIQUE INDEX "tax_classification_code_key" ON "tax_classification"("code");

-- CreateIndex
CREATE INDEX "tax_classification_cstId_idx" ON "tax_classification"("cstId");

-- CreateIndex
CREATE INDEX "tax_classification_code_idx" ON "tax_classification"("code");

-- AddForeignKey
ALTER TABLE "tax_classification" ADD CONSTRAINT "tax_classification_cstId_fkey" FOREIGN KEY ("cstId") REFERENCES "tax_cst"("id") ON DELETE CASCADE ON UPDATE CASCADE;
