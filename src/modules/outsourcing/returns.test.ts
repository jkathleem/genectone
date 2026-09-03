import { describe, expect, it } from "vitest";
import { approvedValue, appearsInCollections, daysOutside, derivedQuantities, operationalStatus, validApproval, validReturn } from "./domain";
describe("retornos e conferência", () => {
  it("preserva múltiplos retornos e deriva parcial/total", () => { const partial=derivedQuantities([{quantity:1000}],[{quantity:600}]); expect(partial.pendingQuantity).toBe(400); expect(operationalStatus(1000,600)).toBe("Retorno parcial"); const total=derivedQuantities([{quantity:1000}],[{quantity:600},{quantity:400}]); expect(total.pendingQuantity).toBe(0); expect(operationalStatus(1000,1000)).toBe("Retornado"); });
  it("valida retorno contra o pendente", () => { expect(validReturn(200,200)).toBe(true); expect(validReturn(201,200)).toBe(false); expect(validReturn(0,200)).toBe(false); expect(validReturn(-1,200)).toBe(false); });
  it("remove do painel quando não há pendência", () => { expect(appearsInCollections(1000,600)).toBe(true); expect(appearsInCollections(1000,1000)).toBe(false); });
  it("valida aprovação acumulada", () => { expect(validApproval(590,600)).toBe(true); expect(validApproval(601,600)).toBe(false); expect(validApproval(-1,600)).toBe(false); });
  it("calcula valor aprovado em Decimal", () => expect(approvedValue(990,"1.10").toFixed(2)).toBe("1089.00"));
  it("calcula dias desde a última saída", () => expect(daysOutside(new Date("2026-09-01"),new Date("2026-09-03"))).toBe(2));
});
