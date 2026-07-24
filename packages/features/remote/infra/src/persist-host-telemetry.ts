import { Prisma } from "@prisma/client";
import {
  applyErpRuntimeProbeResults,
  buildErpInstallationsFromSysproSnapshot,
  prisma,
  syncErpInstallations,
} from "@dosc-syspro/database";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry));
}

function buildMetricSample(metrics: Record<string, unknown> | null, collectedAt: Date) {
  if (!metrics) return null;
  const memoryUsedMb = typeof metrics.memoryUsedMb === "number" ? metrics.memoryUsedMb : null;
  const memoryTotalMb = typeof metrics.memoryTotalMb === "number" ? metrics.memoryTotalMb : null;
  const cpuLoadPct = typeof metrics.cpuLoadPct === "number" ? metrics.cpuLoadPct : null;
  if (memoryUsedMb == null && memoryTotalMb == null && cpuLoadPct == null) return null;
  return {
    collectedAt,
    memoryUsedMb,
    memoryTotalMb,
    memoryUsedPct: typeof metrics.memoryUsedPct === "number" ? metrics.memoryUsedPct : null,
    cpuLoadPct,
    rebootPending: typeof metrics.rebootPending === "boolean" ? metrics.rebootPending : null,
  };
}

export type HostTelemetryInventoryInput = {
  hostId: string;
  heartbeatAt: Date;
  agentVersion?: string | null;
  systemSnapshot?: unknown;
  networkSnapshot?: unknown;
  softwareSnapshot?: unknown;
  hardwareIdentity?: unknown;
  diskSnapshot?: unknown;
  sysproProcesses?: unknown;
  sysproVersions?: unknown;
  sysproRuntimeProbes?: unknown;
  windowsUpdateStatus?: unknown;
  allServicesSnapshot?: unknown;
  rebootPending?: unknown;
  agentMetrics?: unknown;
  criticalEvents?: unknown;
};

