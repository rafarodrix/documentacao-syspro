/**
 * Alias de compatibilidade para o cliente tRPC atual.
 *
 * O router concreto continua interno a `apps/api`; este subpath nao pode
 * reexportar nem resolver arquivos daquela aplicacao.
 * A migracao para contratos endpoint-a-endpoint esta registrada no plano de
 * hardening e deve substituir este alias de uma vez, por feature.
 */
export type AppRouter = any;
