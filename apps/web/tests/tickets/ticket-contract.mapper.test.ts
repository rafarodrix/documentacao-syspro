import { describe, expect, it } from "vitest";
import { serializeTicketRecord } from "@dosc-syspro/tickets-domain";
import type { TicketRecordSource } from "@dosc-syspro/tickets-domain";

const mockSourceBase: TicketRecordSource = {
  id: "db-ticket-1",
  channel: "PORTAL",
  status: "NEW",
  priority: "NORMAL",
  companyId: "company-a",
  company: {
    id: "company-a",
    razaoSocial: "Empresa de Teste S/A",
    nomeFantasia: "Empresa Teste",
  },
  companyContactId: "contact-a",
  companyContact: {
    id: "contact-a",
    name: "Maria Oliveira",
    email: "maria@example.com",
    whatsapp: "11988888888",
  },
  assignedUserId: "user-owner",
  assignedUser: {
    id: "user-owner",
    name: "Suporte Tecnico",
    email: "suporte@example.com",
  },
  resolvedByUserId: null,
  resolvedByUser: null,
  ticketNumber: "TKT-123",
  subject: "Falha de Autenticacao no Agente",
  resolutionSummary: null,
  resolutionVideoUrl: null,
  releaseType: null,
  releaseModule: null,
  publishToReleases: false,
  externalThreadId: null,
  metadata: {
    module: "Acesso Remoto",
    category: "Instalacao",
    currentTeam: "DESENVOLVIMENTO",
  },
  contactPhoneSnapshot: null,
  contactWhatsappSnapshot: null,
  contactNameSnapshot: null,
  slaResponseDueAt: new Date("2026-07-15T10:00:00.000Z"),
  slaResolutionDueAt: new Date("2026-07-16T10:00:00.000Z"),
  slaResponseHitAt: null,
  slaResolutionHitAt: null,
  createdAt: new Date("2026-07-14T10:00:00.000Z"),
  updatedAt: new Date("2026-07-14T11:00:00.000Z"),
  closedAt: null,
};

describe("ticket-contract.mapper (serializeTicketRecord)", () => {
  it("serializa um objeto bruto do banco (Prisma) para o tipo do contrato TicketModuleRecord", () => {
    const result = serializeTicketRecord(mockSourceBase);

    expect(result.id).toBe("db-ticket-1");
    expect(result.channel).toBe("PORTAL");
    expect(result.status).toBe("NEW");
    expect(result.priority).toBe("NORMAL");
    expect(result.companyId).toBe("company-a");
    expect(result.company?.nomeFantasia).toBe("Empresa Teste");
    expect(result.companyContact?.name).toBe("Maria Oliveira");
    expect(result.assignedUser?.email).toBe("suporte@example.com");
    expect(result.ticketNumber).toBe("TKT-123");
    expect(result.subject).toBe("Falha de Autenticacao no Agente");
    
    // Datas convertidas para ISO strings
    expect(result.createdAt).toBe("2026-07-14T10:00:00.000Z");
    expect(result.updatedAt).toBe("2026-07-14T11:00:00.000Z");
    expect(result.slaResponseDueAt).toBe("2026-07-15T10:00:00.000Z");
    
    // Metadados serializados estruturalmente
    expect(result.metadata).toEqual({
      module: "Acesso Remoto",
      category: "Instalacao",
      currentTeam: "DESENVOLVIMENTO",
    });
  });

  it("trata campos nulos de forma robusta e converte datas para ISO strings", () => {
    const minimalSource: TicketRecordSource = {
      ...mockSourceBase,
      company: null,
      companyContact: null,
      assignedUser: null,
      metadata: null,
      slaResponseDueAt: null,
      closedAt: null,
    };

    const result = serializeTicketRecord(minimalSource);

    expect(result.company).toBeNull();
    expect(result.companyContact).toBeNull();
    expect(result.assignedUser).toBeNull();
    expect(result.metadata).toBeNull();
    expect(result.slaResponseDueAt).toBeNull();
    expect(result.closedAt).toBeNull();
  });
});
