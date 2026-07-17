import {
  GetSupportSession,
  OpenRemoteClient,
  OpenSupportConversation,
  SyncSupportConversationContext,
} from "../bindings";
import { domain, uistate } from "../../wailsjs/go/models";
import type { SupportSessionView } from "../types/agent-ui";

export async function fetchSupportSession(): Promise<SupportSessionView> {
  const session = await GetSupportSession();
  return mapSupportSession(session);
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

export function mapSupportSession(session: uistate.SupportSession): SupportSessionView {
  return {
    channel: {
      baseUrl: session.base_url?.trim() || "",
      websiteToken: session.website_token?.trim() || "",
      configured: Boolean(session.base_url?.trim() && session.website_token?.trim()),
    },
    device: {
      deviceId: session.context?.deviceId?.trim() || null,
      hostname: session.context?.hostname?.trim() || null,
      os: session.context?.os?.trim() || null,
      localUsername: session.context?.localUsername?.trim() || null,
      machineName: session.context?.machineName?.trim() || null,
      agentVersion: session.context?.agentVersion?.trim() || null,
    },
    installation: {
      companyId: session.context?.companyId?.trim() || null,
      companyName: session.context?.companyDisplayName?.trim() || null,
      hostId: session.context?.hostId?.trim() || null,
      hostAlias: session.context?.hostAlias?.trim() || null,
      contactName: session.context?.contactName?.trim() || null,
      description: session.context?.description?.trim() || null,
    },
    capabilities: {
      remote: mapRemoteCapability(session.context),
    },
    conversationTags: session.context?.conversationTags ?? [],
  };
}

function mapRemoteCapability(context?: domain.SupportContext): SupportSessionView["capabilities"]["remote"] {
  if (!context) return null;

  const externalId = context.rustdeskId?.trim() || null;
  const status = normalizeRemoteStatus(context.remoteStatus);
  const statusText = context.remoteStatusText?.trim() || null;

  return {
    kind: "remote",
    externalId,
    accessPassword: context.remoteAccessPassword?.trim() || null,
    status,
    statusText,
    ready: Boolean(externalId),
  };
}

function normalizeRemoteStatus(status?: string): "ready" | "pending" | "offline" {
  if (status === "ready" || status === "pending") return status;
  return "offline";
}
