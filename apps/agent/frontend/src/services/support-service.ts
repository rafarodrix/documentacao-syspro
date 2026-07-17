import {
  GetAgentSupportView,
  OpenRemoteClient,
  OpenSupportConversation,
  SyncSupportConversationContext,
} from "../bindings";
import { uistate } from "../../wailsjs/go/models";
import type { AgentSupportViewModel } from "../types/agent-ui";

export async function fetchAgentSupportView(): Promise<AgentSupportViewModel> {
  const view = await GetAgentSupportView();
  return normalizeAgentSupportView(view);
}

export async function openSupportConversation(): Promise<void> {
  await OpenSupportConversation();
}

export async function openRemoteClient(): Promise<void> {
  await OpenRemoteClient();
}

export async function syncSupportConversationContext(conversationId: string): Promise<void> {
  await SyncSupportConversationContext(conversationId);
}

export function normalizeAgentSupportView(view: uistate.AgentSupportView): AgentSupportViewModel {
  return {
    channel: {
      baseUrl: view.channel?.baseUrl?.trim() || "",
      websiteToken: view.channel?.websiteToken?.trim() || "",
      configured: Boolean(view.channel?.configured),
    },
    device: {
      deviceId: view.device?.deviceId?.trim() || null,
      hostname: view.device?.hostname?.trim() || null,
      os: view.device?.os?.trim() || null,
      localUsername: view.device?.localUsername?.trim() || null,
      machineName: view.device?.machineName?.trim() || null,
      agentVersion: view.device?.agentVersion?.trim() || null,
    },
    installation: {
      companyId: view.installation?.companyId?.trim() || null,
      companyName: view.installation?.companyName?.trim() || null,
      hostId: view.installation?.hostId?.trim() || null,
      hostAlias: view.installation?.hostAlias?.trim() || null,
      contactName: view.installation?.contactName?.trim() || null,
      description: view.installation?.description?.trim() || null,
    },
    capabilities: {
      remote: view.capabilities?.remote
        ? {
            kind: "remote",
            externalId: view.capabilities.remote.externalId?.trim() || null,
            status: normalizeRemoteStatus(view.capabilities.remote.status),
            statusText: view.capabilities.remote.statusText?.trim() || null,
            lastSyncAt: view.capabilities.remote.lastSyncAt?.trim() || null,
            ready: Boolean(view.capabilities.remote.ready),
          }
        : null,
    },
    conversationTags: view.conversationTags ?? [],
  };
}

function normalizeRemoteStatus(status?: string): "ready" | "pending" | "offline" {
  if (status === "ready" || status === "pending") return status;
  return "offline";
}
