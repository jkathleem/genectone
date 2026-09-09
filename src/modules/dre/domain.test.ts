import { describe, expect, it } from "vitest";
import { calculateOperationalDre, groupByClassification } from "./domain";

const expense = (classificationCode: string, classificationName: string, group: "VARIABLE_COST_EXPENSE" | "FIXED_COST_EXPENSE", amount: string) => ({ classificationCode, classificationName, group, amount });

describe("DRE operacional", () => {
  it("calcula exatamente o cenário gerencial principal", () => {
    const result = calculateOperationalDre(["60000", "40000"], [
      expense("OUTSOURCED_PRODUCTION", "Serviços terceirizados de produção", "VARIABLE_COST_EXPENSE", "25000"),
      expense("MATERIAL_QA", "Material", "VARIABLE_COST_EXPENSE", "15000"),
      expense("PAYROLL_QA", "Salários", "FIXED_COST_EXPENSE", "20000"),
      expense("ENERGY_QA", "Energia", "FIXED_COST_EXPENSE", "5000"),
      expense("RENT_QA", "Aluguel", "FIXED_COST_EXPENSE", "5000"),
      expense("ACCOUNTANT_QA", "Contador", "FIXED_COST_EXPENSE", "5000"),
    ]);
    expect(result.grossRevenue.toFixed(2)).toBe("100000.00");
    expect(result.variableExpenses.toFixed(2)).toBe("40000.00");
    expect(result.contributionMargin.toFixed(2)).toBe("60000.00");
    expect(result.contributionMarginPercentage?.toFixed(2)).toBe("60.00");
    expect(result.fixedExpenses.toFixed(2)).toBe("35000.00");
    expect(result.operatingProfit.toFixed(2)).toBe("25000.00");
    expect(result.operatingMarginPercentage?.toFixed(2)).toBe("25.00");
  });
  it("não divide por zero", () => {
    const result = calculateOperationalDre([], []);
    expect(result.grossRevenue.isZero()).toBe(true);
    expect(result.contributionMarginPercentage).toBeNull();
    expect(result.operatingMarginPercentage).toBeNull();
  });
  it("preserva resultado negativo", () => {
    const result = calculateOperationalDre(["100"], [expense("V", "Variável", "VARIABLE_COST_EXPENSE", "150"), expense("F", "Fixa", "FIXED_COST_EXPENSE", "25")]);
    expect(result.contributionMargin.toFixed(2)).toBe("-50.00");
    expect(result.operatingProfit.toFixed(2)).toBe("-75.00");
  });
  it("agrupa por código e nome snapshot", () => {
    const groups = groupByClassification([expense("ENERGY_QA", "Energia Elétrica", "FIXED_COST_EXPENSE", "1000"), expense("ENERGY_QA", "Energia Elétrica", "FIXED_COST_EXPENSE", "500"), expense("ENERGY_QA", "Energia", "FIXED_COST_EXPENSE", "200")]);
    expect(groups).toHaveLength(2);
    expect(groups.find((item) => item.classificationName === "Energia Elétrica")?.total.toFixed(2)).toBe("1500.00");
  });
});
