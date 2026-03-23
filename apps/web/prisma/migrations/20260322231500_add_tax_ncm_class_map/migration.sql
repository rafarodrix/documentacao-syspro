-- CreateTable
CREATE TABLE "tax_ncm_class_map" (
    "id" TEXT NOT NULL,
    "ncm" TEXT NOT NULL,
    "classCode" TEXT,
    "cstCode" TEXT,
    "anexoCode" TEXT,
    "sourceAnexoId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_ncm_class_map_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_ncm_class_map_ncm_idx" ON "tax_ncm_class_map"("ncm");

-- CreateIndex
CREATE INDEX "tax_ncm_class_map_classCode_idx" ON "tax_ncm_class_map"("classCode");

-- CreateIndex
CREATE INDEX "tax_ncm_class_map_cstCode_idx" ON "tax_ncm_class_map"("cstCode");

-- CreateIndex
CREATE INDEX "tax_ncm_class_map_anexoCode_idx" ON "tax_ncm_class_map"("anexoCode");

-- CreateIndex
CREATE INDEX "tax_ncm_class_map_sourceAnexoId_idx" ON "tax_ncm_class_map"("sourceAnexoId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_ncm_class_map_ncm_classCode_cstCode_anexoCode_sourceAnexoId_key" ON "tax_ncm_class_map"("ncm", "classCode", "cstCode", "anexoCode", "sourceAnexoId");

-- AddForeignKey
ALTER TABLE "tax_ncm_class_map" ADD CONSTRAINT "tax_ncm_class_map_sourceAnexoId_fkey" FOREIGN KEY ("sourceAnexoId") REFERENCES "tax_anexo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
