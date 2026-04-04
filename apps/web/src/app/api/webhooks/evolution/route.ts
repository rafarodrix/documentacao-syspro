import { NextRequest, NextResponse } from "next/server";
import { evolutionMessageEventSchema, evolutionWebhookEnvelopeSchema } from "@dosc-syspro/contracts";
import { readEvolutionConfig } from "@dosc-syspro/api/services/evolution-config";
import { whatsAppInboundService } from "@/features/conversations/application/whatsapp-inbound.service";
import { evolutionWhatsApp } from "@/features/conversations/infrastructure/gateways/evolution-whatsapp.gateway";

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
  const parsed = evolutionMessageEventSchema.safeParse(payloadRaw);
  if (!parsed.success) return null;

  const info = parsed.data.data.Info ?? parsed.data.data.info;
  const message = parsed.data.data.Message ?? parsed.data.data.message;
  const remoteJid = info?.Chat || info?.chat || parsed.data.data.remoteJid || "";
  const fromMe = info?.IsFromMe || parsed.data.data.fromMe || false;

  if (fromMe) {
    return {
      phone: "",
      messageText: "",
      contactName: "",
      externalMessageId: null,
      event: parsed.data.event,
    };
  }

  const messageText = message ? extractMessageText(message) : "";
  return {
    phone: extractPhoneCandidate(remoteJid),
    messageText,
    contactName: info?.PushName || parsed.data.data.pushName || "Cliente WhatsApp",
    externalMessageId: info?.ID || parsed.data.data.id || null,
    event: parsed.data.event,
  };
}

export async function POST(req: NextRequest) {
  try {
    const config = readEvolutionConfig(process.env);
    const apiKey = req.headers.get("apikey");

    if (config.webhookSecret && apiKey !== config.webhookSecret) {
      console.warn("[WebhookEvolution] Chamada com apikey invalida.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payloadRaw = await req.json();
    const inbound = parseEvolutionInbound(payloadRaw);
    if (!inbound) {
      const envelope = evolutionWebhookEnvelopeSchema.safeParse(payloadRaw);
      const event = envelope.success ? envelope.data.event : "unknown";
      return NextResponse.json({ status: "ignored_event", event });
    }

    if (!inbound.phone && !inbound.messageText) {
      return NextResponse.json({ status: "ignored_from_me" });
    }

    if (!inbound.messageText) {
      return NextResponse.json({ status: "no_text_content" });
    }

    const result = await whatsAppInboundService.handleInboundMessage({
      phone: inbound.phone,
      text: inbound.messageText,
      contactName: inbound.contactName,
      externalMessageId: inbound.externalMessageId,
      providerPayload: payloadRaw,
    });

    if (result.success && result.ticketNumber && !result.duplicate) {
      const confirmationMsg =
        `Recebido.\n\nSeu atendimento foi registrado no chamado #${result.ticketNumber}.\n\n` +
        "Nossa equipe analisara sua mensagem em breve.\n\n" +
        "_Para acompanhar detalhes, acesse o Portal Syspro._";
      await evolutionWhatsApp.sendTextMessage(inbound.phone, confirmationMsg);
    }

    return NextResponse.json({
      status: "processed",
      success: result.success,
      duplicate: Boolean(result.duplicate),
      ticketNumber: result.ticketNumber,
    });
  } catch (error) {
    console.error("[WebhookEvolution] Erro no processamento:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