export async function persistHostTelemetryInventory(input: HostTelemetryInventoryInput): Promise<string[]> {
  const systemSnapshot = asRecord(input.systemSnapshot);
  const networkSnapshot = asRecord(input.networkSnapshot);
  const softwareSnapshot = asRecordArray(input.softwareSnapshot);
  const hardwareIdentity = asRecord(input.hardwareIdentity);
  const diskSnapshot = asRecordArray(input.diskSnapshot);
  const sysproProcesses = asRecordArray(input.sysproProcesses);
  const sysproVersions = asRecord(input.sysproVersions);
  const windowsUpdateStatus = asRecord(input.windowsUpdateStatus);
  const allServicesSnapshot = asRecordArray(input.allServicesSnapshot);
  const agentMetrics = asRecord(input.agentMetrics);
  const criticalEvents = asRecordArray(input.criticalEvents);
  const rebootPending = typeof input.rebootPending === "boolean" ? input.rebootPending : null;
  const metricSample = buildMetricSample(agentMetrics, input.heartbeatAt);

  const published: string[] = [];
  if (systemSnapshot) published.push("system");
  if (networkSnapshot) published.push("network");
  if (softwareSnapshot.length) published.push("software");
  if (hardwareIdentity) published.push("hardware");
  if (diskSnapshot.length) published.push("disks");
  if (sysproProcesses.length) published.push("critical_services");
  if (sysproVersions) published.push("syspro_versions");
  if (input.sysproRuntimeProbes) published.push("syspro_runtime_probes");
  if (windowsUpdateStatus) published.push("windows_update");
  if (allServicesSnapshot.length) published.push("all_services");
  if (agentMetrics) published.push("metrics");
  if (criticalEvents.length) published.push("critical_events");
  if (rebootPending !== null) published.push("reboot_pending");

  await prisma.$transaction(async (tx) => {
    await tx.remoteHost.update({
      where: { id: input.hostId },
      data: {
        ...(input.agentVersion ? { agentVersion: input.agentVersion } : {}),
        lastHeartbeatAt: input.heartbeatAt,
        lastHeartbeatSuccessAt: input.heartbeatAt,
        lastSystemSnapshot: systemSnapshot ? toJsonValue(systemSnapshot) : undefined,
        lastSystemSnapshotAt: systemSnapshot ? input.heartbeatAt : undefined,
        lastNetworkSnapshot: networkSnapshot ? toJsonValue(networkSnapshot) : undefined,
        lastNetworkSnapshotAt: networkSnapshot ? input.heartbeatAt : undefined,
        lastSoftwareSnapshot: softwareSnapshot.length ? toJsonValue(softwareSnapshot) : undefined,
        lastSoftwareSnapshotAt: softwareSnapshot.length ? input.heartbeatAt : undefined,
        lastHardwareIdentity: hardwareIdentity ? toJsonValue(hardwareIdentity) : undefined,
        lastHardwareIdentityAt: hardwareIdentity ? input.heartbeatAt : undefined,
        lastDiskSnapshot: diskSnapshot.length ? toJsonValue(diskSnapshot) : undefined,
        lastDiskSnapshotAt: diskSnapshot.length ? input.heartbeatAt : undefined,
        lastSysproProcessSnapshot: sysproProcesses.length ? toJsonValue(sysproProcesses) : undefined,
        lastSysproProcessSnapshotAt: sysproProcesses.length ? input.heartbeatAt : undefined,
        lastSysproVersionSnapshot: sysproVersions ? toJsonValue(sysproVersions) : undefined,
        lastSysproVersionSnapshotAt: sysproVersions ? input.heartbeatAt : undefined,
        lastWindowsUpdateStatus: windowsUpdateStatus ? toJsonValue(windowsUpdateStatus) : undefined,
        lastWindowsUpdateStatusAt: windowsUpdateStatus ? input.heartbeatAt : undefined,
        lastAllServicesSnapshot: allServicesSnapshot.length ? toJsonValue(allServicesSnapshot) : undefined,
        lastAllServicesSnapshotAt: allServicesSnapshot.length ? input.heartbeatAt : undefined,
        lastRebootPending: rebootPending ?? undefined,
        lastRebootPendingAt: rebootPending !== null ? input.heartbeatAt : undefined,
        lastAgentMetrics: metricSample && agentMetrics ? toJsonValue(agentMetrics) : undefined,
        lastAgentMetricsAt: metricSample ? input.heartbeatAt : undefined,
        status: "ACTIVE",
      } as any,
    });

    if (metricSample) {
      await tx.remoteHostMetricSample.upsert({
        where: {
          hostId_collectedAt: {
            hostId: input.hostId,
            collectedAt: metricSample.collectedAt,
          },
        },
        create: { hostId: input.hostId, ...metricSample },
        update: metricSample,
      });
    }

    if (sysproVersions) {
      await syncErpInstallations(tx, {
        hostId: input.hostId,
        heartbeatAt: input.heartbeatAt,
        installations: buildErpInstallationsFromSysproSnapshot(sysproVersions),
      });
    }

    await applyErpRuntimeProbeResults(tx, {
      hostId: input.hostId,
      heartbeatAt: input.heartbeatAt,
      probes: input.sysproRuntimeProbes,
    });

    if (criticalEvents.length > 0) {
      await tx.remoteHostCriticalEvent.createMany({
        data: criticalEvents
          .map((event) => ({
            hostId: input.hostId,
            eventId: String(event.eventId ?? "").trim(),
            source: String(event.source ?? "windows_event_log").trim().slice(0, 80),
            provider: String(event.provider ?? "unknown").trim().slice(0, 160),
            eventCode: String(event.eventCode ?? "unknown").trim().slice(0, 40),
            severity: String(event.severity ?? "warning").trim().slice(0, 24),
            message: String(event.message ?? "").trim().slice(0, 4000),
            metadata: toJsonValue(event),
            occurredAt: new Date(String(event.occurredAt ?? input.heartbeatAt.toISOString())),
          }))
          .filter((event) => event.eventId.length > 0 && !Number.isNaN(event.occurredAt.getTime())),
        skipDuplicates: true,
      });
    }
  });

  return published;
}
