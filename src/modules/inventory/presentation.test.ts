import { describe, expect, it } from "vitest";
import { purchaseFinancialVisibility, supplySituation } from "./presentation";

describe("apresentação de estoque", () => {
  it("deriva a situação visual do insumo pelo saldo", () => {
    expect(supplySituation("-1", "10")).toBe("NEGATIVE");
    expect(supplySituation("0", "10")).toBe("ZERO");
    expect(supplySituation("5", "10")).toBe("BELOW_MINIMUM");
    expect(supplySituation("11", "10")).toBe("NORMAL");
  });

  it("restringe valores e link de Conta a Pagar de compras a ADMIN e FINANCE", () => {
    expect(purchaseFinancialVisibility("ADMIN")).toEqual({ showValues: true, showFinancialStatus: true, showPayableLink: true });
    expect(purchaseFinancialVisibility("FINANCE")).toEqual({ showValues: true, showFinancialStatus: true, showPayableLink: true });
    expect(purchaseFinancialVisibility("OPERATIONS")).toEqual({ showValues: false, showFinancialStatus: false, showPayableLink: false });
    expect(purchaseFinancialVisibility("VIEWER")).toEqual({ showValues: false, showFinancialStatus: false, showPayableLink: false });
  });
});
