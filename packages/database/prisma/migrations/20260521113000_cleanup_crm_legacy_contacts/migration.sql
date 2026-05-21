-- Normalize legacy CRM lead contact payloads before removing deprecated columns.
UPDATE "crm_lead"
SET "contacts" = CASE
  WHEN "contacts" IS NULL THEN
    CASE
      WHEN coalesce(nullif(btrim("contactName"), ''), nullif(btrim("contactEmail"), ''), nullif(btrim("contactPhone"), '')) IS NOT NULL THEN
        jsonb_build_array(
          jsonb_strip_nulls(
            jsonb_build_object(
              'name', coalesce(nullif(btrim("contactName"), ''), 'Contato principal'),
              'email', nullif(btrim("contactEmail"), ''),
              'phone', nullif(btrim("contactPhone"), ''),
              'isPrimary', true
            )
          )
        )
      ELSE '[]'::jsonb
    END
  WHEN jsonb_typeof("contacts"::jsonb) = 'array' THEN "contacts"::jsonb
  WHEN jsonb_typeof("contacts"::jsonb) = 'object' THEN jsonb_build_array("contacts"::jsonb)
  ELSE '[]'::jsonb
END;

ALTER TABLE "crm_lead" DROP CONSTRAINT IF EXISTS "crm_lead_contactId_fkey";
DROP INDEX IF EXISTS "crm_lead_contactId_idx";

ALTER TABLE "crm_lead"
  DROP COLUMN IF EXISTS "contactId",
  DROP COLUMN IF EXISTS "contactName",
  DROP COLUMN IF EXISTS "contactEmail",
  DROP COLUMN IF EXISTS "contactPhone";
