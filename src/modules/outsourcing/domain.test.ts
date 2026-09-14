import { describe, expect, it } from "vitest";
import { canChangeAssignment, derivedQuantities, mountingAvailability, operationalStatus, plannedValue } from "./domain";
describe("terceirização", () => {
  it("deriva quantidades", () => expect(derivedQuantities([{ quantity: 8 }, { quantity: 2 }], [{ quantity: 4 }])).toEqual({ sentQuantity: 10, returnedQuantity: 4, pendingQuantity: 6 }));
  it.each([[0, 0, "Aguardando envio"], [10, 0, "Em terceirização"], [10, 4, "Retorno parcial"], [10, 10, "Retornado"]])("deriva status", (s, r, expected) => expect(operationalStatus(s as number, r as number)).toBe(expected));
  it("calcula valor previsto em Decimal", () => expect(plannedValue(1000, "1.10").toFixed(2)).toBe("1100.00"));
  it("bloqueia troca de serviço ou terceirizado após a primeira saída", () => {
    const current = { serviceId: "servico-1", contractorId: "terceirizado-1" };
    expect(canChangeAssignment(true, current, current)).toBe(true);
    expect(canChangeAssignment(true, current, { ...current, serviceId: "servico-2" })).toBe(false);
    expect(canChangeAssignment(true, current, { ...current, contractorId: "terceirizado-2" })).toBe(false);
    expect(canChangeAssignment(false, current, { serviceId: "servico-2", contractorId: "terceirizado-2" })).toBe(true);
  });
  it("deriva a disponibilidade da montagem a partir dos retornos", () => {
    const waiting = { deliveryNoteItems: [{ quantity: 10 }], returns: [] };
    const returned = { deliveryNoteItems: [{ quantity: 10 }], returns: [{ quantity: 10 }] };
    expect(mountingAvailability([])).toBe("NOT_AVAILABLE");
    expect(mountingAvailability([waiting, returned])).toBe("PARTIALLY_AVAILABLE");
    expect(mountingAvailability([returned, returned])).toBe("FULLY_AVAILABLE");
  });
});
