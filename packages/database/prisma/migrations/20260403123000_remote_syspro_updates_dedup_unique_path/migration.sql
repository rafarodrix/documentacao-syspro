-- DEDUP remote_host_syspro_update by hostId + normalized path

-- 1) Backup duplicates before deletion
CREATE TABLE IF NOT EXISTS "remote_host_syspro_update_dup_backup" (
  LIKE "remote_host_syspro_update" INCLUDING ALL
);

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "hostId", LOWER(TRIM("path"))
      ORDER BY
        COALESCE("lastHeartbeatAt", "updatedAt", "createdAt") DESC,
        "updatedAt" DESC,
        "createdAt" DESC,
        "id" DESC
    ) AS rn
  FROM "remote_host_syspro_update"
),
rows_to_backup AS (
  SELECT t.*
  FROM "remote_host_syspro_update" t
  JOIN ranked r ON r."id" = t."id"
  WHERE r.rn > 1
)
INSERT INTO "remote_host_syspro_update_dup_backup"
SELECT * FROM rows_to_backup;

-- 2) Delete duplicates, keeping the newest row per hostId+path
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "hostId", LOWER(TRIM("path"))
      ORDER BY
        COALESCE("lastHeartbeatAt", "updatedAt", "createdAt") DESC,
        "updatedAt" DESC,
        "createdAt" DESC,
        "id" DESC
    ) AS rn
  FROM "remote_host_syspro_update"
)
DELETE FROM "remote_host_syspro_update" t
USING ranked r
WHERE t."id" = r."id"
  AND r.rn > 1;

-- 3) Normalize path whitespace to avoid semantically-equal duplicates
UPDATE "remote_host_syspro_update"
SET "path" = TRIM("path")
WHERE "path" <> TRIM("path");

-- 4) Enforce uniqueness by host + case-insensitive path
CREATE UNIQUE INDEX IF NOT EXISTS "ux_remote_host_syspro_update_host_path_norm"
  ON "remote_host_syspro_update" ("hostId", LOWER("path"));