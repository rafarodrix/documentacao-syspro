export const AGENT_FLEET_LIST_PATH = "/portal/administracao/agentes";

export function agentFleetDetailPath(deviceId: string) {
  return `${AGENT_FLEET_LIST_PATH}/${encodeURIComponent(deviceId)}`;
}
