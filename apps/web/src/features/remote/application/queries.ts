import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { getRemoteModuleSettingsSnapshot } from "@/features/remote/application/module-settings";
import { hashRustDeskPublicKey } from "@/features/remote/application/rustdesk-sync";
import { resolveRemoteOperationalStatus } from "@/features/remote/domain/operational-status";
import type {
  RemoteConfiguredHostItem,
  RemoteDiscoveredHostItem,
  RemoteHostDetails,
  RemotePlatformDirectory,
  RemotePlatformOverview,
  RemoteAgentInstallStage,
  RemoteAgentLifecycleStatus,
} from "@/features/remote/domain/model";
import { Prisma } from "@prisma/client";

type RemoteConnectionItem = {
  type: "DDNS_NOIP" | "RADMIN_VPN";
  details: string;
};

function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { companyId: { in: companyIds.length ? companyIds : ["__none__"] } };
}

function mapHostDescription(input: {
  description: string | null;
  environment: string | null;
  provider: string | null;
  rustdeskId: string | null;
  machineName: string | null;
  agentVersion: string | null;
}) {
  return [
    input.description ? input.description : null,
    input.environment ? `Ambiente: ${input.environment}` : null,
    input.provider ? `Provider: ${input.provider}` : null,
    input.rustdeskId ? `RustDesk ID: ${input.rustdeskId}` : null,
    input.machineName ? `Maquina: ${input.machineName}` : null,
    input.agentVersion ? `Agente: ${input.agentVersion}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function resolveAgentLifecycleStatus(input: {
  installToken: string | null;
  rustdeskId: string | null;
  lastHeartbeatAt: Date | null;
}): RemoteAgentLifecycleStatus {
  if (!input.installToken || !input.rustdeskId) {
    return "PENDING_INSTALL";
  }

  if (!input.lastHeartbeatAt) {
    return "INSTALLED";
  }

  const diffMinutes = Math.floor((Date.now() - input.lastHeartbeatAt.getTime()) / 60000);
  if (diffMinutes <= 5) return "ONLINE";
  if (diffMinutes <= 60) return "STALE";
  return "UNLINKED";
}

function buildInstallStages(input: {
  installToken: string | null;
  rustdeskId: string | null;
  lastHeartbeatAt: Date | null;
}): RemoteAgentInstallStage[] {
  const stages: RemoteAgentInstallStage[] = [];

  if (input.installToken) stages.push("TOKEN_READY");
  if (input.installToken) stages.push("SCRIPT_READY");
  if (input.rustdeskId) stages.push("RUSTDESK_LINKED");
  if (input.lastHeartbeatAt) stages.push("HEARTBEAT_OK");

  return stages;
}

function mapDirectoryItem(host: {
  id: string;
  companyId: string;
  name: string;
  installationCompanies?: string[];
  environment: string | null;
  provider: string | null;
  description: string | null;
  notes: string | null;
  agentExternalId: string | null;
  installToken: string | null;
  machineName: string | null;
  agentVersion: string | null;
  serviceStatus?: string | null;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  lastHeartbeatAt: Date | null;
  lastHeartbeatSuccessAt?: Date | null;
  lastHeartbeatErrorAt?: Date | null;
  lastHeartbeatErrorMessage?: string | null;
  lastKnownIp?: string | null;
  lastRegisterAt?: Date | null;
  lastRegisterSource?: string | null;
  agentTokenIssuedAt?: Date | null;
  agentTokenLastUsedAt?: Date | null;
  lastKnownRustDeskAlias?: string | null;
  lastKnownRustDeskVersion?: string | null;
  lastKnownRustDeskServerHost?: string | null;
  lastKnownRustDeskApiHost?: string | null;
  lastKnownRustDeskPublicKeyHash?: string | null;
  lastRustDeskConfigSyncAt?: Date | null;
  company: { nomeFantasia: string | null; razaoSocial: string };
  sessions: Array<{ createdAt: Date; status: string; ticketNumber: string | null }>;
}): RemoteConfiguredHostItem {
  const companyName = host.company.nomeFantasia ?? host.company.razaoSocial;
  const openSessionCount = host.sessions.filter((session) => session.status === "REQUESTED" || session.status === "STARTED").length;
  const lastSessionAt = host.sessions[0]?.createdAt.toISOString() ?? null;
  const lastSessionStatus = (host.sessions[0]?.status as RemoteConfiguredHostItem["lastSessionStatus"]) ?? null;
  const lastTicketNumber = host.sessions[0]?.ticketNumber ?? null;
  const description =
    host.description ??
    mapHostDescription({
      description: null,
      environment: host.environment,
      provider: host.provider,
      rustdeskId: host.agentExternalId,
      machineName: host.machineName,
      agentVersion: host.agentVersion,
    });
  const lifecycleStatus = resolveAgentLifecycleStatus({
    installToken: host.installToken,
    rustdeskId: host.agentExternalId,
    lastHeartbeatAt: host.lastHeartbeatAt,
  });
  const installStages = buildInstallStages({
    installToken: host.installToken,
    rustdeskId: host.agentExternalId,
    lastHeartbeatAt: host.lastHeartbeatAt,
  });

  return {
    id: host.id,
    companyId: host.companyId,
    companyName,
    installationCompanies: host.installationCompanies ?? [],
    name: host.name,
    environment: host.environment,
    provider: host.provider,
    rustdeskId: host.agentExternalId,
    status: host.status,
    description,
    notes: host.notes,
    installToken: host.installToken,
    machineName: host.machineName,
    agentVersion: host.agentVersion,
    serviceStatus: host.serviceStatus ?? null,
    lastHeartbeatAt: host.lastHeartbeatAt?.toISOString() ?? null,
    lastHeartbeatSuccessAt: host.lastHeartbeatSuccessAt?.toISOString() ?? null,
    lastHeartbeatErrorAt: host.lastHeartbeatErrorAt?.toISOString() ?? null,
    lastHeartbeatErrorMessage: host.lastHeartbeatErrorMessage ?? null,
    lastKnownIp: host.lastKnownIp ?? null,
    lastRegisterAt: host.lastRegisterAt?.toISOString() ?? null,
    lastRegisterSource: host.lastRegisterSource ?? null,
    agentTokenIssuedAt: host.agentTokenIssuedAt?.toISOString() ?? null,
    agentTokenLastUsedAt: host.agentTokenLastUsedAt?.toISOString() ?? null,
    openSessionCount,
    operationalStatus: resolveRemoteOperationalStatus({
      rustdeskId: host.agentExternalId,
      installToken: host.installToken,
      lastHeartbeatAt: host.lastHeartbeatAt,
      openSessionCount,
    }),
    lastSessionAt,
    lastSessionStatus,
    lastTicketNumber,
    agent: {
      installToken: host.installToken,
      rustdeskId: host.agentExternalId,
      machineName: host.machineName,
      agentVersion: host.agentVersion,
      lastHeartbeatAt: host.lastHeartbeatAt?.toISOString() ?? null,
      lastHeartbeatSuccessAt: host.lastHeartbeatSuccessAt?.toISOString() ?? null,
      lastHeartbeatErrorAt: host.lastHeartbeatErrorAt?.toISOString() ?? null,
      lastHeartbeatErrorMessage: host.lastHeartbeatErrorMessage ?? null,
      lastKnownIp: host.lastKnownIp ?? null,
      lastRegisterAt: host.lastRegisterAt?.toISOString() ?? null,
      lastRegisterSource: host.lastRegisterSource ?? null,
      agentTokenIssuedAt: host.agentTokenIssuedAt?.toISOString() ?? null,
      agentTokenLastUsedAt: host.agentTokenLastUsedAt?.toISOString() ?? null,
      lastKnownRustDeskAlias: host.lastKnownRustDeskAlias ?? null,
      lastKnownRustDeskVersion: host.lastKnownRustDeskVersion ?? null,
      lastKnownRustDeskServerHost: host.lastKnownRustDeskServerHost ?? null,
      lastKnownRustDeskApiHost: host.lastKnownRustDeskApiHost ?? null,
      lastKnownRustDeskPublicKeyHash: host.lastKnownRustDeskPublicKeyHash ?? null,
      lastRustDeskConfigSyncAt: host.lastRustDeskConfigSyncAt?.toISOString() ?? null,
      lifecycleStatus,
      installStages,
      installerPath: `/api/remote/hosts/${host.id}/installer`,
    },
  };
}

function buildInstallGuide(item: RemoteConfiguredHostItem) {
  return [
    {
      id: "TOKEN_READY" as const,
      title: "Host com token operacional",
      description: "O portal precisa manter installToken valido para bootstrap do agente.",
      done: item.agent.installStages.includes("TOKEN_READY"),
    },
    {
      id: "SCRIPT_READY" as const,
      title: "Script de instalacao disponivel",
      description: "Baixe o .ps1 por host para registrar o agente no campo sem preencher payload manual.",
      done: item.agent.installStages.includes("SCRIPT_READY"),
    },
    {
      id: "RUSTDESK_LINKED" as const,
      title: "RustDesk ID vinculado",
      description: "A maquina precisa devolver RustDesk ID valido para o host ficar pronto para acesso.",
      done: item.agent.installStages.includes("RUSTDESK_LINKED"),
    },
    {
      id: "HEARTBEAT_OK" as const,
      title: "Heartbeat confirmado",
      description: "Depois do registro inicial, o agente precisa voltar ao portal com heartbeat recorrente.",
      done: item.agent.installStages.includes("HEARTBEAT_OK"),
    },
  ];
}

function resolveCommandDurationSeconds(input: {
  createdAt: Date;
  executedAt: Date | null;
  failedAt: Date | null;
}) {
  const endAt = input.failedAt ?? input.executedAt;
  if (!endAt) return null;
  const diffMs = endAt.getTime() - input.createdAt.getTime();
  return diffMs >= 0 ? Math.floor(diffMs / 1000) : 0;
}

function resolveSuccessRate(
  rows: Array<{ status: "PENDING" | "DELIVERED" | "ACKNOWLEDGED" | "CANCELLED" | "FAILED"; updatedAt: Date }>,
  since: Date
) {
  const success = rows.filter((row) => row.updatedAt >= since && row.status === "ACKNOWLEDGED").length;
  const failed = rows.filter((row) => row.updatedAt >= since && row.status === "FAILED").length;
  const total = success + failed;
  if (!total) return 0;
  return Math.round((success / total) * 100);
}

function mapCompanyRemoteConnections(input: {
  remoteConnections?: unknown;
  remoteConnectionType?: unknown;
  remoteConnectionDetails?: unknown;
}): RemoteConnectionItem[] {
  if (Array.isArray(input.remoteConnections)) {
    return input.remoteConnections
      .filter(
        (entry): entry is { type: "DDNS_NOIP" | "RADMIN_VPN"; details?: string } =>
          !!entry &&
          typeof entry === "object" &&
          "type" in entry &&
          (((entry as { type?: string }).type ?? "") === "DDNS_NOIP" ||
            ((entry as { type?: string }).type ?? "") === "RADMIN_VPN")
      )
      .map((entry) => ({
        type: entry.type,
        details: entry.details ?? "",
      }));
  }

  if (input.remoteConnectionType === "DDNS_NOIP" || input.remoteConnectionType === "RADMIN_VPN") {
    return [
      {
        type: input.remoteConnectionType as RemoteConnectionItem["type"],
        details: typeof input.remoteConnectionDetails === "string" ? input.remoteConnectionDetails : "",
      },
    ];
  }

  return [];
}

export async function getRemotePlatformOverview(): Promise<RemotePlatformOverview> {
  const tenantScope = await getRemoteTenantScope();
  const moduleSettings = await getRemoteModuleSettingsSnapshot();
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);
  const companyOptions = await prisma.company.findMany({
    where: tenantScope.isGlobalView
      ? { deletedAt: null }
      : { deletedAt: null, id: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ["__none__"] } },
    select: {
      id: true,
      nomeFantasia: true,
      razaoSocial: true,
    },
    orderBy: [{ nomeFantasia: "asc" }, { razaoSocial: "asc" }],
    take: 200,
  });

  const [
    recentHosts,
    recentSessions,
    hostOptionsRows,
    companies,
    totalHosts,
    activeHosts,
    maintenanceHosts,
    inactiveHosts,
    totalSessions,
    requestedSessions,
    startedSessions,
    endedSessions,
    failedSessions,
  ] = await Promise.all([
    prisma.remoteHost.findMany({
      where: scopedWhere,
      include: {
        company: { select: { nomeFantasia: true, razaoSocial: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.remoteSession.findMany({
      where: scopedWhere,
      include: {
        company: { select: { nomeFantasia: true, razaoSocial: true } },
        host: { select: { name: true } },
        requestedByUser: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 6,
    }),
    prisma.remoteHost.findMany({
      where: scopedWhere,
      include: {
        company: { select: { nomeFantasia: true, razaoSocial: true } },
      },
      orderBy: [{ name: "asc" }],
      take: 100,
    }),
    prisma.company.findMany({
      where: tenantScope.isGlobalView
        ? { deletedAt: null }
        : { deletedAt: null, id: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ["__none__"] } },
      select: { id: true, nomeFantasia: true, razaoSocial: true },
      orderBy: [{ razaoSocial: "asc" }],
      take: 100,
    }),
    prisma.remoteHost.count({ where: scopedWhere }),
    prisma.remoteHost.count({ where: { ...scopedWhere, status: "ACTIVE" } }),
    prisma.remoteHost.count({ where: { ...scopedWhere, status: "MAINTENANCE" } }),
    prisma.remoteHost.count({ where: { ...scopedWhere, status: "INACTIVE" } }),
    prisma.remoteSession.count({ where: scopedWhere }),
    prisma.remoteSession.count({ where: { ...scopedWhere, status: "REQUESTED" } }),
    prisma.remoteSession.count({ where: { ...scopedWhere, status: "STARTED" } }),
    prisma.remoteSession.count({ where: { ...scopedWhere, status: "ENDED" } }),
    prisma.remoteSession.count({ where: { ...scopedWhere, status: "FAILED" } }),
  ]);

  const hostStats = {
    total: totalHosts,
    active: activeHosts,
    maintenance: maintenanceHosts,
    inactive: inactiveHosts,
  };

  const sessionStats = {
    total: totalSessions,
    requested: requestedSessions,
    started: startedSessions,
    ended: endedSessions,
    failed: failedSessions,
  };

  return {
    title: "Plataforma Remota",
    summary:
      "Base inicial para acesso remoto, credenciais centralizadas, backup e trilha de auditoria em uma operacao unica.",
    recommendedEngine: "RustDesk self-hosted",
    secretVault: "HashiCorp Vault",
    backupStrategy: "Firebird com gbak como padrao e nbackup para cenarios especificos",
    companyFilterRule:
      "ADMIN, SUPORTE e DEVELOPER enxergam todos os hosts e sessoes. CLIENTE_ADMIN deve enxergar apenas registros cujo companyId coincide com sua membership ativa.",
    accessPolicies: [
      {
        role: "ADMIN",
        scope: "global",
        description: "Visao global para operacao, suporte e governanca da plataforma remota.",
      },
      {
        role: "SUPORTE",
        scope: "global",
        description: "Visao global para atendimento tecnico, diagnostico e abertura de sessao.",
      },
      {
        role: "DEVELOPER",
        scope: "global",
        description: "Visao global para integracoes, observabilidade e manutencao de agentes.",
      },
      {
        role: "CLIENTE_ADMIN",
        scope: "company",
        description: "Escopo estrito a hosts e sessoes da propria empresa, nunca visao global.",
      },
    ],
    tenantScope,
    hostModel: {
      id: "remote_host.id",
      companyId: "remote_host.companyId",
      name: "remote_host.name",
      environment: "remote_host.environment",
      provider: "remote_host.provider",
      description: "remote_host.description",
      notes: "remote_host.notes",
      agentExternalId: "remote_host.agentExternalId",
      installToken: "remote_host.installToken",
      machineName: "remote_host.machineName",
      agentVersion: "remote_host.agentVersion",
      status: "ACTIVE",
    },
    sessionModel: {
      id: "remote_session.id",
      companyId: "remote_session.companyId",
      ticketId: "remote_session.ticketId",
      ticketNumber: "remote_session.ticketNumber",
      hostId: "remote_session.hostId",
      requestedByUserId: "remote_session.requestedByUserId",
      startedByUserId: "remote_session.startedByUserId",
      status: "REQUESTED",
    },
    sessionAuditModel: {
      id: "remote_session_audit.id",
      sessionId: "remote_session_audit.sessionId",
      action: "REQUESTED",
      source: "UI",
      actorUserId: "remote_session_audit.actorUserId",
      hostId: "remote_session_audit.hostId",
      ticketNumber: "remote_session_audit.ticketNumber",
      occurredAt: "remote_session_audit.occurredAt",
      summary: "Sessao solicitada por operador autenticado",
      metadata: "json com origem, motivo, expiracao, payload externo e diagnostico",
    },
    modules: [
      {
        id: "remote-hosts",
        title: "Ambientes e agentes",
        description: "Cadastro de clientes, ambientes, hosts e agentes com companyId explicito, token de instalacao e heartbeat OSS-first.",
        status: "foundation",
        nextStep: "Validar auto-registro do agente, heartbeat e enriquecimento operacional do host.",
      },
      {
        id: "remote-sessions",
        title: "Sessoes remotas",
        description: "Inicio, encerramento e rastreabilidade minima de sessoes tecnicas com companyId proprio para auditoria e filtro.",
        status: "foundation",
        nextStep: "Materializar trilha de auditoria por sessao, job de expiracao e resolucao de host por ticket.",
      },
      {
        id: "zammad-rustdesk",
        title: "Integracao Zammad + RustDesk",
        description: "Link rapido no ticket com rustdesk://<id>, vinculo do ticket com sessao remota e webhook para auditoria.",
        status: "planned",
        nextStep: "Criar rustdesk_id no contexto do Zammad e payload webhook para o orquestrador remoto.",
      },
      {
        id: "credential-vault",
        title: "Credenciais e cofres",
        description: "Referencias seguras para segredos, acesso controlado e auditoria de leitura.",
        status: "planned",
        nextStep: "Modelar CredentialVaultRef e policy de acesso por role.",
      },
      {
        id: "backup-restore",
        title: "Backup e restore",
        description: "Jobs de backup, catalogo de artefatos e trilha de restore com dupla confirmacao.",
        status: "planned",
        nextStep: "Criar entidades BackupJob, BackupArtifact e RestoreJob.",
      },
      {
        id: "audit-observability",
        title: "Auditoria e observabilidade",
        description: "Registro de acoes tecnicas, health checks e alertas operacionais por ambiente.",
        status: "planned",
        nextStep: "Persistir eventos por sessao com action, source, actor, summary e metadata.",
      },
    ],
    endpoints: [
      { method: "GET", path: "/api/remote/hosts", purpose: "Listar hosts remotos no escopo do usuario" },
      { method: "POST", path: "/api/remote/hosts", purpose: "Cadastrar host remoto" },
      { method: "GET", path: "/api/remote/agents/discovery-script", purpose: "Baixar script padrao para descoberta sem pre-cadastro" },
      { method: "POST", path: "/api/remote/agents/discover", purpose: "Registrar maquina descoberta e manter heartbeat sem host previo" },
      { method: "POST", path: "/api/remote/rustdesk/bootstrap", purpose: "Bootstrap autenticado do host via installToken para emissao de agentToken" },
      { method: "POST", path: "/api/remote/rustdesk/sync", purpose: "Heartbeat autenticado, compliance do cliente e sincronizacao operacional" },
      { method: "POST", path: "/api/remote/rustdesk/ack", purpose: "Ack de comandos executados pelo agente no host" },
      { method: "GET", path: "/api/remote/sessions", purpose: "Listar sessoes remotas no escopo do usuario" },
      { method: "POST", path: "/api/remote/sessions", purpose: "Solicitar sessao remota" },
      { method: "POST", path: "/api/remote/sessions/:id/start", purpose: "Iniciar sessao remota solicitada" },
      { method: "POST", path: "/api/remote/sessions/:id/stop", purpose: "Encerrar sessao remota iniciada" },
      { method: "POST", path: "/api/integrations/zammad/webhook", purpose: "Receber evento do ticket remoto e vincular sessao" },
      { method: "GET", path: "/api/integrations/zammad/rustdesk-link/:ticketId", purpose: "Resolver deep-link rustdesk:// para o ticket" },
      { method: "POST", path: "/api/credentials/request", purpose: "Solicitar segredo por referencia" },
      { method: "POST", path: "/api/backup/run", purpose: "Disparar backup" },
      { method: "GET", path: "/api/backup/jobs", purpose: "Listar jobs e artefatos" },
      { method: "POST", path: "/api/restore/run", purpose: "Solicitar restore" },
      { method: "GET", path: "/api/audit/events", purpose: "Consultar trilha de auditoria" },
    ],
    roadmap: [
      {
        id: "phase-1",
        title: "Fase 1 - Fundacao",
        summary: "RustDesk self-hosted, companyId em host/sessao, integracao inicial com Zammad, controle de sessao, auditoria minima e backup padrao com gbak.",
        status: "foundation",
      },
      {
        id: "phase-2",
        title: "Fase 2 - Seguranca e governanca",
        summary: "Vault, politicas por role, rotacao de credenciais e trilha ampliada.",
        status: "planned",
      },
      {
        id: "phase-3",
        title: "Fase 3 - Escala e experiencia web-first",
        summary: "Guacamole, gravacao/replay, operacao multiambiente e observabilidade avancada.",
        status: "planned",
      },
    ],
    hostStats,
    sessionStats,
    recentHosts: recentHosts.map((host) => ({
      id: host.id,
      companyId: host.companyId,
      name: host.name,
      environment: host.environment,
      provider: host.provider,
      description: host.description,
      agentExternalId: host.agentExternalId,
      notes: host.notes,
      installToken: host.installToken,
      machineName: host.machineName,
      agentVersion: host.agentVersion,
      status: host.status,
      companyName: host.company.nomeFantasia ?? host.company.razaoSocial,
      createdAt: host.createdAt.toISOString(),
      lastHeartbeatAt: host.lastHeartbeatAt?.toISOString() ?? null,
    })),
    recentSessions: recentSessions.map((session) => ({
      id: session.id,
      companyId: session.companyId,
      ticketId: session.ticketId,
      ticketNumber: session.ticketNumber,
      hostId: session.hostId,
      requestedByUserId: session.requestedByUserId,
      startedByUserId: session.startedByUserId,
      status: session.status,
      hostName: session.host.name,
      companyName: session.company.nomeFantasia ?? session.company.razaoSocial,
      requestedByName: session.requestedByUser.name,
      createdAt: session.createdAt.toISOString(),
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
    })),
    companyOptions: companies.map((company) => ({
      id: company.id,
      label: company.nomeFantasia ?? company.razaoSocial,
    })),
    hostOptions: hostOptionsRows.map((host) => ({
      id: host.id,
      companyId: host.companyId,
      label: `${host.name} (${host.company.nomeFantasia ?? host.company.razaoSocial})`,
      status: host.status,
    })),
  };
}

export async function getRemotePlatformDirectory(): Promise<RemotePlatformDirectory> {
  const tenantScope = await getRemoteTenantScope();
  const moduleSettings = await getRemoteModuleSettingsSnapshot();
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [hosts, totalHosts, activeHosts, companies, companyOptions, discoveredHosts] = await Promise.all([
    prisma.remoteHost.findMany({
      where: scopedWhere,
      include: {
        company: { select: { nomeFantasia: true, razaoSocial: true } },
        sessions: {
          select: { createdAt: true, status: true, ticketNumber: true },
          orderBy: [{ createdAt: "desc" }],
          take: 10,
        },
      },
      orderBy: [{ company: { razaoSocial: "asc" } }, { name: "asc" }],
    }),
    prisma.remoteHost.count({ where: scopedWhere }),
    prisma.remoteHost.count({ where: { ...scopedWhere, status: "ACTIVE" } }),
    prisma.remoteHost.groupBy({
      by: ["companyId"],
      where: scopedWhere,
    }),
    prisma.company.findMany({
      where: tenantScope.isGlobalView
        ? { deletedAt: null }
        : { deletedAt: null, id: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ["__none__"] } },
      select: { id: true, nomeFantasia: true, razaoSocial: true },
      orderBy: [{ razaoSocial: "asc" }],
      take: 100,
    }),
    tenantScope.isGlobalView
      ? prisma.remoteDiscoveredHost.findMany({
          where: { status: "PENDING_LINK" },
          orderBy: [{ lastHeartbeatAt: "desc" }, { updatedAt: "desc" }],
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  const hostIds = hosts.map((host) => host.id);
  const commandRows = hostIds.length
    ? await prisma.remoteAgentCommand.findMany({
        where: {
          hostId: { in: hostIds },
          OR: [{ status: "PENDING" }, { updatedAt: { gte: last30d } }],
        },
        select: {
          id: true,
          hostId: true,
          type: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          deliveredAt: true,
          executedAt: true,
          failedAt: true,
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 500,
      })
    : [];

  const installationRows = hostIds.length
    ? await prisma.$queryRaw<Array<{ hostId: string; companyName: string | null; companyLabel: string }>>(
        Prisma.sql`
          SELECT
            u."hostId" AS "hostId",
            COALESCE(c."nomeFantasia", c."razaoSocial") AS "companyName",
            u."companyLabel" AS "companyLabel"
          FROM "remote_host_syspro_update" u
          LEFT JOIN "company" c ON c."id" = u."companyId"
          WHERE u."hostId" IN (${Prisma.join(hostIds)})
          ORDER BY u."companyLabel" ASC
        `
      )
    : [];

  const installationMap = new Map<string, string[]>();
  for (const row of installationRows) {
    const labels = [row.companyName, row.companyLabel]
      .map((label) => label?.trim())
      .filter((label): label is string => !!label);
    if (!labels.length) continue;
    const current = installationMap.get(row.hostId) ?? [];
    for (const label of labels) {
      if (!current.includes(label)) current.push(label);
    }
    installationMap.set(row.hostId, current);
  }

  const pendingHosts = new Set<string>();
  const failedHosts = new Set<string>();
  let pendingTotal = 0;
  let failedLast24h = 0;
  let acknowledgedLast24h = 0;
  let deliveredLast24h = 0;
  const perHostCommandStats = new Map<string, { pendingCount: number; failedCount: number }>();

  for (const row of commandRows) {
    const current = perHostCommandStats.get(row.hostId) ?? { pendingCount: 0, failedCount: 0 };
    if (row.status === "PENDING") {
      pendingTotal += 1;
      pendingHosts.add(row.hostId);
      current.pendingCount += 1;
    }
    if (row.status === "FAILED" && row.updatedAt >= last24h) {
      failedLast24h += 1;
      failedHosts.add(row.hostId);
      current.failedCount += 1;
    }
    if (row.status === "ACKNOWLEDGED" && row.updatedAt >= last24h) {
      acknowledgedLast24h += 1;
    }
    if (row.status === "DELIVERED" && row.updatedAt >= last24h) {
      deliveredLast24h += 1;
    }
    perHostCommandStats.set(row.hostId, current);
  }

  const hostMap = new Map(
    hosts.map((host) => [host.id, { hostName: host.name, companyName: host.company.nomeFantasia ?? host.company.razaoSocial }])
  );
  const hotspots = Array.from(perHostCommandStats.entries())
    .map(([hostId, stats]) => ({
      hostId,
      hostName: hostMap.get(hostId)?.hostName ?? "Host remoto",
      companyName: hostMap.get(hostId)?.companyName ?? null,
      pendingCount: stats.pendingCount,
      failedCount: stats.failedCount,
    }))
    .filter((entry) => entry.pendingCount > 0 || entry.failedCount > 0)
    .sort((a, b) => (b.pendingCount + b.failedCount * 2) - (a.pendingCount + a.failedCount * 2))
    .slice(0, 5);

  const timeline = commandRows
    .filter((row) => row.status !== "PENDING")
    .map((row) => ({
      commandId: row.id,
      hostId: row.hostId,
      hostName: hostMap.get(row.hostId)?.hostName ?? "Host remoto",
      companyName: hostMap.get(row.hostId)?.companyName ?? null,
      type: row.type,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
      executedAt: row.executedAt?.toISOString() ?? null,
      failedAt: row.failedAt?.toISOString() ?? null,
      durationSeconds: resolveCommandDurationSeconds({
        createdAt: row.createdAt,
        executedAt: row.executedAt,
        failedAt: row.failedAt,
      }),
    }))
    .slice(0, 20);

  const successRates = {
    window24h: resolveSuccessRate(commandRows, last24h),
    window7d: resolveSuccessRate(commandRows, last7d),
    window30d: resolveSuccessRate(commandRows, last30d),
  };

  const pendingItems: RemoteDiscoveredHostItem[] = discoveredHosts.map((host) => {
    const snapshot = Array.isArray(host.installationsSnapshot) ? host.installationsSnapshot : [];
    const installationCompanies = snapshot
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        if ("empresa" in entry && typeof entry.empresa === "string") return entry.empresa.trim();
        if ("companyLabel" in entry && typeof entry.companyLabel === "string") return entry.companyLabel.trim();
        return null;
      })
      .filter((entry): entry is string => !!entry);

    return {
      id: host.id,
      machineName: host.machineName,
      rustdeskId: host.agentExternalId,
      agentVersion: host.agentVersion,
      provider: host.provider,
      environment: host.environment,
      description: host.description,
      serviceStatus: host.serviceStatus,
      lastHeartbeatAt: host.lastHeartbeatAt?.toISOString() ?? null,
      status: host.status as RemoteDiscoveredHostItem["status"],
      linkedHostId: host.linkedHostId,
      installationCompanies,
    };
  });

  return {
    tenantScope,
    moduleSettings: {
      rustDeskServerHost: moduleSettings.rustDeskServerHost,
      rustDeskServerConfig: moduleSettings.rustDeskServerConfig,
      rustDeskPublicKey: moduleSettings.rustDeskPublicKey,
      rustDeskPublicKeyHash: moduleSettings.rustDeskPublicKey.trim()
        ? hashRustDeskPublicKey(moduleSettings.rustDeskPublicKey)
        : null,
      rustDeskVersion: moduleSettings.rustDeskVersion,
      defaultPassword: moduleSettings.defaultPassword,
    },
    stats: {
      totalHosts,
      activeHosts,
      companies: companies.length,
      pendingInstall: hosts.filter((host) => !host.installToken || !host.agentExternalId).length,
      linkedAgents: hosts.filter((host) => !!host.agentExternalId).length,
      onlineAgents: hosts.filter((host) => !!host.lastHeartbeatAt).length,
      pendingDiscovery: pendingItems.length,
    },
    commandObservability: {
      pendingTotal,
      pendingHosts: pendingHosts.size,
      failedLast24h,
      acknowledgedLast24h,
      deliveredLast24h,
      hotspots,
      successRates,
      timeline,
    },
    companyOptions: companyOptions.map((company) => ({
      id: company.id,
      label: company.nomeFantasia ?? company.razaoSocial,
    })),
    pendingItems,
    items: hosts.map((host) =>
      mapDirectoryItem({
        ...host,
        installationCompanies: installationMap.get(host.id) ?? [],
      })
    ),
  };
}

export async function getRemoteHostDetails(hostId: string): Promise<RemoteHostDetails | null> {
  const tenantScope = await getRemoteTenantScope();
  const moduleSettings = await getRemoteModuleSettingsSnapshot();
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);
  const companyOptions = await prisma.company.findMany({
    where: tenantScope.isGlobalView
      ? { deletedAt: null }
      : { deletedAt: null, id: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ["__none__"] } },
    select: {
      id: true,
      nomeFantasia: true,
      razaoSocial: true,
    },
    orderBy: [{ nomeFantasia: "asc" }, { razaoSocial: "asc" }],
    take: 200,
  });

  const host = await prisma.remoteHost.findFirst({
    where: {
      id: hostId,
      ...scopedWhere,
    },
    include: {
      company: {
        select: {
          id: true,
          nomeFantasia: true,
          razaoSocial: true,
          cnpj: true,
          emailContato: true,
          telefone: true,
          serverType: true,
          serverPort: true,
          serverHost: true,
          serverProtocol: true,
          iisIsapiPath: true,
          installationDirectory: true,
          remoteConnections: true,
          remoteConnectionType: true,
          remoteConnectionDetails: true,
          observacoes: true,
          memberships: {
            where: {
              user: {
                deletedAt: null,
                isActive: true,
              },
            },
            select: {
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: [{ createdAt: "asc" }],
            take: 20,
          },
        },
      },
      sessions: {
        include: {
          company: { select: { nomeFantasia: true, razaoSocial: true } },
          host: { select: { name: true } },
          requestedByUser: { select: { name: true } },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 20,
      },
    },
  });

  if (!host) return null;
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const sysproUpdates = await prisma.$queryRaw<
    Array<{
      id: string;
      companyId: string | null;
      companyLabel: string;
      resolvedCompanyName: string | null;
      path: string;
      lastFileWriteAt: Date | null;
      lastHeartbeatAt: Date;
    }>
  >`
    SELECT
      u."id",
      u."companyId",
      u."companyLabel",
      COALESCE(c."nomeFantasia", c."razaoSocial") AS "resolvedCompanyName",
      u."path",
      u."lastFileWriteAt",
      u."lastHeartbeatAt"
    FROM "remote_host_syspro_update" u
    LEFT JOIN "company" c ON c."id" = u."companyId"
    WHERE u."hostId" = ${host.id}
    ORDER BY u."companyLabel" ASC, u."path" ASC
  `;
  const companyIdsFromInstallations = Array.from(new Set(sysproUpdates.map((entry) => entry.companyId).filter((id): id is string => !!id)));
  const installationCompanies = companyIdsFromInstallations.length
    ? await prisma.company.findMany({
        where: { id: { in: companyIdsFromInstallations } },
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          serverType: true,
          serverPort: true,
          serverHost: true,
          serverProtocol: true,
          iisIsapiPath: true,
          installationDirectory: true,
          remoteConnections: true,
          remoteConnectionType: true,
          remoteConnectionDetails: true,
          observacoes: true,
        },
      })
    : [];
  const companyContextById = new Map(
    installationCompanies.map((company) => [
      company.id,
      {
        id: company.id,
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia,
        serverType: ((company as any).serverType ?? null) as "SYSPRO_SERVER" | "IIS" | null,
        serverPort: company.serverPort ?? null,
        serverHost: company.serverHost ?? null,
        serverProtocol: ((company as any).serverProtocol ?? null) as "HTTP" | "HTTPS" | null,
        iisIsapiPath: company.iisIsapiPath ?? null,
        installationDirectory: company.installationDirectory ?? null,
        remoteConnections: mapCompanyRemoteConnections({
          remoteConnections: (company as any).remoteConnections,
          remoteConnectionType: (company as any).remoteConnectionType,
          remoteConnectionDetails: (company as any).remoteConnectionDetails,
        }),
        observacoes: company.observacoes ?? null,
      },
    ])
  );
  const agentCommands = await prisma.remoteAgentCommand.findMany({
      where: {
        hostId: host.id,
        status: {
          in: ["PENDING", "DELIVERED", "ACKNOWLEDGED", "FAILED"],
        },
      },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 12,
  });
  const timelineCommands = await prisma.remoteAgentCommand.findMany({
    where: {
      hostId: host.id,
      OR: [{ status: "PENDING" }, { updatedAt: { gte: last30d } }],
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 60,
  });

  const hostServiceStatus = await prisma.$queryRaw<Array<{ serviceStatus: string | null }>>`
    SELECT "serviceStatus"
    FROM "remote_host"
    WHERE "id" = ${host.id}
  `;
  const serviceStatus = hostServiceStatus[0]?.serviceStatus ?? null;
  const remoteConnections = mapCompanyRemoteConnections({
    remoteConnections: (host.company as any).remoteConnections,
    remoteConnectionType: (host.company as any).remoteConnectionType,
    remoteConnectionDetails: (host.company as any).remoteConnectionDetails,
  });
  const mappedSysproUpdates = sysproUpdates.map((entry) => ({
    id: entry.id,
    companyId: entry.companyId,
    companyLabel: entry.companyLabel,
    resolvedCompanyName: entry.resolvedCompanyName,
    path: entry.path,
    lastFileWriteAt: entry.lastFileWriteAt?.toISOString() ?? null,
    lastHeartbeatAt: entry.lastHeartbeatAt.toISOString(),
  }));

  return {
    host: mapDirectoryItem({
      ...host,
      serviceStatus,
      lastHeartbeatSuccessAt: host.lastHeartbeatSuccessAt,
      lastHeartbeatErrorAt: host.lastHeartbeatErrorAt,
      lastHeartbeatErrorMessage: host.lastHeartbeatErrorMessage,
      lastKnownIp: host.lastKnownIp,
      lastRegisterAt: host.lastRegisterAt,
      lastRegisterSource: host.lastRegisterSource,
      sessions: host.sessions.map((session) => ({
        createdAt: session.createdAt,
        status: session.status,
        ticketNumber: session.ticketNumber,
      })),
    }),
    permissions: {
      canEditCompanyContext:
        tenantScope.role === "ADMIN" || tenantScope.role === "SUPORTE" || tenantScope.role === "DEVELOPER",
      canRelinkInstallations:
        tenantScope.role === "ADMIN" || tenantScope.role === "SUPORTE" || tenantScope.role === "DEVELOPER",
    },
    moduleSettings: {
      rustDeskServerHost: moduleSettings.rustDeskServerHost,
      rustDeskServerConfig: moduleSettings.rustDeskServerConfig,
      rustDeskPublicKey: moduleSettings.rustDeskPublicKey,
      rustDeskPublicKeyHash: moduleSettings.rustDeskPublicKey.trim()
        ? hashRustDeskPublicKey(moduleSettings.rustDeskPublicKey)
        : null,
      rustDeskVersion: moduleSettings.rustDeskVersion,
      defaultPassword: moduleSettings.defaultPassword,
    },
    companyOptions: companyOptions.map((company) => ({
      id: company.id,
      label: company.nomeFantasia ?? company.razaoSocial,
    })),
    installGuide: buildInstallGuide(
      mapDirectoryItem({
        ...host,
        serviceStatus,
        lastHeartbeatSuccessAt: host.lastHeartbeatSuccessAt,
        lastHeartbeatErrorAt: host.lastHeartbeatErrorAt,
        lastHeartbeatErrorMessage: host.lastHeartbeatErrorMessage,
        lastKnownIp: host.lastKnownIp,
        lastRegisterAt: host.lastRegisterAt,
        lastRegisterSource: host.lastRegisterSource,
        sessions: host.sessions.map((session) => ({
          createdAt: session.createdAt,
          status: session.status,
          ticketNumber: session.ticketNumber,
        })),
      })
    ),
    company: {
      id: host.company.id,
      razaoSocial: host.company.razaoSocial,
      nomeFantasia: host.company.nomeFantasia,
      cnpj: host.company.cnpj,
      emailContato: host.company.emailContato,
      telefone: host.company.telefone,
      serverType: ((host.company as any).serverType ?? null) as "SYSPRO_SERVER" | "IIS" | null,
      serverPort: host.company.serverPort ?? null,
      serverHost: host.company.serverHost ?? null,
      serverProtocol: ((host.company as any).serverProtocol ?? null) as "HTTP" | "HTTPS" | null,
      iisIsapiPath: host.company.iisIsapiPath ?? null,
      installationDirectory: host.company.installationDirectory ?? null,
      remoteConnections,
      observacoes: host.company.observacoes,
    },
    installationContexts: mappedSysproUpdates.map((update) => ({
      update,
      company: update.companyId ? companyContextById.get(update.companyId) ?? null : null,
    })),
    linkedUsers: host.company.memberships.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
    })),
    recentSessions: host.sessions.map((session) => ({
      id: session.id,
      companyId: session.companyId,
      ticketId: session.ticketId,
      ticketNumber: session.ticketNumber,
      hostId: session.hostId,
      requestedByUserId: session.requestedByUserId,
      startedByUserId: session.startedByUserId,
      status: session.status,
      hostName: session.host.name,
      companyName: session.company.nomeFantasia ?? session.company.razaoSocial,
      requestedByName: session.requestedByUser.name,
      createdAt: session.createdAt.toISOString(),
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
    })),
    agentCommands: agentCommands.map((command) => ({
      id: command.id,
      type: command.type,
      status: command.status,
      reason: command.reason ?? null,
      payload:
        command.payload && typeof command.payload === "object" && !Array.isArray(command.payload)
          ? (command.payload as Record<string, unknown>)
          : null,
      attemptCount: command.attemptCount,
      resultMessage: command.resultMessage ?? null,
      resultPayload:
        command.resultPayload && typeof command.resultPayload === "object" && !Array.isArray(command.resultPayload)
          ? (command.resultPayload as Record<string, unknown>)
          : null,
      createdAt: command.createdAt.toISOString(),
      updatedAt: command.updatedAt.toISOString(),
      deliveredAt: command.deliveredAt?.toISOString() ?? null,
      executedAt: command.executedAt?.toISOString() ?? null,
      failedAt: command.failedAt?.toISOString() ?? null,
    })),
    commandSuccessRates: {
      window24h: resolveSuccessRate(timelineCommands, last24h),
      window7d: resolveSuccessRate(timelineCommands, last7d),
      window30d: resolveSuccessRate(timelineCommands, last30d),
    },
    commandTimeline: timelineCommands.map((command) => ({
      id: command.id,
      type: command.type,
      status: command.status,
      createdAt: command.createdAt.toISOString(),
      deliveredAt: command.deliveredAt?.toISOString() ?? null,
      executedAt: command.executedAt?.toISOString() ?? null,
      failedAt: command.failedAt?.toISOString() ?? null,
      durationSeconds: resolveCommandDurationSeconds({
        createdAt: command.createdAt,
        executedAt: command.executedAt,
        failedAt: command.failedAt,
      }),
    })),
    sysproUpdates: mappedSysproUpdates,
  };
}
