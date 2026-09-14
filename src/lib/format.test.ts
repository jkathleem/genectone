import { describe, expect, it } from "vitest";
import { fortalezaDateInputValue, fortalezaMonthYear } from "./format";

describe("datas locais de formulários", () => {
  it("mantém o dia de Fortaleza quando a data UTC já avançou", () => {
    const instant = new Date("2026-09-15T01:30:00.000Z");

    expect(fortalezaDateInputValue(instant)).toBe("2026-09-14");
    expect(fortalezaMonthYear(instant)).toEqual({ year: 2026, month: 9 });
  });

  it("mantém mês e ano locais na virada do ano UTC", () => {
    const instant = new Date("2027-01-01T01:30:00.000Z");

    expect(fortalezaDateInputValue(instant)).toBe("2026-12-31");
    expect(fortalezaMonthYear(instant)).toEqual({ year: 2026, month: 12 });
  });
});
