import { readEvolutionRuntimeConfig } from '@dosc-syspro/config';

export type EvolutionConnectionConfig = {
  apiUrl: string;
  apiKey: string;
  instance: string;
};

export type EvolutionContact = {
  remoteId?: string;
  name: string;
  whatsapp: string;
  profilePictureUrl?: string | null;
};

export type EvolutionOutboundErrorCode =
  | 'WHATSAPP_NUMBER_NOT_REGISTERED'
  | 'EVOLUTION_PROVIDER_ERROR';

export class EvolutionOutboundError extends Error {
  constructor(
    message: string,
    public readonly code: EvolutionOutboundErrorCode,
    public readonly providerStatus: number,
    public readonly providerBody: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'EvolutionOutboundError';
  }
}

export class EvolutionMessageDeleteError extends Error {
  constructor(
    message: string,
    public readonly providerStatus: number,
    public readonly providerBody: string,
  ) {
    super(message);
    this.name = 'EvolutionMessageDeleteError';
  }
}

export function readEvolutionConfigFromRuntime(): EvolutionConnectionConfig {
  const config = readEvolutionRuntimeConfig();
  return {
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    instance: config.instance,
  };
}

export abstract class EvolutionClient {
  abstract fetchContacts(config: EvolutionConnectionConfig): Promise<EvolutionContact[]>;

  abstract sendTextMessage(
    config: EvolutionConnectionConfig,
    number: string,
    text: string,
    clientMessageId?: string,
    quotedMessageId?: string,
  ): Promise<{ messageId?: string; resolvedWhatsappNumber?: string }>;

  abstract sendMedia(
    config: EvolutionConnectionConfig,
    number: string,
    mediaUrlOrBase64: string,
    mediaType: string,
    fileName?: string,
    caption?: string,
    clientMessageId?: string,
    quotedMessageId?: string,
  ): Promise<{ messageId?: string; resolvedWhatsappNumber?: string }>;

  abstract sendStickerMessage(
    config: EvolutionConnectionConfig,
    number: string,
    stickerUrlOrBase64: string,
    clientMessageId?: string,
    quotedMessageId?: string,
  ): Promise<{ messageId?: string; resolvedWhatsappNumber?: string }>;

  abstract deleteMessageForEveryone(
    config: EvolutionConnectionConfig,
    input: {
      messageId: string;
      remoteJid: string;
      fromMe?: boolean;
      participant?: string | null;
    },
  ): Promise<void>;

  abstract fetchProfilePicture(
    config: EvolutionConnectionConfig,
    number: string,
  ): Promise<{ profilePictureUrl?: string }>;
}
