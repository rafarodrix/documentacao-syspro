import { z } from "zod";

export const remoteDesiredStateSchema = z.object({
  enabled: z.boolean(),
  version: z.string().trim(),
  mode: z.string().trim().optional(),
  install_if_missing: z.boolean().optional(),
  bootstrap_enabled: z.boolean().optional(),
  sync_enabled: z.boolean().optional(),
});

export const tunnelDesiredStateSchema = z.object({
  enabled: z.boolean(),
  version: z.string().trim(),
  server_host: z.string().trim(),
  server_port: z.number().int(),
  remote_port: z.number().int(),
  local_target: z.string().trim(),
  token: z.string().trim(),
});

export const backupDesiredStateSchema = z.object({
  enabled: z.boolean(),
  version: z.string().trim(),
  schedule: z.string().trim(),
  retention_days: z.number().int(),
  target: z.string().trim(),
});

export const supportDesiredStateSchema = z.object({
  enabled: z.boolean(),
  version: z.string().trim(),
  provider: z.string().trim(),
  widget_base_url: z.string().trim(),
  auto_attach_context: z.boolean(),
});

export const deviceDesiredStateSchema = z.object({
  enabled: z.boolean(),
  version: z.string().trim(),
  collect_inventory: z.boolean(),
  collect_metrics: z.boolean(),
});

export const agentDesiredStateSchema = z.object({
  version: z.number().int(),
  updated_at: z.string().trim().min(1),
  remote: remoteDesiredStateSchema,
  tunnel: tunnelDesiredStateSchema,
  backup: backupDesiredStateSchema,
  support: supportDesiredStateSchema,
  device: deviceDesiredStateSchema,
});

export type AgentDesiredState = z.infer<typeof agentDesiredStateSchema>;
