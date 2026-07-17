import { GetAgentSetupView, OpenSetupExperience } from "../bindings";
import { uistate } from "../../wailsjs/go/models";
import type { AgentSetupViewModel, SetupStepView } from "../types/agent-ui";

export const defaultAgentSetupViewModel: AgentSetupViewModel = {
  complete: false,
  stage: "Inicializando",
  title: "Provisionamento do Agente",
  summary: "Preparando contexto inicial do agente.",
  progressPct: 0,
  lastError: null,
  steps: [],
  device: {
    deviceId: null,
    hostname: null,
    machineName: null,
  },
  installation: {
    companyName: null,
    hostId: null,
    hostAlias: null,
  },
  capabilities: {
    remote: null,
  },
};

export async function fetchAgentSetupView(): Promise<AgentSetupViewModel> {
  const view = await GetAgentSetupView();
  return normalizeAgentSetupView(view);
}

export async function openSetupExperience(): Promise<void> {
  await OpenSetupExperience();
}

export function normalizeAgentSetupView(view: uistate.AgentSetupView): AgentSetupViewModel {
  return {
    complete: Boolean(view.complete),
    stage: view.stage ?? "",
    title: view.title ?? "",
    summary: view.summary ?? "",
    progressPct: Number(view.progressPct ?? 0),
    lastError: view.lastError?.trim() || null,
    steps: (view.steps ?? []).map(mapSetupStep),
    device: {
      deviceId: view.device?.deviceId?.trim() || null,
      hostname: view.device?.hostname?.trim() || null,
      machineName: view.device?.machineName?.trim() || null,
    },
    installation: {
      companyName: view.installation?.companyName?.trim() || null,
      hostId: view.installation?.hostId?.trim() || null,
      hostAlias: view.installation?.hostAlias?.trim() || null,
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
  };
}

function mapSetupStep(step: uistate.SetupStep): SetupStepView {
  return {
    key: step.key ?? "",
    label: step.label ?? "",
    status: normalizeSetupStepStatus(step.status),
    detail: step.detail ?? "",
  };
}

function normalizeSetupStepStatus(status?: string): SetupStepView["status"] {
  if (status === "complete" || status === "error") return status;
  return "pending";
}

function normalizeRemoteStatus(status?: string): "ready" | "pending" | "offline" {
  if (status === "ready" || status === "pending") return status;
  return "offline";
}
