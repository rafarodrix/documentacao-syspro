import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ConversationStatus } from "@prisma/client";
import { PrismaService } from "./prisma/prisma.service";
import { assertInternalApiKey } from "./internal-api-auth";
import { EvolutionClient } from "./integrations/evolution.client";

type ConversationTabFilter = "ATENDENDO" | "ESPERA";

@Controller("conversations")
export class ConversationsController {
  constructor(private readonly prisma: PrismaService) {}

  private ensureInternalAuth(internalApiKeyHeader: string | undefined) {
    assertInternalApiKey(internalApiKeyHeader);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listConversations(
    @Headers("x-internal-api-key") internalApiKeyHeader: string | undefined,
    @Query("filter") filter: ConversationTabFilter | undefined,
  ) {
    this.ensureInternalAuth(internalApiKeyHeader);

    const resolvedFilter: ConversationTabFilter = filter === "ESPERA" ? "ESPERA" : "ATENDENDO";
    const statusFilter =
      resolvedFilter === "ATENDENDO"
        ? { in: ["IN_PROGRESS", "WAITING_CUSTOMER"] as ConversationStatus[] }
        : { in: ["NEW", "UNASSIGNED"] as ConversationStatus[] };

    try {
      const data = await this.prisma.conversation.findMany({
        where: { status: statusFilter },
        orderBy: { lastMessageAt: "desc" },
        include: {
          company: true,
          companyContact: true,
        },
      });

      return { success: true, data };
    } catch (error) {
      return { success: false, error: "DB_ERROR" as const, detail: String(error) };
    }
  }

  @Get(":conversationId")
  @HttpCode(HttpStatus.OK)
  async getConversation(
    @Headers("x-internal-api-key") internalApiKeyHeader: string | undefined,
    @Param("conversationId") conversationId: string,
  ) {
    this.ensureInternalAuth(internalApiKeyHeader);

    try {
      const data = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          company: true,
          companyContact: true,
        },
      });

