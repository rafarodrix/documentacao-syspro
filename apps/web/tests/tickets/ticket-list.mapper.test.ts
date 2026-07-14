import { describe, expect, it } from "vitest";
import type { TicketModuleRecord } from "@dosc-syspro/contracts/ticket";
import { toTicketListItem, toTicketListItems } from "@/features/tickets/application/ticket-list.mapper";

const mockRecordBase: TicketModuleRecord = {
  id: "test-id-123456",
  channel: "PORTAL",
  status: "NEW",
  priority: "NORMAL",
  companyId: "company-1",
  company: {
    id: "company-1",
    razaoSocial: "Razao Social Ltda",
    nomeFantasia: "Nome Fantasia",
  },
  companyContactId: "contact-1",
  companyContact: {
    id: "contact-1",
    name: "Joao da Silva",
    email: "joao@example.com",
    whatsapp: "11999999999",
  },
  assignedUserId: null,
  assignedUser: null,
  resolvedByUserId: null,
  resolvedByUser: null,
  ticketNumber: "TK-100",
  subject: "Erro de Conexao",
  resolutionSummary: null,
  resolutionVideoUrl: null,
  metadata: {
    module: "Modulo Financeiro",
    category: "Erro Tecnico",
    currentTeam: "SUPORTE",
  },
  createdAt: "2026-07-14T10:00:00.000Z",
  updatedAt: "2026-07-14T11:00:00.000Z",
  closedAt: null,
};

describe("ticket-list.mapper", () => {
  it("mapeia um TicketModuleRecord para TicketListItem corretamente com todos os campos preenchidos", () => {
    const result = toTicketListItem(mockRecordBase);

    expect(result.id).toBe("test-id-123456");
    expect(result.number).toBe("TK-100");
    expect(result.title).toBe("Erro de Conexao");
    expect(result.status).toBe("NEW");
    expect(result.statusLabel).toBe("Novo");
    expect(result.priority).toBe("NORMAL");
    expect(result.customer).toBe("Joao da Silva");
    expect(result.companyName).toBe("Nome Fantasia");
    expect(result.team).toBe("SUPORTE");
    expect(result.module).toBe("Modulo Financeiro");
    expect(result.category).toBe("Erro Tecnico");
  });

  it("aplica fallbacks para campos nulos (assunto, numero de ticket, etc.)", () => {
    const sparseRecord: TicketModuleRecord = {
      ...mockRecordBase,
      ticketNumber: null,
      subject: null,
      company: null,
      companyContact: null,
      metadata: {},
    };

    const result = toTicketListItem(sparseRecord);

    expect(result.title).toBe("Sem assunto");
    expect(result.number).toBe("TEST-ID-"); // slice(0, 8) do id uppercase
    expect(result.customer).toBe("Cliente");
    expect(result.companyName).toBeNull();
    expect(result.team).toBeNull();
  });

  it("mapeia corretamente uma lista de records", () => {
    const results = toTicketListItems([mockRecordBase, { ...mockRecordBase, id: "test-id-2", ticketNumber: "TK-101" }]);

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("test-id-123456");
    expect(results[1].id).toBe("test-id-2");
    expect(results[1].number).toBe("TK-101");
  });
});
