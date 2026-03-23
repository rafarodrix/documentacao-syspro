import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import type {
  RemoteConfiguredHostItem,
  RemoteHostDetails,
  RemotePlatformDirectory,
  RemotePlatformOverview,
} from "@/features/remote/domain/model";

function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { companyId: { in: companyIds.length ? companyIds : ["__none__"] } };
}

function mapHostDescription(input: { environment: string | null; provider: string | null; rustdeskId: string | null }) {
  return [
    input.environment ? `Ambiente: ${input.environment}` : null,
    input.provider ? `Provider: ${input.provider}` : null,
    input.rustdeskId ? `RustDesk ID: ${input.rustdeskId}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function mapDirectoryItem(host: {
  id: string;
  companyId: string;
  name: string;
  environment: string | null;
  provider: string | null;
  agentExternalId: string | null;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  company: { nomeFantasia: string | null; razaoSocial: string };
  sessions: Array<{ createdAt: Date; status: string }>;
}): RemoteConfiguredHostItem {
  const companyName = host.company.nomeFantasia ?? host.company.razaoSocial;
  const openSessionCount = host.sessions.filter((session) => session.status === "REQUESTED" || session.status === "STARTED").length;
  const lastSessionAt = host.sessions[0]?.createdAt.toISOString() ?? null;

  return {
    id: host.id,
    companyId: host.companyId,
    companyName,
    name: host.name,
    environment: host.environment,
    provider: host.provider,
    rustdeskId: host.agentExternalId,
    status: host.status,
    description: mapHostDescription({
      environment: host.environment,
      provider: host.provider,
      rustdeskId: host.agentExternalId,
    }),
    openSessionCount,
    lastSessionAt,
  };
}

export async function getRemotePlatformOverview(): Promise<RemotePlatformOverview> {
  const tenantScope = await getRemoteTenantScope();
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);

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
    modules: [
      {
        id: "remote-hosts",
        title: "Ambientes e agentes",
        description: "Cadastro de clientes, ambientes, hosts e agentes com companyId explicito para escopo por empresa.",
        status: "foundation",
        nextStep: "Persistir RemoteHost, companyId e IntegrationEndpoint no banco.",
      },
      {
        id: "remote-sessions",
        title: "Sessoes remotas",
        description: "Inicio, encerramento e rastreabilidade minima de sessoes tecnicas com companyId proprio para auditoria e filtro.",
        status: "foundation",
        nextStep: "Criar session orchestrator e filtros por membership para CLIENTE_ADMIN.",
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
        nextStep: "Estruturar AuditLog e eventos criticos do fluxo remoto.",
      },
    ],
    endpoints: [
      { method: "GET", path: "/api/remote/hosts", purpose: "Listar hosts remotos no escopo do usuario" },
      { method: "POST", path: "/api/remote/hosts", purpose: "Cadastrar host remoto" },
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
      agentExternalId: host.agentExternalId,
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
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);

  const [hosts, totalHosts, activeHosts, companies] = await Promise.all([
    prisma.remoteHost.findMany({
      where: scopedWhere,
      include: {
        company: { select: { nomeFantasia: true, razaoSocial: true } },
        sessions: {
          select: { createdAt: true, status: true },
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
  ]);

  return {
    tenantScope,
    stats: {
      totalHosts,
      activeHosts,
      companies: companies.length,
    },
    items: hosts.map(mapDirectoryItem),
  };
}

export async function getRemoteHostDetails(hostId: string): Promise<RemoteHostDetails | null> {
  const tenantScope = await getRemoteTenantScope();
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);

  const host = await prisma.remoteHost.findFirst({
    where: {
      id: hostId,
      ...scopedWhere,
    },
    include: {
      company: { select: { nomeFantasia: true, razaoSocial: true } },
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

  return {
    host: mapDirectoryItem({
      ...host,
      sessions: host.sessions.map((session) => ({ createdAt: session.createdAt, status: session.status })),
    }),
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
  };
}
