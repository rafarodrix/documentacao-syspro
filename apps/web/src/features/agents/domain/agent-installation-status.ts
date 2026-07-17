export const AGENT_ONLINE_THRESHOLD_MINUTES = 5;

export function formatInstallationHeartbeatLag(lagSeconds: number | null): string {
  if (lagSeconds === null) return "nunca";
  if (lagSeconds < 60) return `há ${lagSeconds}s`;
  if (lagSeconds < 3600) return `há ${Math.floor(lagSeconds / 60)}min`;
  if (lagSeconds < 86400) return `há ${Math.floor(lagSeconds / 3600)}h`;
  return `há ${Math.floor(lagSeconds / 86400)}d`;
}

export function getInstallationOfflineWarningMessage() {
  return `O agente enterprise não enviou heartbeat nos últimos ${AGENT_ONLINE_THRESHOLD_MINUTES} minutos. Verifique se o serviço está rodando na máquina.`;
}
