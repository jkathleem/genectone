import { describe, expect, it } from "vitest";
import { billingCompetenceDate, expectedOrderAmount, normalizeInvoiceNumber } from "./domain";
describe("faturamento", () => {
  it("normaliza somente espaços do número", () => expect(normalizeInvoiceNumber("  NF  12 A ")).toBe("NF 12 A"));
  it("preserva Decimal e permite valor faturado diferente do previsto", () => { expect(expectedOrderAmount(1000, "10.5000").toFixed(4)).toBe("10500.0000"); expect("10450.0000").not.toBe(expectedOrderAmount(1000, "10.5000").toFixed(4)); });
  it("representa a competência no primeiro dia", () => expect(billingCompetenceDate(2026, 9).toISOString()).toBe("2026-09-01T00:00:00.000Z"));
});
