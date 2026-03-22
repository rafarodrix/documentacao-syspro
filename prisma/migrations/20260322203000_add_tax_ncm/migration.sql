-- CreateTable
CREATE TABLE "tax_ncm" (
    "id" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "actType" TEXT,
    "actNumber" TEXT,
    "actYear" TEXT,
    "replacedByCode" TEXT,
    "raw" JSONB NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_ncm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_ncm_externalKey_key" ON "tax_ncm"("externalKey");

-- CreateIndex
CREATE UNIQUE INDEX "tax_ncm_code_key" ON "tax_ncm"("code");

-- CreateIndex
CREATE INDEX "tax_ncm_code_idx" ON "tax_ncm"("code");

-- CreateIndex
CREATE INDEX "tax_ncm_replacedByCode_idx" ON "tax_ncm"("replacedByCode");
