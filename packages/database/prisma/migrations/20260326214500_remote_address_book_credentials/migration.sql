-- CreateEnum
CREATE TYPE "RemoteAddressBookCredentialScope" AS ENUM ('GLOBAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "RemoteAddressBookCredentialStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "remote_address_book_credential" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "integrationKey" TEXT NOT NULL,
    "scope" "RemoteAddressBookCredentialScope" NOT NULL DEFAULT 'GLOBAL',
    "status" "RemoteAddressBookCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "companyId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "tokenPreview" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "rotatedFromId" TEXT,
    "createdByUserId" TEXT,
    "rotatedByUserId" TEXT,
    "revokedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remote_address_book_credential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "remote_address_book_credential_tokenHash_key" ON "remote_address_book_credential"("tokenHash");

-- CreateIndex
CREATE INDEX "remote_address_book_credential_status_scope_companyId_idx" ON "remote_address_book_credential"("status", "scope", "companyId");

-- CreateIndex
CREATE INDEX "remote_address_book_credential_integrationKey_status_idx" ON "remote_address_book_credential"("integrationKey", "status");

-- CreateIndex
CREATE INDEX "remote_address_book_credential_expiresAt_idx" ON "remote_address_book_credential"("expiresAt");

-- AddForeignKey
ALTER TABLE "remote_address_book_credential" ADD CONSTRAINT "remote_address_book_credential_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remote_address_book_credential" ADD CONSTRAINT "remote_address_book_credential_rotatedFromId_fkey" FOREIGN KEY ("rotatedFromId") REFERENCES "remote_address_book_credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remote_address_book_credential" ADD CONSTRAINT "remote_address_book_credential_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remote_address_book_credential" ADD CONSTRAINT "remote_address_book_credential_rotatedByUserId_fkey" FOREIGN KEY ("rotatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remote_address_book_credential" ADD CONSTRAINT "remote_address_book_credential_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
