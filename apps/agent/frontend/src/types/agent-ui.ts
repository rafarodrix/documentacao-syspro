export type SetupStepStatus = "complete" | "error" | "pending";

export type SetupStepView = {
  key: string;
  label: string;
  status: SetupStepStatus;
  detail: string;
};

export type DeviceView = {
  deviceId: string | null;
  hostname: string | null;
  os: string | null;
  localUsername: string | null;
  machineName: string | null;
  agentVersion: string | null;
};

export type InstallationView = {
  companyId: string | null;
  companyName: string | null;
  hostId: string | null;
  hostAlias: string | null;
  contactName: string | null;
  description: string | null;
};

export type RemoteCapabilityStatus = "ready" | "pending" | "offline";

export type RemoteCapabilityView = {
  kind: "remote";
  externalId: string | null;
  accessPassword: string | null;
  status: RemoteCapabilityStatus;
  statusText: string | null;
  ready: boolean;
};

export type AgentCapabilitiesView = {
  remote: RemoteCapabilityView | null;
};

export type SetupStatusView = {
  complete: boolean;
  stage: string;
  title: string;
  summary: string;
  progressPct: number;
  lastError: string | null;
  steps: SetupStepView[];
  device: Pick<DeviceView, "deviceId">;
  installation: Pick<InstallationView, "companyName" | "hostId">;
  capabilities: AgentCapabilitiesView;
};

export type SupportSessionView = {
  channel: {
    baseUrl: string;
    websiteToken: string;
    configured: boolean;
  };
  device: DeviceView;
  installation: InstallationView;
  capabilities: AgentCapabilitiesView;
  conversationTags: string[];
};

export type NotificationView = {
  id: string;
  title: string;
  message: string;
  severity: string;
  occurredAt: Date | null;
};
