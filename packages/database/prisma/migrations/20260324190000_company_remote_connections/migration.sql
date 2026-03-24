ALTER TABLE "company"
ADD COLUMN "remoteConnections" JSONB;

ALTER TABLE "company"
ALTER COLUMN "serverHost" SET DEFAULT 'localhost';

UPDATE "company"
SET "remoteConnections" = CASE
  WHEN "remoteConnectionType" IS NOT NULL AND COALESCE(NULLIF(TRIM("remoteConnectionDetails"), ''), '') <> ''
    THEN jsonb_build_array(
      jsonb_build_object(
        'type', "remoteConnectionType"::text,
        'details', TRIM("remoteConnectionDetails")
      )
    )
  WHEN "remoteConnectionType" IS NOT NULL
    THEN jsonb_build_array(
      jsonb_build_object(
        'type', "remoteConnectionType"::text,
        'details', ''
      )
    )
  ELSE '[]'::jsonb
END
WHERE "remoteConnections" IS NULL;
