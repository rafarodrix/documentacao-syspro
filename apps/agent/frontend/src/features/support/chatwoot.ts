import { domain } from "../../../wailsjs/go/models";

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

export function identifyChatwootContact(context: domain.SupportContext | undefined) {
  if (!context) return;

  const chatwoot = (window as unknown as {
    $chatwoot?: {
      setUser?: (identifier: string, attributes: Record<string, string>) => void;
    };
  }).$chatwoot;

  if (!chatwoot?.setUser) return;

  const identifier = buildChatwootContactIdentifier(context);
  if (!identifier) return;

  const name =
    context.hostId ||
    context.machineName ||
    context.hostname ||
    context.contactName ||
    identifier;

  try {
    chatwoot.setUser(identifier, {
      name,
      company_name: context.companyDisplayName || "",
      company_id: context.companyId || "",
      host_id: context.hostId || "",
      host_alias: context.hostAlias || "",
      rustdesk_id: context.rustdeskId || "",
      machine_name: context.machineName || context.hostname || "",
      local_username: context.localUsername || "",
      os: context.os || "",
      agent_version: context.agentVersion || "",
      description: context.description || "",
    });
  } catch {
    // ignore
  }
}

function buildChatwootContactIdentifier(context: domain.SupportContext) {
  if (context.hostId?.trim()) return `remote-host:${context.hostId.trim()}`;
  if (context.deviceId?.trim()) return `agent-device:${context.deviceId.trim()}`;
  if (context.hostname?.trim()) return `hostname:${context.hostname.trim().toLowerCase()}`;
  if (context.machineName?.trim()) return `machine:${context.machineName.trim().toLowerCase()}`;
  return "";
}
