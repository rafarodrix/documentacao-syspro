import type { EvolutionProviderTransportMode, EvolutionSettings } from '@dosc-syspro/contracts/evolution';
import { ensureRequiredEvolutionSubscribe } from './evolution-webhook-subscribe';

export type EvolutionConnectConfigSource = Pick<
  EvolutionSettings,
  'webhookUrl' | 'subscribe' | 'immediate' | 'phone' | 'rabbitmqEnable' | 'websocketEnable' | 'natsEnable'
>;

export type EvolutionConnectConfigPayload = {
  webhookUrl: string;
  subscribe: string[];
  immediate: boolean;
  phone?: string;
  rabbitmqEnable?: 'enabled';
  websocketEnable?: 'enabled';
  natsEnable?: 'enabled';
};

export function buildEvolutionConnectConfig(
  source: Partial<EvolutionConnectConfigSource> | Record<string, unknown> | null | undefined,
): EvolutionConnectConfigPayload | null {
  const webhookUrl = readTrimmedString(source?.webhookUrl);
  if (!webhookUrl) return null;

  const phone = readTrimmedString(source?.phone);
  const subscribe = Array.isArray(source?.subscribe)
    ? source.subscribe.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];

  const rabbitmqEnable = resolveEvolutionTransportMode(source?.rabbitmqEnable);
  const websocketEnable = resolveEvolutionTransportMode(source?.websocketEnable);
  const natsEnable = resolveEvolutionTransportMode(source?.natsEnable);

  return {
    webhookUrl,
    subscribe: ensureRequiredEvolutionSubscribe(subscribe),
    immediate: source?.immediate !== false,
    ...(phone ? { phone } : {}),
    ...(rabbitmqEnable === 'enabled' ? { rabbitmqEnable } : {}),
    ...(websocketEnable === 'enabled' ? { websocketEnable } : {}),
    ...(natsEnable === 'enabled' ? { natsEnable } : {}),
  };
}

export function readEvolutionConnectConfigSource(
  metadata?: Record<string, unknown> | null,
): Record<string, unknown> {
  const source = metadata && typeof metadata === 'object' ? metadata : {};
  const evolution =
    source.evolution && typeof source.evolution === 'object'
      ? (source.evolution as Record<string, unknown>)
      : source;

  return evolution;
}

function resolveEvolutionTransportMode(value: unknown): EvolutionProviderTransportMode {
  if (value === true) return 'enabled';

  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'enabled' ? 'enabled' : 'default';
}

function readTrimmedString(value: unknown): string {
  return String(value ?? '').trim();
}
