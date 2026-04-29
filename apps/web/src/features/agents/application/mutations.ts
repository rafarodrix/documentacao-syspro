export async function patchAgentDevice(
  deviceId: string,
  patch: { remoteHostId: string | null },
): Promise<void> {
  const res = await fetch(`/api/agents/${encodeURIComponent(deviceId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null) as { error?: string } | null;
    const code = json?.error;
    if (code === "HOST_ALREADY_LINKED") throw new Error("Este host já possui um dispositivo vinculado.");
    if (code === "REMOTE_HOST_NOT_FOUND") throw new Error("Host remoto não encontrado.");
    if (code === "AGENT_DEVICE_NOT_FOUND") throw new Error("Dispositivo não encontrado.");
    throw new Error(`Falha ao atualizar dispositivo: ${res.status}`);
  }
}
