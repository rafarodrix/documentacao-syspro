-- CreateTable
CREATE TABLE "tax_anexo_ncm" (
    "id" TEXT NOT NULL,
    "ncm" TEXT NOT NULL,
    "anexoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_anexo_ncm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_anexo_ncm_anexoId_ncm_key" ON "tax_anexo_ncm"("anexoId", "ncm");

-- CreateIndex
CREATE INDEX "tax_anexo_ncm_ncm_idx" ON "tax_anexo_ncm"("ncm");

-- CreateIndex
CREATE INDEX "tax_anexo_ncm_anexoId_idx" ON "tax_anexo_ncm"("anexoId");

-- AddForeignKey
ALTER TABLE "tax_anexo_ncm" ADD CONSTRAINT "tax_anexo_ncm_anexoId_fkey" FOREIGN KEY ("anexoId") REFERENCES "tax_anexo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
