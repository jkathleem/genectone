import { describe, expect, it } from "vitest";
import { allItemsBelongToContractor, availableToSend, deliveryNoteTotal, sentQuantity, validateRequestedQuantity } from "./domain";
import { formatDeliveryNoteNumber } from "./numbering";
import { deliveryNoteSchema } from "./validation";

describe("romaneios", () => {
  it("calcula quantidade disponível após múltiplas saídas", () => {
    expect(sentQuantity([{ quantity: 600 }, { quantity: 400 }])).toBe(1000);
    expect(availableToSend(1000, 600)).toBe(400);
  });
  it("valida quantidade positiva, inteira e dentro do disponível", () => {
    expect(validateRequestedQuantity(400, 400)).toBe(true);
    expect(validateRequestedQuantity(401, 400)).toBe(false);
    expect(validateRequestedQuantity(0, 400)).toBe(false);
    expect(validateRequestedQuantity(-1, 400)).toBe(false);
    expect(validateRequestedQuantity(1.5, 400)).toBe(false);
  });
  it("impede itens de outro terceirizado", () => {
    expect(allItemsBelongToContractor([{ contractorId: "a" }, { contractorId: "a" }], "a")).toBe(true);
    expect(allItemsBelongToContractor([{ contractorId: "a" }, { contractorId: "b" }], "a")).toBe(false);
  });
  it("calcula o total do Romaneio", () => expect(deliveryNoteTotal([{ quantity: 600 }, { quantity: 500 }])).toBe(1100));
  it("formata seis dígitos sem truncar valores maiores", () => {
    expect(formatDeliveryNoteNumber(BigInt(1))).toBe("000001");
    expect(formatDeliveryNoteNumber(BigInt(125))).toBe("000125");
    expect(formatDeliveryNoteNumber(BigInt(1000000))).toBe("1000000");
  });
  it("aceita no item somente a associação existente e a quantidade", () => {
    const result = deliveryNoteSchema.parse({
      contractorId: "cm12345678901234567890123",
      departureDate: "2026-09-03",
      responsibleName: "Responsável",
      notes: "",
      items: [{ outsourcedServiceId: "cm12345678901234567890124", quantity: 10, customerId: "não deve ser duplicado" }],
    });
    expect(result.items[0]).toEqual({ outsourcedServiceId: "cm12345678901234567890124", quantity: 10 });
  });
  it("rejeita associação duplicada no mesmo Romaneio", () => {
    const item = { outsourcedServiceId: "cm12345678901234567890124", quantity: 10 };
    const result = deliveryNoteSchema.safeParse({ contractorId: "cm12345678901234567890123", departureDate: "2026-09-03", responsibleName: "Responsável", notes: "", items: [item, item] });
    expect(result.success).toBe(false);
  });
});
