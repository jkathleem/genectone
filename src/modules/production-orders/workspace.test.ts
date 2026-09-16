import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma";
import { externalServiceProgress, isOutsourcedServiceLate, plannedSupplyQuantity, serviceProgressSummary } from "./domain";

describe("workspace operacional da OP", () => {
  it("calcula insumo proporcional com Decimal", () => {
    expect(plannedSupplyQuantity(1500, new Prisma.Decimal(2), 1000)?.toFixed(4)).toBe("3.0000");
    expect(plannedSupplyQuantity(1500, null, null)).toBeNull();
  });

  it("deriva progresso e atraso sem persistir status", () => {
    expect(externalServiceProgress(0, 0)).toBe("PENDENTE");
    expect(externalServiceProgress(1200, 400)).toBe("PARCIAL");
    expect(externalServiceProgress(1200, 1200)).toBe("CONCLUIDO");
    expect(isOutsourcedServiceLate(new Date("2026-09-01T00:00:00Z"), 1200, 400, new Date("2026-09-15T12:00:00Z"))).toBe(true);
    expect(isOutsourcedServiceLate(new Date("2026-09-01T00:00:00Z"), 1200, 1200, new Date("2026-09-15T12:00:00Z"))).toBe(false);
  });

  it("resume serviços concluídos", () => {
    expect(serviceProgressSummary(["CONCLUIDO", "PARCIAL", "PENDENTE"])).toEqual({ completed: 1, total: 3 });
  });
});
