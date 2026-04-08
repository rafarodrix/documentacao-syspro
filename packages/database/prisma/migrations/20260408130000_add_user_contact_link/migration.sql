-- CreateTable
CREATE TABLE "user_contact_link" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_contact_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_contact_link_userId_companyId_key" ON "user_contact_link"("userId", "companyId");

-- CreateIndex
CREATE INDEX "user_contact_link_companyId_idx" ON "user_contact_link"("companyId");

-- CreateIndex
CREATE INDEX "user_contact_link_contactId_idx" ON "user_contact_link"("contactId");

-- AddForeignKey
ALTER TABLE "user_contact_link" ADD CONSTRAINT "user_contact_link_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_contact_link" ADD CONSTRAINT "user_contact_link_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_contact_link" ADD CONSTRAINT "user_contact_link_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "company_contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
