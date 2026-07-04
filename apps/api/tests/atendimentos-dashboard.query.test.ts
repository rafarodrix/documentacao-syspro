import { describe, expect, it } from "vitest";
import { AtendimentosDashboardQuery } from "../src/modules/dashboard/queries/atendimentos-dashboard.query";

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
