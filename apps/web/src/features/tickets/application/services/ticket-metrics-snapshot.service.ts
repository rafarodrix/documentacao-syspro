import { createHash } from "node:crypto";
import { Role } from "@prisma/client";
import type { QueueKey } from "@dosc-syspro/core";
import type { TicketStatusCounts } from "@/components/platform/tickets/types";
import { prisma } from "@/lib/prisma";
import { getQueueCountsFromCache, getStatusCountsFromCache } from "@/features/tickets/application/services/ticket-query-counts.service";

const SNAPSHOT_KEY_PREFIX = "tickets.metrics.snapshot.v1";
const SNAPSHOT_QUEUES: QueueKey[] = ["all", "my_queue", "unassigned", "critical", "no_response"];

type TicketMetricsSnapshotPayload = {
  version: 1;
  scopeKey: string;
  cacheVersion: string | null;
  queueCounts: Record<QueueKey, number>;
  statusCountsByQueue: Record<QueueKey, TicketStatusCounts>;
  updatedAt: string;
};

type TicketMetricsScopeInput = {
  role: Role;
  email: string;
  scopedEmails: string[];
  zammadUserId: number | null;
};

function normalizeEmails(emails: string[]): string[] {
  return Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))).sort();
}

function buildScopeKey(input: TicketMetricsScopeInput): string {
  if (input.role === Role.ADMIN || input.role === Role.DEVELOPER || input.role === Role.SUPORTE) {
    return `system:${input.zammadUserId ?? "anon"}`;
  }

  const normalizedEmails = normalizeEmails(input.scopedEmails.length ? input.scopedEmails : [input.email]);
  const hash = createHash("sha1").update(normalizedEmails.join("|")).digest("hex");
  return `client:${hash}`;
}

function buildSettingKey(scopeKey: string): string {
  return `${SNAPSHOT_KEY_PREFIX}.${scopeKey}`;
}

async function getCurrentCacheVersion(): Promise<string | null> {
  const state = await prisma.zammadSyncState.findUnique({
    where: { key: "default" },
    select: { lastProcessedAt: true },
  });

  return state?.lastProcessedAt?.toISOString() ?? null;
}

function parseSnapshot(raw: string | null, scopeKey: string): TicketMetricsSnapshotPayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as TicketMetricsSnapshotPayload;
    if (parsed.version !== 1) return null;
    if (parsed.scopeKey !== scopeKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function computeSnapshot(input: TicketMetricsScopeInput, scopeKey: string, cacheVersion: string | null): Promise<TicketMetricsSnapshotPayload> {
  const base = {
    role: input.role,
    email: input.email,
    scopedEmails: input.scopedEmails,
    zammadUserId: input.zammadUserId,
  };

  const queueCounts = await getQueueCountsFromCache(base);
  const statusEntries = await Promise.all(
    SNAPSHOT_QUEUES.map(async (queue) => [queue, await getStatusCountsFromCache({ ...base, queue })] as const)
  );

  return {
    version: 1,
    scopeKey,
    cacheVersion,
    queueCounts,
    statusCountsByQueue: Object.fromEntries(statusEntries) as Record<QueueKey, TicketStatusCounts>,
    updatedAt: new Date().toISOString(),
  };
}

export async function getTicketMetricsSnapshot(input: TicketMetricsScopeInput): Promise<TicketMetricsSnapshotPayload | null> {
  const scopeKey = buildScopeKey(input);
  const [currentCacheVersion, setting] = await Promise.all([
    getCurrentCacheVersion(),
    prisma.systemSetting.findUnique({
      where: { key: buildSettingKey(scopeKey) },
      select: { value: true },
    }),
  ]);

  const snapshot = parseSnapshot(setting?.value ?? null, scopeKey);
  if (!snapshot) return null;
  if (snapshot.cacheVersion !== currentCacheVersion) return null;

  return snapshot;
}

export async function getOrCreateTicketMetricsSnapshot(input: TicketMetricsScopeInput): Promise<TicketMetricsSnapshotPayload> {
  const scopeKey = buildScopeKey(input);
  const currentCacheVersion = await getCurrentCacheVersion();
  const existing = await prisma.systemSetting.findUnique({
    where: { key: buildSettingKey(scopeKey) },
    select: { value: true },
  });

  const snapshot = parseSnapshot(existing?.value ?? null, scopeKey);
  if (snapshot && snapshot.cacheVersion === currentCacheVersion) {
    return snapshot;
  }

  const nextSnapshot = await computeSnapshot(input, scopeKey, currentCacheVersion);
  await prisma.systemSetting.upsert({
    where: { key: buildSettingKey(scopeKey) },
    create: {
      key: buildSettingKey(scopeKey),
      value: JSON.stringify(nextSnapshot),
      description: "Snapshot agregado de metricas de tickets por escopo.",
    },
    update: {
      value: JSON.stringify(nextSnapshot),
      description: "Snapshot agregado de metricas de tickets por escopo.",
    },
  });

  return nextSnapshot;
}
