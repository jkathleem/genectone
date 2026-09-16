import { describe, expect, it } from "vitest";
import { calculateOrderTotal, productionOrderSchema } from "./validation";

const valid = { number: "123", entryDate: "2026-09-02", companyId: "cm12345678901234567890123", customerId: "cm12345678901234567890124", productId: "cm12345678901234567890125", quantity: "1000", isUrgent: "", expectedCompletionDate: "", notes: "" };

describe("regras da OP", () => {
  it("calcula o total sem persistir campo derivado", () => expect(calculateOrderTotal(1000, "10.50").toFixed(2)).toBe("10500.00"));
  it("aceita quantidade positiva e campos operacionais opcionais", () => { const result = productionOrderSchema.parse(valid); expect(result.quantity).toBe(1000); expect(result.isUrgent).toBe(false); expect(result.expectedCompletionDate).toBeNull(); });
  it("rejeita quantidade não positiva", () => expect(productionOrderSchema.safeParse({ ...valid, quantity: "0" }).success).toBe(false));
  it("rejeita previsão inválida", () => expect(productionOrderSchema.safeParse({ ...valid, expectedCompletionDate: "15/09/2026" }).success).toBe(false));
});
