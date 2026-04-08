-- Rename legacy Zammad tables/columns to Ticket naming
DO $$
BEGIN
  IF to_regclass('"company_zammad_email"') IS NOT NULL THEN
    ALTER TABLE "company_zammad_email" RENAME TO "company_ticket_email";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"ZammadTicketCache"') IS NOT NULL THEN
    ALTER TABLE "ZammadTicketCache" RENAME TO "ticket_cache";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"ZammadSyncState"') IS NOT NULL THEN
    ALTER TABLE "ZammadSyncState" RENAME TO "ticket_sync_state";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"ticket_cache"') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'ticket_cache' AND column_name = 'zammadTicketId'
    ) THEN
      ALTER TABLE "ticket_cache" RENAME COLUMN "zammadTicketId" TO "ticketExternalId";
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'ticket_cache' AND column_name = 'createdAtZammad'
    ) THEN
      ALTER TABLE "ticket_cache" RENAME COLUMN "createdAtZammad" TO "createdAtExternal";
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'ticket_cache' AND column_name = 'updatedAtZammad'
    ) THEN
      ALTER TABLE "ticket_cache" RENAME COLUMN "updatedAtZammad" TO "updatedAtExternal";
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"ticket_cache"') IS NOT NULL THEN
    IF to_regclass('"ZammadTicketCache_zammadTicketId_key"') IS NOT NULL THEN
      ALTER INDEX "ZammadTicketCache_zammadTicketId_key" RENAME TO "ticket_cache_ticketExternalId_key";
    END IF;

    IF to_regclass('"ZammadTicketCache_updatedAtZammad_idx"') IS NOT NULL THEN
      ALTER INDEX "ZammadTicketCache_updatedAtZammad_idx" RENAME TO "ticket_cache_updatedAtExternal_idx";
    END IF;

    IF to_regclass('"ZammadTicketCache_stateId_priorityId_idx"') IS NOT NULL THEN
      ALTER INDEX "ZammadTicketCache_stateId_priorityId_idx" RENAME TO "ticket_cache_stateId_priorityId_idx";
    END IF;

    IF to_regclass('"ZammadTicketCache_ownerId_idx"') IS NOT NULL THEN
      ALTER INDEX "ZammadTicketCache_ownerId_idx" RENAME TO "ticket_cache_ownerId_idx";
    END IF;

    IF to_regclass('"ZammadTicketCache_breached_idx"') IS NOT NULL THEN
      ALTER INDEX "ZammadTicketCache_breached_idx" RENAME TO "ticket_cache_breached_idx";
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"company_ticket_email"') IS NOT NULL THEN
    IF to_regclass('"company_zammad_email_companyId_email_key"') IS NOT NULL THEN
      ALTER INDEX "company_zammad_email_companyId_email_key" RENAME TO "company_ticket_email_companyId_email_key";
    END IF;

    IF to_regclass('"company_zammad_email_companyId_isActive_idx"') IS NOT NULL THEN
      ALTER INDEX "company_zammad_email_companyId_isActive_idx" RENAME TO "company_ticket_email_companyId_isActive_idx";
    END IF;

    IF to_regclass('"company_zammad_email_email_idx"') IS NOT NULL THEN
      ALTER INDEX "company_zammad_email_email_idx" RENAME TO "company_ticket_email_email_idx";
    END IF;
  END IF;
END $$;