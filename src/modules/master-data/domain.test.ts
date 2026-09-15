import { describe, expect, it } from "vitest";
import { adjustedProductPrice, categoryCode, financialGroupMapping } from "./domain";

describe("atualização em massa de preços de produtos", () => {
  it("aplica percentual com Decimal", () => {
    expect(adjustedProductPrice("100.0000", "PERCENT", "12.5").toFixed(4)).toBe("112.5000");
  });

  it("define valor fixo e rejeita valores negativos", () => {
    expect(adjustedProductPrice(null, "FIXED", "35.75").toFixed(4)).toBe("35.7500");
    expect(() => adjustedProductPrice("10", "FIXED", "-1")).toThrow("negativo");
  });

  it("não inventa base para percentual quando o produto não possui preço", () => {
    expect(() => adjustedProductPrice(null, "PERCENT", "10")).toThrow("preço atual");
  });
});

describe("mapeamento amigável das categorias financeiras", () => {
  it("deriva natureza técnica a partir do grupo apresentado", () => {
    expect(financialGroupMapping("VARIABLE_COST_EXPENSE")).toEqual({ financialNature: "OPERATING_EXPENSE", dreGroup: "VARIABLE_COST_EXPENSE" });
    expect(financialGroupMapping("FINANCIAL_EXPENSE")).toEqual({ financialNature: "DRE_POST_OPERATING", dreGroup: "FINANCIAL_EXPENSE" });
    expect(financialGroupMapping("NON_DRE")).toEqual({ financialNature: "NON_DRE", dreGroup: null });
  });

  it("gera código técnico sem expô-lo como decisão manual", () => {
    expect(categoryCode("Água e energia")).toBe("AGUA_E_ENERGIA");
  });
});
