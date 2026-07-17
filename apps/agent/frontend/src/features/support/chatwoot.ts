import type { SupportSessionView } from "../../types/agent-ui";

export function openChatwootInline() {
  const chatwoot = (window as unknown as {
    $chatwoot?: {
      toggle?: (mode: string) => void;
      toggleBubbleVisibility?: (mode: string) => void;
    };
  }).$chatwoot;

  if (!chatwoot) return false;

  try {
    chatwoot.toggle?.("open");
    chatwoot.toggleBubbleVisibility?.("hide");
    return true;
  } catch {
    return false;
  }
}

export function mountChatwootEmbed(container: HTMLDivElement | null) {
  if (!container) return;

  const holder = document.querySelector(".woot-widget-holder");
  const bubble = document.querySelector(".woot--bubble-holder");

  if (holder instanceof HTMLElement && holder.parentElement !== container) {
    container.appendChild(holder);
  }

  if (bubble instanceof HTMLElement && bubble.parentElement !== container) {
    container.appendChild(bubble);
  }
}

export function hideChatwootBubble() {
  const chatwoot = (window as unknown as {
    $chatwoot?: { toggleBubbleVisibility?: (mode: string) => void };
  }).$chatwoot;

  try {
    chatwoot?.toggleBubbleVisibility?.("hide");
  } catch {
    // ignore
  }
}

export function hasChatwootClient() {
  const chatwoot = (window as unknown as {
    $chatwoot?: {
      toggle?: (mode: string) => void;
      setUser?: (identifier: string, attributes: Record<string, string>) => void;
    };
  }).$chatwoot;

  return Boolean(chatwoot?.toggle || chatwoot?.setUser);
}

export function identifyChatwootContact(session: SupportSessionView | null | undefined) {
  if (!session) return;

  const chatwoot = (window as unknown as {
    $chatwoot?: {
      setUser?: (identifier: string, attributes: Record<string, string>) => void;
    };
  }).$chatwoot;

  if (!chatwoot?.setUser) return;

  const identifier = buildChatwootContactIdentifier(session);
  if (!identifier) return;

  const name =
    session.installation.hostAlias ||
    session.device.machineName ||
    session.device.hostname ||
    session.installation.contactName ||
    identifier;

  try {
    chatwoot.setUser(identifier, {
      name,
      company_name: session.installation.companyName || "",
      company_id: session.installation.companyId || "",
      host_id: session.installation.hostId || "",
      host_alias: session.installation.hostAlias || "",
      rustdesk_id: session.capabilities.remote?.externalId || "",
      machine_name: session.device.machineName || session.device.hostname || "",
      local_username: session.device.localUsername || "",
      os: session.device.os || "",
      agent_version: session.device.agentVersion || "",
      description: session.installation.description || "",
    });
  } catch {
    // ignore
  }
}

function buildChatwootContactIdentifier(session: SupportSessionView) {
  if (session.installation.hostId?.trim()) return `remote-host:${session.installation.hostId.trim()}`;
  if (session.device.deviceId?.trim()) return `agent-device:${session.device.deviceId.trim()}`;
  if (session.device.hostname?.trim()) return `hostname:${session.device.hostname.trim().toLowerCase()}`;
  if (session.device.machineName?.trim()) return `machine:${session.device.machineName.trim().toLowerCase()}`;
  return "";
}
