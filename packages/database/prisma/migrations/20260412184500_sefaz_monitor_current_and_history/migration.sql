ALTER TABLE "SefazStatus"
ADD COLUMN "statusCode" INTEGER,
ADD COLUMN "errorMessage" TEXT,
ADD COLUMN "checkedAt" TIMESTAMP(3);

UPDATE "SefazStatus"
SET "checkedAt" = "createdAt"
WHERE "checkedAt" IS NULL;

ALTER TABLE "SefazStatus"
ALTER COLUMN "checkedAt" SET NOT NULL;

CREATE INDEX "SefazStatus_checkedAt_idx" ON "SefazStatus"("checkedAt");

CREATE TABLE "SefazStatusCurrent" (
    "id" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "service" "SefazServiceType" NOT NULL,
    "status" "SefazStatusType" NOT NULL,
    "latency" INTEGER NOT NULL,
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SefazStatusCurrent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SefazStatusCurrent_uf_service_key" ON "SefazStatusCurrent"("uf", "service");
CREATE INDEX "SefazStatusCurrent_checkedAt_idx" ON "SefazStatusCurrent"("checkedAt");

INSERT INTO "SefazStatusCurrent" (
    "id",
    "uf",
    "service",
    "status",
    "latency",
    "statusCode",
    "errorMessage",
    "checkedAt",
    "changedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    md5(random()::text || clock_timestamp()::text || latest."uf" || latest."service"::text),
    latest."uf",
    latest."service",
    latest."status",
    latest."latency",
    latest."statusCode",
    latest."errorMessage",
    latest."checkedAt",
    latest."createdAt",
    latest."createdAt",
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT ON ("uf", "service")
        "uf",
        "service",
        "status",
        "latency",
        "statusCode",
        "errorMessage",
        "checkedAt",
        "createdAt"
    FROM "SefazStatus"
    ORDER BY "uf", "service", "createdAt" DESC
) AS latest;
