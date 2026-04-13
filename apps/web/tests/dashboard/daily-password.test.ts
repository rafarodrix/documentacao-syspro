import { describe, expect, it } from "vitest";
import { calculateDailyPassword, getDailyPasswordForDate } from "@dosc-syspro/contracts/dashboard";

describe("daily password", () => {
  it("calcula a senha conforme a regra dia x (ano + mes + dia)", () => {
    expect(calculateDailyPassword(28, 9, 2026)).toBe(57764);
    expect(calculateDailyPassword(25, 11, 2026)).toBe(51550);
    expect(calculateDailyPassword(12, 12, 2026)).toBe(24600);
    expect(calculateDailyPassword(15, 2, 2027)).toBe(30660);
    expect(calculateDailyPassword(28, 8, 2028)).toBe(57792);
  });

  it("respeita a data do portal no timezone configurado", () => {
    const result = getDailyPasswordForDate(new Date("2026-09-28T12:00:00-03:00"));

    expect(result.day).toBe(28);
    expect(result.month).toBe(9);
    expect(result.year).toBe(2026);
    expect(result.password).toBe(57764);
    expect(result.formattedDate).toBe("28/09/2026");
  });
});
