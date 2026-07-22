CREATE TABLE "remote_host_critical_event" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventCode" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remote_host_critical_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "remote_host_critical_event_hostId_eventId_key" ON "remote_host_critical_event"("hostId", "eventId");
CREATE INDEX "remote_host_critical_event_hostId_occurredAt_idx" ON "remote_host_critical_event"("hostId", "occurredAt");
ALTER TABLE "remote_host_critical_event" ADD CONSTRAINT "remote_host_critical_event_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "remote_host"("id") ON DELETE CASCADE ON UPDATE CASCADE;
