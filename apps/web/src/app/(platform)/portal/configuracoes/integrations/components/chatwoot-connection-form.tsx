"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ChatwootIntegrationSettings } from "@dosc-syspro/contracts/chatwoot";
import { Input } from "@dosc-syspro/ui";
import { FormField } from "../integration-form-primitives";

export function ChatwootConnectionForm({
  integrationSettings,
  setIntegrationSettings,
}: {
  integrationSettings: ChatwootIntegrationSettings;
  setIntegrationSettings: Dispatch<SetStateAction<ChatwootIntegrationSettings>>;
}) {
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <FormField id="chatwoot-url" label="URL">
        <Input
          id="chatwoot-url"
          value={integrationSettings.url}
          onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, url: event.target.value }))}
          placeholder="https://chatwoot.seudominio.com"
        />
      </FormField>
      <FormField id="chatwoot-account-id" label="Account ID">
        <Input
          id="chatwoot-account-id"
          value={integrationSettings.accountId}
          onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, accountId: event.target.value }))}
          placeholder="1"
        />
      </FormField>
      <FormField id="chatwoot-api-token" label="API Token">
        <Input
          id="chatwoot-api-token"
          type="password"
          value={integrationSettings.apiToken}
          onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, apiToken: event.target.value }))}
          placeholder="Token principal do Chatwoot"
        />
      </FormField>
      <FormField id="chatwoot-platform-api-token" label="Platform API Token">
        <Input
          id="chatwoot-platform-api-token"
          type="password"
          value={integrationSettings.platformApiToken}
          onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, platformApiToken: event.target.value }))}
          placeholder="Token da Platform API"
        />
      </FormField>
      <FormField id="chatwoot-inbox-id" label="Inbox ID">
        <Input
          id="chatwoot-inbox-id"
          value={integrationSettings.inboxId}
          onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, inboxId: event.target.value }))}
          placeholder="123"
        />
      </FormField>
      <FormField id="chatwoot-inbox-identifier" label="Inbox Identifier">
        <Input
          id="chatwoot-inbox-identifier"
          value={integrationSettings.inboxIdentifier}
          onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, inboxIdentifier: event.target.value }))}
          placeholder="whatsapp-suporte"
        />
      </FormField>
      <FormField id="chatwoot-webhook-secret" label="Webhook Secret">
        <Input
          id="chatwoot-webhook-secret"
          type="password"
          value={integrationSettings.webhookSecret}
          onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, webhookSecret: event.target.value }))}
          placeholder="Secret do webhook"
        />
      </FormField>
      <FormField
        id="chatwoot-webhook-skew"
        label="Tolerancia do webhook"
        description="Janela em segundos para assinatura e clock skew."
      >
        <Input
          id="chatwoot-webhook-skew"
          type="number"
          min={1}
          max={3600}
          value={integrationSettings.webhookMaxSkewSeconds}
          onChange={(event) =>
            setIntegrationSettings((prev) => ({
              ...prev,
              webhookMaxSkewSeconds: Number(event.target.value || prev.webhookMaxSkewSeconds),
            }))
          }
        />
      </FormField>
    </div>
  );
}
