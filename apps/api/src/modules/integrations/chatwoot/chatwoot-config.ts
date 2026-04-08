import { readChatwootRuntimeConfig } from '@dosc-syspro/config';

function hasAnyChatwootValue(config: ReturnType<typeof readChatwootRuntimeConfig>): boolean {
  return Boolean(
    config.url ||
    config.accountId ||
    config.apiToken ||
    config.inboxId ||
    config.inboxIdentifier ||
    config.webhookSecret
  );
}

export function validateChatwootRuntimeConfigOrThrow(): void {
  const config = readChatwootRuntimeConfig();
  if (!hasAnyChatwootValue(config)) return;

  const errors: string[] = [];

  if (!config.url) errors.push('CHATWOOT_URL ausente');
  if (!config.accountId) errors.push('CHATWOOT_ACCOUNT_ID ausente');
  if (!config.apiToken) errors.push('CHATWOOT_API_TOKEN ausente');
  if (!config.inboxId && !config.inboxIdentifier) {
    errors.push('defina CHATWOOT_INBOX_ID ou CHATWOOT_INBOX_IDENTIFIER');
  }

  if (config.inboxId && !/^\d+$/.test(config.inboxId)) {
    errors.push('CHATWOOT_INBOX_ID deve ser numerico');
  }

  if (config.inboxIdentifier && /^\d+$/.test(config.inboxIdentifier)) {
    errors.push('CHATWOOT_INBOX_IDENTIFIER nao deve ser numerico (use CHATWOOT_INBOX_ID para id numerico)');
  }

  if (errors.length > 0) {
    throw new Error(`Configuracao Chatwoot invalida: ${errors.join('; ')}`);
  }
}

