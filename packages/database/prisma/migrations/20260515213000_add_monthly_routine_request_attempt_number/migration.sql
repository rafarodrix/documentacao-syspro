ALTER TABLE "monthly_routine_request"
ADD COLUMN IF NOT EXISTS "attemptNumber" INTEGER;

WITH ranked_requests AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "competencyId"
      ORDER BY COALESCE("requestedAt", "createdAt"), "id"
    ) AS next_attempt_number
  FROM "monthly_routine_request"
)
UPDATE "monthly_routine_request" AS target
SET "attemptNumber" = ranked_requests.next_attempt_number
FROM ranked_requests
WHERE target."id" = ranked_requests."id"
  AND (
    target."attemptNumber" IS NULL
    OR target."attemptNumber" <> ranked_requests.next_attempt_number
  );

ALTER TABLE "monthly_routine_request"
ALTER COLUMN "attemptNumber" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "monthly_routine_request_competencyId_attemptNumber_key"
ON "monthly_routine_request"("competencyId", "attemptNumber");
