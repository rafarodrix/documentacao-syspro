import { NextRequest, NextResponse } from "next/server";
import { evolutionMessageUpsertPayloadSchema } from "@dosc-syspro/contracts";
import { readEvolutionConfig } from "@dosc-syspro/api/services/evolution-config";
import { whatsAppInboundService } from "@/features/conversations/application/whatsapp-inbound.service";
import { evolutionWhatsApp } from "@/features/conversations/infrastructure/gateways/evolution-whatsapp.gateway";

function extractMessageText(message: Record<string, unknown>): string {
  const conversation = typeof message.conversation === "string" ? message.conversation : "";
  const extendedText = (message.extendedTextMessage as { text?: string } | undefined)?.text ?? "";
  const imageCaption = (message.imageMessage as { caption?: string } | undefined)?.caption ?? "";
  return (conversation || extendedText || imageCaption || "").trim();
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
    const payloadParsed = evolutionMessageUpsertPayloadSchema.safeParse(payloadRaw);

    if (!payloadParsed.success) {
      const event = typeof payloadRaw?.event === "string" ? payloadRaw.event : "unknown";
      return NextResponse.json({ status: "ignored_event", event });
    }

    const payload = payloadParsed.data;
    const { key, message, pushName } = payload.data;

    if (key.fromMe) {
      return NextResponse.json({ status: "ignored_from_me" });
    }

    const messageText = extractMessageText(message);
    if (!messageText) {
      return NextResponse.json({ status: "no_text_content" });
    }

    const phone = key.remoteJid.split("@")[0] ?? "";
    const result = await whatsAppInboundService.handleInboundMessage({
      phone,
      text: messageText,
      contactName: pushName || "Cliente WhatsApp",
      externalMessageId: key.id,
      providerPayload: payload,
    });

    if (result.success && result.ticketNumber && !result.duplicate) {
      const confirmationMsg =
        `Recebido.\n\nSeu atendimento foi registrado no chamado #${result.ticketNumber}.\n\n` +
        "Nossa equipe analisara sua mensagem em breve.\n\n" +
        "_Para acompanhar detalhes, acesse o Portal Syspro._";
      await evolutionWhatsApp.sendTextMessage(phone, confirmationMsg);
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
