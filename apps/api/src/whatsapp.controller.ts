import { Body, Controller, HttpCode, HttpStatus, Post, Headers, UnauthorizedException } from "@nestjs/common";
import { WhatsAppInboundService } from "./whatsapp-inbound.service";
import { assertInternalApiKey } from "./internal-api-auth";
import { EvolutionClient, readEvolutionConfigFromRuntime } from "./integrations/evolution.client";

type EvolutionMessageContent = {
  conversation?: string;
  extendedTextMessage?: { text?: string };
  imageMessage?: { caption?: string };
};

function extractMessageText(message: EvolutionMessageContent): string {
  const conversation = typeof message.conversation === "string" ? message.conversation : "";
  const extendedText = message.extendedTextMessage?.text ?? "";
  const imageCaption = message.imageMessage?.caption ?? "";
  return (conversation || extendedText || imageCaption || "").trim();
}

function extractPhoneCandidate(raw: string | null): string {
  if (!raw) return "";
  const beforeAt = raw.split("@")[0] ?? raw;
  const beforeColon = beforeAt.split(":")[0] ?? beforeAt;
  return beforeColon.replace(/\D/g, "");
}

function parseEvolutionInbound(payloadRaw: unknown): {
  phone: string;
  messageText: string;
  contactName: string;
  externalMessageId: string | null;
  event: string;
} | null {
  if (!payloadRaw || typeof payloadRaw !== "object") return null;
  const root = payloadRaw as Record<string, unknown>;
  const event = typeof root.event === "string" ? root.event : "unknown";
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : null;
  if (!data || event !== "MESSAGE") return null;

  const info = data.Info && typeof data.Info === "object"
    ? (data.Info as Record<string, unknown>)
    : data.info && typeof data.info === "object"
      ? (data.info as Record<string, unknown>)
      : null;

  const message = data.Message && typeof data.Message === "object"
    ? (data.Message as EvolutionMessageContent)
    : data.message && typeof data.message === "object"
      ? (data.message as EvolutionMessageContent)
      : null;

  const remoteJid =
    (typeof info?.Chat === "string" ? info.Chat : "") ||
    (typeof info?.chat === "string" ? info.chat : "") ||
    (typeof data.remoteJid === "string" ? data.remoteJid : "");
  const fromMe = Boolean(info?.IsFromMe ?? data.fromMe ?? false);

  if (fromMe) {
    return {
      phone: "",
      messageText: "",
      contactName: "",
      externalMessageId: null,
      event,
    };
  }

  const messageText = message ? extractMessageText(message) : "";
  return {
    phone: extractPhoneCandidate(remoteJid),
    messageText,
    contactName:
      (typeof info?.PushName === "string" ? info.PushName : "") ||
      (typeof data.pushName === "string" ? data.pushName : "") ||
      "Cliente WhatsApp",
    externalMessageId:
      (typeof info?.ID === "string" ? info.ID : null) ||
      (typeof data.id === "string" ? data.id : null),
    event,
  };
}

@Controller("webhooks/evolution")
export class WhatsAppController {
  constructor(private readonly inboundService: WhatsAppInboundService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleEvolutionWebhook(
    @Body() body: unknown,
    @Headers("apikey") apiKeyHeader: string | undefined,
    @Headers("x-internal-api-key") internalApiKeyHeader: string | undefined,
  ) {
    assertInternalApiKey(internalApiKeyHeader);

    const config = readEvolutionConfigFromRuntime();
    if (config.webhookSecret && apiKeyHeader !== config.webhookSecret) {
      throw new UnauthorizedException("Unauthorized");
    }

    const inbound = parseEvolutionInbound(body);
    if (!inbound) {
      const event =
        body && typeof body === "object" && typeof (body as Record<string, unknown>).event === "string"
          ? ((body as Record<string, unknown>).event as string)
          : "unknown";
      return { status: "ignored_event", event };
    }

    if (!inbound.phone && !inbound.messageText) {
      return { status: "ignored_from_me" };
    }

    if (!inbound.messageText) {
      return { status: "no_text_content" };
    }

    const result = await this.inboundService.handleInboundMessage({
      phone: inbound.phone,
      text: inbound.messageText,
      contactName: inbound.contactName,
      externalMessageId: inbound.externalMessageId,
      providerPayload: body,
    });

    if (result.success && result.ticketNumber && !result.duplicate) {
      const confirmationMsg =
        `Recebido.\n\nSeu atendimento foi registrado no chamado #${result.ticketNumber}.\n\n` +
        "Nossa equipe analisara sua mensagem em breve.\n\n" +
        "_Para acompanhar detalhes, acesse o Portal Syspro._";
      const evolutionClient = EvolutionClient.fromRuntime();
      await evolutionClient.sendTextMessage(inbound.phone, confirmationMsg);
    }

    return {
      success: true,
      status: "processed",
      duplicate: Boolean(result.duplicate),
      ticketNumber: result.ticketNumber,
    };
  }
}
