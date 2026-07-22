import { describe, expect, it } from "vitest";
import { AtendimentosDashboardQuery } from "../src/modules/dashboard/queries/atendimentos-dashboard.query";
import { calculateMedian, extractChatwootChannel } from "../src/modules/dashboard/dashboard.shared";

describe("AtendimentosDashboardQuery recurrence grouping", () => {
  const query = new AtendimentosDashboardQuery({} as any, {} as any, {} as any, {} as any);

  it("merges recurrence items that share the same display name", () => {
    const merged = (query as any).mergeRecurrenceItemsByName([
      {
        key: "company-1",
        name: "MEGA ELETRON",
        count: 1,
        channel: "PORTAL",
        lastAttendance: new Date("2026-07-04T10:00:00.000Z"),
      },
      {
        key: "conversation:123",
        name: "Mega Eletron",
        count: 1,
        channel: "WHATSAPP",
        lastAttendance: new Date("2026-07-04T12:00:00.000Z"),
      },
      {
        key: "contact-1",
        name: "Hernann",
        count: 1,
        channel: "PORTAL",
        lastAttendance: new Date("2026-07-04T08:00:00.000Z"),
      },
      {
        key: "conversation:456",
        name: "Hernann ",
        count: 2,
        channel: "EMAIL",
        lastAttendance: new Date("2026-07-04T15:00:00.000Z"),
      },
    ]);

    expect(merged).toHaveLength(2);

    expect(merged).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "company-1",
          name: "Mega Eletron",
          count: 2,
          channel: "WHATSAPP",
          lastAttendance: new Date("2026-07-04T12:00:00.000Z"),
        }),
        expect.objectContaining({
          key: "contact-1",
          name: "Hernann",
          count: 3,
          channel: "EMAIL",
          lastAttendance: new Date("2026-07-04T15:00:00.000Z"),
        }),
      ]),
    );
  });

  it("normalizes accents, punctuation, and casing when merging names", () => {
    expect((query as any).normalizeRecurrenceName("Mega-El\u00e9tron   Ltda.")).toBe("mega eletron ltda");
    expect((query as any).normalizeRecurrenceName("  mega eletron ltda  ")).toBe("mega eletron ltda");
  });
});

describe("Dashboard Shared Helpers & Metrics Semantics", () => {
  it("calculates median correctly for odd, even, and empty arrays", () => {
    expect(calculateMedian([])).toBeNull();
    expect(calculateMedian([10])).toBe(10);
    expect(calculateMedian([10, 20, 30])).toBe(20);
    expect(calculateMedian([10, 20, 30, 40])).toBe(25);
    expect(calculateMedian([100, 5, 20])).toBe(20);
  });

  it("correctly identifies WhatsApp, Email, Phone and Portal channels", () => {
    expect(extractChatwootChannel({ channel: "Channel::Whatsapp" })).toBe("WHATSAPP");
    expect(extractChatwootChannel({ channel: "Channel::Email" })).toBe("EMAIL");
    expect(extractChatwootChannel({ channel: "Channel::Phone" })).toBe("PHONE");
    expect(extractChatwootChannel({ channel: "Channel::WebWidget" })).toBe("PORTAL");

    // Custom API inbox with WhatsApp name should be mapped to WHATSAPP, not PORTAL
    expect(extractChatwootChannel({ channel: "Channel::Api", inbox: { name: "Suporte WhatsApp" } })).toBe("WHATSAPP");
  });

  it("normalizes status label to 'Sem responsavel' when assigneeId is null for open conversations", () => {
    const query = new AtendimentosDashboardQuery({} as any, {} as any, {} as any, {} as any);
    const resolvedLabel = (query as any).resolveConversationStatusLabel({ status: "open" }, null, null);
    expect(resolvedLabel).toBe("Sem responsavel");

    const pendingUnassignedLabel = (query as any).resolveConversationStatusLabel({ status: "pending" }, null, null);
    expect(pendingUnassignedLabel).toBe("Sem responsavel");

    const pendingAssignedLabel = (query as any).resolveConversationStatusLabel({ status: "pending" }, "agent_123", null);
    expect(pendingAssignedLabel).toBe("Aguardando cliente");
  });
});