      if (!data) {
        return { success: false, error: "NOT_FOUND" as const };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: "DB_ERROR" as const, detail: String(error) };
    }
  }

  @Get(":conversationId/messages")
  @HttpCode(HttpStatus.OK)
  async getConversationMessages(
    @Headers("x-internal-api-key") internalApiKeyHeader: string | undefined,
    @Param("conversationId") conversationId: string,
  ) {
    this.ensureInternalAuth(internalApiKeyHeader);

    try {
      const data = await this.prisma.conversationMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: "DB_ERROR" as const, detail: String(error) };
    }
  }

  @Post("send")
  @HttpCode(HttpStatus.OK)
  async sendConversationMessage(
    @Headers("x-internal-api-key") internalApiKeyHeader: string | undefined,
    @Body()
    body: {
      conversationId?: string;
      text?: string;
      userId?: string;
    },
  ) {
    this.ensureInternalAuth(internalApiKeyHeader);

    const conversationId = body.conversationId?.trim() ?? "";
    const text = body.text?.trim() ?? "";
    const userId = body.userId?.trim() ?? "";

    if (!conversationId || !text || !userId) {
      return { success: false, error: "INVALID_PAYLOAD" as const };
    }

    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation || !conversation.contactWhatsappSnapshot) {
        return { success: false, error: "NOT_FOUND" as const };
      }

      await this.prisma.conversationMessage.create({
        data: {
          conversationId,
          direction: "OUTBOUND",
          type: "TEXT",
          authorKind: "USER",
          authorUserId: userId,
          body: text,
          status: "SENT",
          sentAt: new Date(),
        },
      });

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessagePreview: text.substring(0, 50),
          lastOutboundAt: new Date(),
          lastMessageAt: new Date(),
          status: conversation.status === "NEW" ? "IN_PROGRESS" : conversation.status,
        },
      });

      const evolutionClient = EvolutionClient.fromRuntime();
      await evolutionClient.sendTextMessage(conversation.contactWhatsappSnapshot, text);

      return { success: true };
    } catch (error) {
      return { success: false, error: "DISPATCH_FAILED" as const, detail: String(error) };
    }
  }

  @Post("resolve")
  @HttpCode(HttpStatus.OK)
  async resolveConversation(
    @Headers("x-internal-api-key") internalApiKeyHeader: string | undefined,
    @Body()
    body: {
      conversationId?: string;
      userId?: string;
    },
  ) {
    this.ensureInternalAuth(internalApiKeyHeader);

    const conversationId = body.conversationId?.trim() ?? "";
    const userId = body.userId?.trim() ?? "";

    if (!conversationId || !userId) {
      return { success: false, error: "INVALID_PAYLOAD" as const };
    }

    try {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: "RESOLVED",
          closedAt: new Date(),
          resolvedByUserId: userId,
        },
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: "DB_ERROR" as const, detail: String(error) };
    }
  }

  @Post("link")
  @HttpCode(HttpStatus.OK)
  async linkConversationToCompany(
    @Headers("x-internal-api-key") internalApiKeyHeader: string | undefined,
    @Body()
    body: {
      conversationId?: string;
      companyId?: string;
      contactName?: string;
    },
  ) {
    this.ensureInternalAuth(internalApiKeyHeader);

    const conversationId = body.conversationId?.trim() ?? "";
    const companyId = body.companyId?.trim() ?? "";
    const contactName = body.contactName?.trim() ?? "Contato Novo";

    if (!conversationId || !companyId) {
      return { success: false, error: "INVALID_PAYLOAD" as const };
    }

    try {
      const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
      if (!conversation || !conversation.contactWhatsappSnapshot) {
        return { success: false, error: "NOT_FOUND" as const };
      }

      let contact = await this.prisma.companyContact.findFirst({
        where: { whatsapp: conversation.contactWhatsappSnapshot, companyId },
      });

      if (!contact) {
        contact = await this.prisma.companyContact.create({
          data: {
            companyId,
            name: contactName,
            whatsapp: conversation.contactWhatsappSnapshot,
            source: "WHATSAPP",
            status: "LINKED",
          },
        });
      }

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          companyId,
          companyContactId: contact.id,
        },
      });

      return { success: true, data: contact };
    } catch (error) {
      return { success: false, error: "DB_ERROR" as const, detail: String(error) };
    }
  }

  @Post("start-outbound")
  @HttpCode(HttpStatus.OK)
  async startOutboundConversation(
    @Headers("x-internal-api-key") internalApiKeyHeader: string | undefined,
    @Body()
    body: {
      contactId?: string;
      userId?: string;
    },
  ) {
    this.ensureInternalAuth(internalApiKeyHeader);

    const contactId = body.contactId?.trim() ?? "";
    const userId = body.userId?.trim() ?? "";

    if (!contactId || !userId) {
      return { success: false, error: "INVALID_PAYLOAD" as const };
    }

    try {
      const contact = await this.prisma.companyContact.findUnique({
        where: { id: contactId },
        include: { company: true },
      });

      if (!contact || !contact.whatsapp) {
        return { success: false, error: "CONTACT_NOT_FOUND" as const };
      }

      const activeConv = await this.prisma.conversation.findFirst({
        where: {
          contactWhatsappSnapshot: contact.whatsapp,
          status: { in: ["NEW", "UNASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER"] as ConversationStatus[] },
        },
      });

      if (activeConv) {
        return { success: true, data: activeConv };
      }

      const data = await this.prisma.conversation.create({
        data: {
          channel: "WHATSAPP",
          status: "IN_PROGRESS",
          entryPoint: "OUTBOUND",
          companyId: contact.companyId,
          companyContactId: contact.id,
          assignedUserId: userId,
          contactNameSnapshot: contact.name,
          contactWhatsappSnapshot: contact.whatsapp,
          lastMessagePreview: "Novo atendimento ativo iniciado.",
          lastMessageAt: new Date(),
        },
      });

      return { success: true, data };
    } catch (error) {
      return { success: false, error: "DB_ERROR" as const, detail: String(error) };
    }
  }
}
