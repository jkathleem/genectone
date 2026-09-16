import { Prisma } from "@/generated/prisma";
import { describe, expect, it } from "vitest";
import { payableBalance, productionOrderPredictedValue, receivableBalance, sumOpenBalances } from "./overview-domain";

describe("visão geral financeira", () => {
  it("calcula saldos de A/P considerando estornos de pagamento", () => {
    const balance = payableBalance("1000", [
      { amount: new Prisma.Decimal("400"), reversal: null },
      { amount: new Prisma.Decimal("300"), reversal: { id: "reversed" } },
    ]);

    expect(balance.toFixed(2)).toBe("600.00");
  });

  it("calcula saldos de A/R considerando estornos de recebimento", () => {
    const balance = receivableBalance("1200", [
      { amount: new Prisma.Decimal("500"), receipt: { reversal: null } },
      { amount: new Prisma.Decimal("200"), receipt: { reversal: { id: "reversed" } } },
    ]);

    expect(balance.toFixed(2)).toBe("700.00");
  });

  it("soma apenas saldos positivos para indicadores", () => {
    const total = sumOpenBalances(
      [{ value: new Prisma.Decimal("10") }, { value: new Prisma.Decimal("0") }, { value: new Prisma.Decimal("-1") }, { value: new Prisma.Decimal("20") }],
      (row) => row.value,
    );

    expect(total.toFixed(2)).toBe("30.00");
  });

  it("valoriza carteira por quantidade vezes preço snapshot da OP", () => {
    expect(productionOrderPredictedValue(1200, "3.50").toFixed(2)).toBe("4200.00");
  });
});
