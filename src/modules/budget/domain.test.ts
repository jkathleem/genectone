import { describe, expect, it } from "vitest";
import { comparison, monthlyCompetence, nonNegativeAmount, plannedDre } from "./domain";

describe("orçamento previsto x realizado", () => {
  it("normaliza competência e rejeita período inválido", () => { expect(monthlyCompetence(2026, 9).toISOString()).toBe("2026-09-01T00:00:00.000Z"); expect(() => monthlyCompetence(2026, 13)).toThrow("competência válida"); });
  it("aceita zero e rejeita negativo", () => { expect(nonNegativeAmount("0").isZero()).toBe(true); expect(() => nonNegativeAmount("-0.01")).toThrow("não pode ser negativo"); });
  it("calcula o cenário planejado", () => { const r=plannedDre("120000",[{group:"VARIABLE_COST_EXPENSE",amount:"35000"},{group:"FIXED_COST_EXPENSE",amount:"38000"},{group:"FINANCIAL_EXPENSE",amount:"4000"},{group:"INCOME_TAX_EXPENSE",amount:"2500"}]); expect(r.contributionMargin.toFixed(2)).toBe("85000.00"); expect(r.operatingProfit.toFixed(2)).toBe("47000.00"); expect(r.resultBeforeTaxes.toFixed(2)).toBe("43000.00"); expect(r.managerialNetIncome.toFixed(2)).toBe("40500.00"); });
  it("calcula variação, percentual e semântica",()=>{ const r=comparison("120000","100000","REVENUE"); expect(r.variance.toFixed(2)).toBe("-20000.00"); expect(r.variancePercentage?.toFixed(2)).toBe("-16.67"); expect(r.evaluation).toBe("Desfavorável"); expect(comparison("35000","30000","EXPENSE").evaluation).toBe("Favorável"); });
  it("expõe gasto não orçado sem percentual",()=>{ const r=comparison("0","2000","EXPENSE"); expect(r.variance.toFixed(2)).toBe("2000.00"); expect(r.variancePercentage).toBeNull(); expect(r.evaluation).toBe("Desfavorável"); });
  it("calcula a variação do resultado líquido",()=>{ expect(comparison("40500","22000","REVENUE").variance.toFixed(2)).toBe("-18500.00"); });
});
