import type { RemotePlatformOverview } from "@/features/remote/domain/model";

export async function getRemotePlatformOverview(): Promise<RemotePlatformOverview> {
  return {
    title: "Plataforma Remota",
    summary:
      "Base inicial para acesso remoto, credenciais centralizadas, backup e trilha de auditoria em uma operacao unica.",
    recommendedEngine: "RustDesk self-hosted",
    secretVault: "HashiCorp Vault",
    backupStrategy: "Firebird com gbak como padrao e nbackup para cenarios especificos",
    modules: [
      {
        id: "remote-hosts",
        title: "Ambientes e agentes",
        description: "Cadastro de clientes, ambientes, hosts e agentes responsaveis por sessao remota.",
        status: "foundation",
        nextStep: "Persistir RemoteHost e IntegrationEndpoint no banco.",
      },
      {
        id: "remote-sessions",
        title: "Sessoes remotas",
        description: "Inicio, encerramento e rastreabilidade minima de sessoes tecnicas.",
        status: "planned",
        nextStep: "Criar session orchestrator e endpoints start/stop.",
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
      { method: "POST", path: "/api/remote/session/start", purpose: "Abrir sessao remota" },
      { method: "POST", path: "/api/remote/session/stop", purpose: "Encerrar sessao remota" },
      { method: "GET", path: "/api/remote/session/:id", purpose: "Consultar sessao e auditoria" },
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
        summary: "RustDesk self-hosted, controle de sessao, auditoria minima e backup padrao com gbak.",
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
  };
}