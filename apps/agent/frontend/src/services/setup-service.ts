import { GetSetupStatus, OpenSetupExperience } from "../bindings";
import { uistate } from "../../wailsjs/go/models";
import type { SetupStatusView, SetupStepView } from "../types/agent-ui";

export const defaultSetupStatusView: SetupStatusView = {
  complete: false,
  stage: "Inicializando",
  title: "Provisionamento do Agente",
  summary: "Preparando contexto inicial do agente.",
  progressPct: 0,
  lastError: null,
  steps: [],
  device: {
    deviceId: null,
  },
  installation: {
    companyName: null,
    hostId: null,
  },
  capabilities: {
    remote: null,
  },
};

export async function fetchSetupStatus(): Promise<SetupStatusView> {
  const status = await GetSetupStatus();
  return mapSetupStatus(status);
}

export async function openSetupExperience(): Promise<void> {
  await OpenSetupExperience();
}

export function mapSetupStatus(status: uistate.SetupStatus): SetupStatusView {
  return {
    complete: Boolean(status.complete),
    stage: status.stage ?? "",
    title: status.title ?? "",
    summary: status.summary ?? "",
    progressPct: Number(status.progress_pct ?? 0),
    lastError: status.last_error?.trim() || null,
    steps: (status.steps ?? []).map(mapSetupStep),
    device: {
      deviceId: null,
    },
    installation: {
      companyName: status.company_name?.trim() || null,
      hostId: status.host_id?.trim() || null,
    },
    capabilities: {
      remote: {
        kind: "remote",
        externalId: status.rustdesk_id?.trim() || null,
        accessPassword: null,
        status: status.rustdesk_id?.trim() ? "ready" : "offline",
        statusText: status.rustdesk_id?.trim() ? "identificacao remota pronta" : null,
        ready: Boolean(status.rustdesk_id?.trim()),
      },
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
