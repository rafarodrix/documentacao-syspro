ALTER TABLE "user"
ADD COLUMN "contactId" TEXT;

CREATE INDEX "user_contactId_idx" ON "user"("contactId");

ALTER TABLE "user"
ADD CONSTRAINT "user_contactId_fkey"
FOREIGN KEY ("contactId")
REFERENCES "company_contact"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
