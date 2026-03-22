-- CreateTable
CREATE TABLE "tax_cred_presumido" (
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

    CONSTRAINT "tax_cred_presumido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_cred_presumido_externalKey_key" ON "tax_cred_presumido"("externalKey");

-- CreateIndex
CREATE INDEX "tax_cred_presumido_code_idx" ON "tax_cred_presumido"("code");

-- CreateIndex
CREATE INDEX "tax_cred_presumido_category_idx" ON "tax_cred_presumido"("category");
