import { describe, expect, it } from "vitest";
import { CLOSED_STATE_IDS, OPERATIONAL_STATE_IDS, PENDING_STATE_IDS } from "@dosc-syspro/core";
import { buildClosedWindowQuery, buildStatusQuery, buildTrackedStatusQuery, getClosedWindowStartDate } from "@/features/tickets/application/services/ticket-query-builders";

describe("tickets integration: status workflow queries", () => {
  it("mantem CLOSED_STATE_IDS com state_id 4 e sem estados arquivados", () => {
    expect(CLOSED_STATE_IDS).toContain(4);
    expect(CLOSED_STATE_IDS).toContain(5);
    expect(CLOSED_STATE_IDS).not.toContain(8);
    expect(CLOSED_STATE_IDS).not.toContain(9);
  });

  it("mantem PENDING_STATE_IDS com ids reais de analise e pendencia", () => {
    expect(PENDING_STATE_IDS).toContain(2);
    expect(PENDING_STATE_IDS).toContain(3);
    expect(PENDING_STATE_IDS).toContain(6);
    expect(PENDING_STATE_IDS).toContain(7);
    expect(PENDING_STATE_IDS).not.toContain(4);
  });

  it("mantem OPERATIONAL_STATE_IDS sem estados encerrados", () => {
    expect(OPERATIONAL_STATE_IDS).toContain(1);
    expect(OPERATIONAL_STATE_IDS).toContain(6);
    expect(OPERATIONAL_STATE_IDS).toContain(7);
    expect(OPERATIONAL_STATE_IDS).not.toContain(4);
    expect(OPERATIONAL_STATE_IDS).not.toContain(8);
    expect(OPERATIONAL_STATE_IDS).not.toContain(9);
  });

  it("buildStatusQuery('closed') inclui state_id:4", () => {
    const query = buildStatusQuery("closed");
    expect(query).toContain("state_id:4");
    expect(query).toContain("state_id:5");
    expect(query).not.toContain("state_id:8");
    expect(query).not.toContain("state_id:9");
    expect(query).not.toContain('state:"');
  });

  it("buildStatusQuery('pending') nao inclui estados fechados", () => {
    const query = buildStatusQuery("pending");
    expect(query).toContain("state_id:2");
    expect(query).toContain("state_id:3");
    expect(query).toContain("state_id:6");
    expect(query).toContain("state_id:7");
    expect(query).not.toContain("state_id:4");
  });

  it("buildStatusQuery('closed') nao inclui estados em analise", () => {
    const query = buildStatusQuery("closed");
    expect(query).toContain("state_id:4");
    expect(query).not.toContain("state_id:2");
    expect(query).not.toContain("state_id:6");
    expect(query).not.toContain("state_id:7");
  });

  it("buildTrackedStatusQuery inclui open + pending + closed sem archived", () => {
    const query = buildTrackedStatusQuery();
    expect(query).toContain("state_id:1");
    expect(query).toContain("state_id:4");
    expect(query).toContain("state_id:6");
    expect(query).not.toContain("state_id:8");
    expect(query).not.toContain("state_id:9");
  });

  it("buildClosedWindowQuery gera corte para fechados recentes", () => {
    const now = new Date("2026-03-24T12:00:00.000Z");
    const startDate = getClosedWindowStartDate("30d", now);
    expect(startDate).toBe("2026-02-22");
    expect(buildClosedWindowQuery("30d", now)).toContain("close_at:>=2026-02-22");
  });

  it("buildClosedWindowQuery('all') nao aplica corte", () => {
    expect(buildClosedWindowQuery("all")).toBe("");
  });
});
