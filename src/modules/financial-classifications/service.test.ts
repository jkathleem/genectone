import { describe, expect, it, vi } from "vitest";
import { classificationCodePattern, createFinancialClassification, updateFinancialClassification } from "./service";

describe("classificações financeiras", () => {
  it.each(["PAYROLL", "ELECTRICITY_2026", "A1"])("aceita código estável %s", (code) => expect(classificationCodePattern.test(code)).toBe(true));
  it.each(["payroll", "COM ESPACO", "A-B"])("rejeita código inválido %s", (code) => expect(classificationCodePattern.test(code)).toBe(false));
  it("mantém código fora da edição", async () => {
    const update = vi.fn(async ({ data }) => data);
    const tx = { financialClassification: { findUnique: vi.fn(async () => ({ id: "classification", code: "STABLE", dreGroup: "FIXED_COST_EXPENSE", _count: { accountsPayable: 0 } })), update } };
    const db = { $transaction: vi.fn(async (callback) => callback(tx)) };
    await updateFinancialClassification(db as never, "classification", { name: "Novo nome", dreGroup: "FIXED_COST_EXPENSE" });
    expect(update.mock.calls[0][0].data).not.toHaveProperty("code");
  });
  it("bloqueia troca de grupo quando em uso", async () => {
    const tx = { financialClassification: { findUnique: vi.fn(async () => ({ id: "classification", dreGroup: "FIXED_COST_EXPENSE", _count: { accountsPayable: 1 } })), update: vi.fn() } };
    const db = { $transaction: vi.fn(async (callback) => callback(tx)) };
    await expect(updateFinancialClassification(db as never, "classification", { name: "Nome", dreGroup: "VARIABLE_COST_EXPENSE" })).rejects.toThrow("já está em uso");
  });
  it("valida o formato ao criar", async () => {
    const db = { financialClassification: { create: vi.fn() } };
    await expect(createFinancialClassification(db as never, { code: "codigo ruim", name: "Nome", dreGroup: "FIXED_COST_EXPENSE" })).rejects.toThrow("A-Z");
  });
});
