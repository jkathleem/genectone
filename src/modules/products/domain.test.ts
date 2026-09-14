import { describe, expect, it } from "vitest";
import { expectedSupplyQuantity } from "./domain";

describe("insumos previstos do produto", () => {
  it("calcula consumo proporcional com Decimal", () => {
    expect(expectedSupplyQuantity(250, "1.5", 100)?.toFixed(4)).toBe("3.7500");
  });

  it("aceita vínculo ainda sem regra de consumo e rejeita pares incompletos", () => {
    expect(expectedSupplyQuantity(250, null, null)).toBeNull();
    expect(() => expectedSupplyQuantity(250, "1", null)).toThrow("em conjunto");
  });
});
