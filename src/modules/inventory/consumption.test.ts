import { describe, expect, it } from "vitest";
import { sumSupplyConsumptions, supplyConsumptionDifference, supplyConsumptionStatus } from "./consumption";

describe("consumo real de insumos na OP", () => {
  it("soma consumos por item previsto", () => {
    expect(sumSupplyConsumptions([{ quantity: "1.25" }, { quantity: "2.75" }]).toString()).toBe("4");
  });

  it("calcula diferença entre previsto e consumido", () => {
    expect(supplyConsumptionDifference("3", "2.5")?.toString()).toBe("0.5");
    expect(supplyConsumptionDifference("3", "3.4")?.toString()).toBe("-0.4");
  });

  it("classifica consumo parcial, exato e acima do previsto", () => {
    expect(supplyConsumptionStatus("3", "0")).toBe("NOT_STARTED");
    expect(supplyConsumptionStatus("3", "2.5")).toBe("PARTIAL");
    expect(supplyConsumptionStatus("3", "3")).toBe("AS_PLANNED");
    expect(supplyConsumptionStatus("3", "3.4")).toBe("ABOVE_PLANNED");
  });

  it("classifica consumo adicional sem previsão", () => {
    expect(supplyConsumptionStatus(null, "1")).toBe("UNPLANNED");
  });
});
