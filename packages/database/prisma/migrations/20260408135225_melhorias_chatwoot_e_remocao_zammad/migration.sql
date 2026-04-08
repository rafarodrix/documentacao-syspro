DO $$
BEGIN
  IF to_regclass('"company_ticket_email"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'company_zammad_email_pkey'
        AND conrelid = '"company_ticket_email"'::regclass
    ) THEN
      ALTER TABLE "company_ticket_email"
      RENAME CONSTRAINT "company_zammad_email_pkey" TO "company_ticket_email_pkey";
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'company_zammad_email_companyId_fkey'
        AND conrelid = '"company_ticket_email"'::regclass
    ) THEN
      ALTER TABLE "company_ticket_email"
      RENAME CONSTRAINT "company_zammad_email_companyId_fkey" TO "company_ticket_email_companyId_fkey";
    END IF;
  ELSIF to_regclass('"company_zammad_email"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'company_zammad_email_pkey'
        AND conrelid = '"company_zammad_email"'::regclass
    ) THEN
      ALTER TABLE "company_zammad_email"
      RENAME CONSTRAINT "company_zammad_email_pkey" TO "company_ticket_email_pkey";
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'company_zammad_email_companyId_fkey'
        AND conrelid = '"company_zammad_email"'::regclass
    ) THEN
      ALTER TABLE "company_zammad_email"
      RENAME CONSTRAINT "company_zammad_email_companyId_fkey" TO "company_ticket_email_companyId_fkey";
    END IF;
  END IF;
END $$;
