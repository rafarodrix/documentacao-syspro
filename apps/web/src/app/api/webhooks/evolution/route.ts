import { NextRequest, NextResponse } from "next/server";
import { whatsAppInboundService } from "@/features/conversations/application/whatsapp-inbound.service";
import { evolutionWhatsApp } from "@/features/conversations/infrastructure/gateways/evolution-whatsapp.gateway";

/**
 * Webhook para receber eventos da Evolution API (WhatsApp).
 * Foco: 'messages.upsert' para capturar novas mensagens recebidas.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validacao basica de seguranca (opcional, se a Evolution enviar segredo)
    const apiKey = req.headers.get("apikey");
    if (process.env.EVOLUTION_WEBHOOK_SECRET && apiKey !== process.env.EVOLUTION_WEBHOOK_SECRET) {
      console.warn("[WebhookEvolution] Chamada com apikey invalida.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const event = payload.event;
    
    // 2. Filtra apenas mensagens recebidas (upsert)
    // A Evolution API envia 'messages.upsert' para novas mensagens
    if (event !== "messages.upsert") {
      return NextResponse.json({ status: "ignored_event", event });
    }

    const data = payload.data;
    if (!data || !data.message) {
      return NextResponse.json({ status: "no_message_data" });
    }

    // 3. Extrai dados da mensagem
    const remoteJid = data.key.remoteJid;
    const fromMe = data.key.fromMe;
    
    // Ignora mensagens enviadas pelo proprio bot
    if (fromMe) {
      return NextResponse.json({ status: "ignored_from_me" });
    }

    // Extrai o texto da mensagem (pode estar em varios formatos na Evolution)
    const messageText = 
      data.message.conversation || 
      data.message.extendedTextMessage?.text || 
      data.message.imageMessage?.caption || 
      "";

    if (!messageText) {
      return NextResponse.json({ status: "no_text_content" });
    }

    // 4. Extrai o telefone (remove @s.whatsapp.net)
    const phone = remoteJid.split("@")[0];
    const pushName = data.pushName || "Cliente WhatsApp";

    // 5. Encaminha para o Service de Inbound (Integracao Zammad)
    const result = await whatsAppInboundService.handleInboundMessage(
      phone,
      messageText,
      pushName
    );

    // 6. Responde ao usuario no WhatsApp com o status do ticket
    if (result.success && result.ticketNumber) {
      const confirmationMsg = `✅ *Recebido!*\n\nSeu atendimento foi registrado no chamado *#${result.ticketNumber}*.\n\nNossa equipe analisará sua mensagem em breve.\n\n_Para acompanhar detalhes, acesse o Portal Syspro._`;
      
      await evolutionWhatsApp.sendTextMessage(phone, confirmationMsg);
    }

    return NextResponse.json({ 
      status: "processed", 
      success: result.success, 
      ticketNumber: result.ticketNumber 
    });

  } catch (error) {
    console.error("[WebhookEvolution] Erro no processamento:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
