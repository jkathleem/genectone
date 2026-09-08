import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma";
import { flowTotals, groupByDay, positiveBalance, sumBalances, type CashMovement } from "./domain";
describe("fluxo de caixa derivado", () => {
  const movement = (id: string, date: string, direction: "IN" | "OUT", amount: string): CashMovement => ({ id, date: new Date(`${date}T00:00:00Z`), direction, amount: new Prisma.Decimal(amount), type: direction === "IN" ? "Recebimento" : "Pagamento", company: "Genect", description: id, counterparty: id, href: "/" });
  it("calcula entradas, saídas e líquido sem usar allocations", () => { const result = flowTotals([movement("receipt", "2026-09-01", "IN", "25000"), movement("payment", "2026-09-01", "OUT", "500")]); expect(result.entries.toFixed(2)).toBe("25000.00"); expect(result.exits.toFixed(2)).toBe("500.00"); expect(result.net.toFixed(2)).toBe("24500.00"); });
  it("usa apenas saldo restante no previsto", () => { expect(positiveBalance("10000", "4000").toFixed(2)).toBe("6000.00"); expect(positiveBalance("784", "500").toFixed(2)).toBe("284.00"); expect(positiveBalance("100", "100").toFixed(2)).toBe("0.00"); });
  it("reproduz o cenário completo", () => { const actual = flowTotals([movement("r", "2026-09-08", "IN", "4000"), movement("p", "2026-09-08", "OUT", "500")]); expect(actual.net.toFixed(2)).toBe("3500.00"); const predicted = flowTotals([movement("ar", "2026-09-10", "IN", "6000"), movement("ap", "2026-09-10", "OUT", "284")]); expect(predicted.net.toFixed(2)).toBe("5716.00"); });
  it("agrupa cronologicamente por dia", () => { const groups = groupByDay([movement("b", "2026-09-02", "OUT", "2"), movement("a", "2026-09-01", "IN", "5"), movement("c", "2026-09-01", "OUT", "1")]); expect(groups.map(x => x.date)).toEqual(["2026-09-01", "2026-09-02"]); expect(groups[0].net.toFixed(2)).toBe("4.00"); });
  it("soma saldos em Decimal", () => expect(sumBalances(["8000", "7000", "10000"]).toFixed(2)).toBe("25000.00"));
});
