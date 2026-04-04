"use server"

import { prisma } from "@/lib/prisma"
import { getProtectedSession } from "@/lib/auth-helpers"
import { WhatsAppService } from "@dosc-syspro/api/services/whatsapp-service"
import { ConversationStatus } from "@prisma/client"

export type ConversationTabFilter = "ATENDENDO" | "ESPERA";

export async function getConversations(filter: ConversationTabFilter = "ATENDENDO") {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED", data: [] }

  try {
    const statusFilter = filter === "ATENDENDO" 
      ? { in: ["IN_PROGRESS", "WAITING_CUSTOMER"] as ConversationStatus[] }
      : { in: ["NEW", "UNASSIGNED"] as ConversationStatus[] };

    const list = await prisma.conversation.findMany({
      where: {
        status: statusFilter
      },
      orderBy: { lastMessageAt: "desc" },
      include: {
        company: true,
        companyContact: true,
      }
    })
    return { error: null, data: list }
  } catch (error) {
    console.error("Erro getConversations:", error)
    return { error: "DB_ERROR", data: [] }
  }
}

export async function getConversationMessages(conversationId: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED", data: [] }

  try {
    const messages = await prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" }
    })
    return { error: null, data: messages }
  } catch (error) {
    return { error: "DB_ERROR", data: [] }
  }
}

export async function sendConversationMessage(conversationId: string, text: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED" }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })
    
    if (!conversation || !conversation.contactWhatsappSnapshot) {
      return { error: "NOT_FOUND" }
    }

    // Grava mensagem interna
    await prisma.conversationMessage.create({
      data: {
        conversationId,
        direction: "OUTBOUND",
        type: "TEXT",
        authorKind: "USER",
        authorUserId: session.userId,
        body: text,
        status: "SENT",
        sentAt: new Date(),
      }
    })

    // Atualiza a ultima interação
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessagePreview: text.substring(0, 50),
        lastOutboundAt: new Date(),
        lastMessageAt: new Date(),
        status: conversation.status === "NEW" ? "IN_PROGRESS" : conversation.status
      }
    })

    // Dispara WhatsApp
    const whatsAppServiceUrl = process.env.EVOLUTION_URL || "";
    const whatsAppServiceKey = process.env.EVOLUTION_API_KEY || "";
    const whatsAppServiceInstance = process.env.EVOLUTION_INSTANCE_NAME || "Syspro";
    const whatsAppService = new WhatsAppService(whatsAppServiceUrl, whatsAppServiceKey, whatsAppServiceInstance);

    await whatsAppService.sendMessage(conversation.contactWhatsappSnapshot, text)

    return { error: null, success: true }
  } catch (error) {
    console.error("Send message error:", error)
    return { error: "DISPATCH_FAILED" }
  }
}

export async function resolveConversation(conversationId: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED" }
  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: "RESOLVED",
        closedAt: new Date(),
        resolvedByUserId: session.userId
      }
    })
    return { error: null, success: true }
  } catch(e) {
    return { error: "DB_ERROR" }
  }
}

export async function linkConversationToCompany(conversationId: string, companyId: string, contactName: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED" }

  try {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }})
    if (!conversation || !conversation.contactWhatsappSnapshot) return { error: "NOT_FOUND" }

    // Cria/Busca o CompanyContact
    let contact = await prisma.companyContact.findFirst({
      where: { whatsapp: conversation.contactWhatsappSnapshot, companyId }
    })

    if (!contact) {
      contact = await prisma.companyContact.create({
        data: {
          companyId,
          name: contactName || "Contato Novo",
          whatsapp: conversation.contactWhatsappSnapshot,
          source: "WHATSAPP",
          status: "LINKED"
        }
      })
    }

    // Atrela a conversa
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        companyId,
        companyContactId: contact.id,
      }
    })

    return { error: null, success: true, contact }
  } catch (error) {
    console.error("Link error:", error)
    return { error: "DB_ERROR" }
  }
}

export async function searchCompanies(query: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED", data: [] }

  try {
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { razaoSocial: { contains: query, mode: "insensitive" } },
          { nomeFantasia: { contains: query, mode: "insensitive" } },
          { cnpj: { contains: query } }
        ]
      },
      take: 10,
      select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true }
    })
    return { error: null, data: companies }
  } catch(e) {
    return { error: "DB_ERROR", data: [] }
  }
}

export async function searchSystemContacts(query: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED", data: [] }

  try {
    const contacts = await prisma.companyContact.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { whatsapp: { contains: query } }
        ]
      },
      take: 20,
      include: { company: true }
    })
    return { error: null, data: contacts }
  } catch(e) {
    return { error: "DB_ERROR", data: [] }
  }
}

export async function startOutboundConversation(contactId: string) {
  const session = await getProtectedSession()
  if (!session) return { error: "UNAUTHORIZED" }

  try {
    const contact = await prisma.companyContact.findUnique({
      where: { id: contactId },
      include: { company: true }
    })

    if (!contact || !contact.whatsapp) {
      return { error: "CONTACT_NOT_FOUND" }
    }

    // Verifica se já não tem uma conversa ativa em andamento para este numero
    const activeConv = await prisma.conversation.findFirst({
      where: {
        contactWhatsappSnapshot: contact.whatsapp,
        status: { in: ["NEW", "UNASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER"] as ConversationStatus[] }
      }
    })

    if (activeConv) {
      return { error: null, data: activeConv } // Retorna a existente
    }

    const conversation = await prisma.conversation.create({
      data: {
        channel: "WHATSAPP",
        status: "IN_PROGRESS", // Já vai direto para ATENDENDO
        entryPoint: "OUTBOUND",
        companyId: contact.companyId,
        companyContactId: contact.id,
        assignedUserId: session.userId, // auto-atribui-se
        contactNameSnapshot: contact.name,
        contactWhatsappSnapshot: contact.whatsapp,
        lastMessagePreview: "Novo atendimento ativo iniciado.",
        lastMessageAt: new Date()
      }
    })

    return { error: null, data: conversation }
  } catch(e) {
    console.error("Start outbound error:", e)
    return { error: "DB_ERROR" }
  }
}
