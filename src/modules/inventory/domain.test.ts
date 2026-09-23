import { Prisma } from "@/generated/prisma";
import { describe, expect, it } from "vitest";
import { calculateSupplyBalanceFromMovements, negativeStockWarning } from "./domain";

describe("domínio de estoque", () => {
  it("deriva saldo pela soma de entradas menos saídas", () => {
    const balance = calculateSupplyBalanceFromMovements([
      { direction: "IN", quantity: "10.5" },
      { direction: "OUT", quantity: "3" },
      { direction: "IN", quantity: "1.25" },
      { direction: "OUT", quantity: "20" },
    ]);

    expect(balance.toString()).toBe("-11.25");
  });

  it("representa saldo negativo como aviso e não como bloqueio", () => {
    const warning = negativeStockWarning("supply-1", new Prisma.Decimal("-2"));

    expect(warning).toMatchObject({ code: "NEGATIVE_STOCK", supplyId: "supply-1" });
  });
});
