import { describe, expect, it } from "vitest";
import { CLOSED_STATE_IDS, OPERATIONAL_STATE_IDS } from "@dosc-syspro/core";
import { buildStatusQuery, buildTrackedStatusQuery } from "@/features/tickets/application/services/ticket-query-builders";

describe("tickets integration: status workflow queries", () => {
  it("mantem CLOSED_STATE_IDS com state_id 7 e sem estados arquivados", () => {
    expect(CLOSED_STATE_IDS).toContain(7);
    expect(CLOSED_STATE_IDS).not.toContain(8);
    expect(CLOSED_STATE_IDS).not.toContain(9);
  });

  it("mantem OPERATIONAL_STATE_IDS sem estados encerrados", () => {
    expect(OPERATIONAL_STATE_IDS).toContain(1);
    expect(OPERATIONAL_STATE_IDS).not.toContain(7);
    expect(OPERATIONAL_STATE_IDS).not.toContain(8);
    expect(OPERATIONAL_STATE_IDS).not.toContain(9);
  });

  it("buildStatusQuery('closed') inclui state_id:7", () => {
    const query = buildStatusQuery("closed");
    expect(query).toContain("state_id:7");
    expect(query).not.toContain("state_id:8");
    expect(query).not.toContain("state_id:9");
  });

  it("buildStatusQuery('pending') nao inclui estados fechados", () => {
    const query = buildStatusQuery("pending");
    expect(query).toContain("state_id:2");
    expect(query).toContain("state_id:3");
    expect(query).not.toContain("state_id:7");
  });

  it("buildStatusQuery('closed') nao inclui estados em analise", () => {
    const query = buildStatusQuery("closed");
    expect(query).toContain("state_id:7");
    expect(query).not.toContain("state_id:2");
    expect(query).not.toContain("state_id:3");
  });

  it("buildTrackedStatusQuery inclui open + pending + closed sem archived", () => {
    const query = buildTrackedStatusQuery();
    expect(query).toContain("state_id:1");
    expect(query).toContain("state_id:7");
    expect(query).not.toContain("state_id:8");
    expect(query).not.toContain("state_id:9");
  });
});

