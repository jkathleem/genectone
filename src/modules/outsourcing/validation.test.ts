import { describe, expect, it } from "vitest";
import { outsourcedServiceSchema } from "./validation";
const base = { serviceId: "cm12345678901234567890123", contractorId: "cm12345678901234567890124", plannedQuantity: "1000", notes: "" };
describe("validação do serviço terceirizado", () => {
  it("exige quantidade prevista positiva", () => expect(outsourcedServiceSchema.safeParse({ ...base, plannedQuantity: "0" }).success).toBe(false));
  it("não recebe preço do formulário", () => expect(outsourcedServiceSchema.parse({ ...base, appliedUnitPrice: "999" })).not.toHaveProperty("appliedUnitPrice"));
});
