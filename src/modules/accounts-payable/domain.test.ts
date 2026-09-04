import { describe, expect, it } from "vitest";
import { competenceDate, financialStatus, paidAmount, remainingAmount } from "./domain";
describe("contas a pagar", () => {
  const today = new Date("2026-09-09T12:00:00Z");
  it("usa o primeiro dia da competência", () => expect(competenceDate(2026, 9).toISOString()).toBe("2026-09-01T00:00:00.000Z"));
  it("soma pagamentos em Decimal e deriva o saldo", () => { const payments = [{ amount: "500.0000" }, { amount: "284.0000" }]; expect(paidAmount(payments).toFixed(4)).toBe("784.0000"); expect(remainingAmount("784.0000", payments).toFixed(4)).toBe("0.0000"); });
  it("deriva Em aberto", () => expect(financialStatus("100", new Date("2026-09-10T00:00:00Z"), [], today)).toBe("Em aberto"));
  it("deriva Vencida", () => expect(financialStatus("100", new Date("2026-09-08T00:00:00Z"), [], today)).toBe("Vencida"));
  it("prioriza Parcial mesmo vencida", () => expect(financialStatus("100", new Date("2026-09-08T00:00:00Z"), [{ amount: "40" }], today)).toBe("Parcial"));
  it("deriva Pago com saldo zero", () => expect(financialStatus("100", new Date("2026-09-08T00:00:00Z"), [{ amount: "100" }], today)).toBe("Pago"));
});
