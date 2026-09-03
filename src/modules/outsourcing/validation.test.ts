import { describe, expect, it } from "vitest";
import { outsourcedServiceSchema } from "./validation";
const base = { serviceId: "cm12345678901234567890123", contractorId: "cm12345678901234567890124", plannedQuantity: "1000", appliedUnitPrice: "1,10", notes: "" };
describe("validação do serviço terceirizado", () => { it("exige quantidade prevista positiva", () => expect(outsourcedServiceSchema.safeParse({ ...base, plannedQuantity: "0" }).success).toBe(false)); it("exige preço aplicado mesmo sem sugestão padrão", () => expect(outsourcedServiceSchema.safeParse({ ...base, appliedUnitPrice: "" }).success).toBe(false)); it("preserva o preço aplicado informado como Decimal", () => expect(outsourcedServiceSchema.parse(base).appliedUnitPrice.toFixed(4)).toBe("1.1000")); });
