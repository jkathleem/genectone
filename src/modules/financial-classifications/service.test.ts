import { describe, expect, it, vi } from "vitest";
import { classificationCodePattern, createFinancialClassification, updateFinancialClassification, validateNatureAndGroup } from "./service";

describe("classificações financeiras", () => {
  it.each(["PAYROLL", "ELECTRICITY_2026", "A1"])("aceita código estável %s", (code) => expect(classificationCodePattern.test(code)).toBe(true));
  it.each(["payroll", "COM ESPACO", "A-B"])("rejeita código inválido %s", (code) => expect(classificationCodePattern.test(code)).toBe(false));
  it("mantém código fora da edição", async () => {
    const update = vi.fn(async ({ data }) => data);
    const tx = { financialClassification: { findUnique: vi.fn(async () => ({ id: "classification", code: "STABLE", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE", _count: { accountsPayable: 0 } })), update } };
    const db = { $transaction: vi.fn(async (callback) => callback(tx)) };
    await updateFinancialClassification(db as never, "classification", { name: "Novo nome", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE" });
    expect(update.mock.calls[0][0].data).not.toHaveProperty("code");
  });
  it("bloqueia troca de grupo quando em uso", async () => {
    const tx = { financialClassification: { findUnique: vi.fn(async () => ({ id: "classification", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE", _count: { accountsPayable: 1 } })), update: vi.fn() } };
    const db = { $transaction: vi.fn(async (callback) => callback(tx)) };
    await expect(updateFinancialClassification(db as never, "classification", { name: "Nome", financialNature: "OPERATING_EXPENSE", dreGroup: "VARIABLE_COST_EXPENSE" })).rejects.toThrow("já está em uso");
  });
  it("valida o formato ao criar", async () => {
    const db = { financialClassification: { create: vi.fn() } };
    await expect(createFinancialClassification(db as never, { code: "codigo ruim", name: "Nome", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE" })).rejects.toThrow("A-Z");
  });
  it("exige grupo para OPERATING_EXPENSE", () => expect(() => validateNatureAndGroup("OPERATING_EXPENSE", null)).toThrow("grupo operacional"));
  it("exige grupo nulo para NON_DRE", () => expect(() => validateNatureAndGroup("NON_DRE", "FIXED_COST_EXPENSE")).toThrow("não podem possuir"));
  it("exige grupo pós-operacional coerente", () => {
    expect(() => validateNatureAndGroup("DRE_POST_OPERATING", "FINANCIAL_EXPENSE")).not.toThrow();
    expect(() => validateNatureAndGroup("DRE_POST_OPERATING", "FIXED_COST_EXPENSE")).toThrow("pós-operacional");
    expect(() => validateNatureAndGroup("OPERATING_EXPENSE", "INCOME_TAX_EXPENSE")).toThrow("operacional");
  });
  it("bloqueia troca de natureza quando em uso", async () => {
    const tx = { financialClassification: { findUnique: vi.fn(async () => ({ id: "classification", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE", _count: { accountsPayable: 1 } })), update: vi.fn() } };
    const db = { $transaction: vi.fn(async (callback) => callback(tx)) };
    await expect(updateFinancialClassification(db as never, "classification", { name: "Nome", financialNature: "NON_DRE", dreGroup: null })).rejects.toThrow("natureza financeira");
  });
});
