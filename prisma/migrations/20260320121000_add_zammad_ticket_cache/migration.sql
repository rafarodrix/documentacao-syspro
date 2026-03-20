-- CreateTable
CREATE TABLE "ZammadTicketCache" (
    "id" TEXT NOT NULL,
    "zammadTicketId" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT,
    "stateId" INTEGER,
    "priorityId" INTEGER,
    "groupName" TEXT,
    "customer" TEXT,
    "ownerId" INTEGER,
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "escalationAt" TIMESTAMP(3),
    "breached" BOOLEAN NOT NULL DEFAULT false,
    "createdAtZammad" TIMESTAMP(3) NOT NULL,
    "updatedAtZammad" TIMESTAMP(3) NOT NULL,
    "lastEventType" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ZammadTicketCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZammadSyncState" (
    "key" TEXT NOT NULL,
    "lastWebhookAt" TIMESTAMP(3),
    "lastWorkerSyncAt" TIMESTAMP(3),
    "lastProcessedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ZammadSyncState_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZammadTicketCache_zammadTicketId_key" ON "ZammadTicketCache"("zammadTicketId");

-- CreateIndex
CREATE INDEX "ZammadTicketCache_updatedAtZammad_idx" ON "ZammadTicketCache"("updatedAtZammad");

-- CreateIndex
CREATE INDEX "ZammadTicketCache_stateId_priorityId_idx" ON "ZammadTicketCache"("stateId", "priorityId");

-- CreateIndex
CREATE INDEX "ZammadTicketCache_ownerId_idx" ON "ZammadTicketCache"("ownerId");

-- CreateIndex
CREATE INDEX "ZammadTicketCache_breached_idx" ON "ZammadTicketCache"("breached");
