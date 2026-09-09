import { describe, expect, it, vi } from "vitest";
import { createManualAccountPayable } from "./creation";

function fixture(active = true) {
  const create = vi.fn(async ({ data }) => ({ id: "payable", ...data }));
  const tx = {
    company: { findUnique: vi.fn(async () => ({ id: "company", active: true })) },
    financialClassification: { findUnique: vi.fn(async () => active ? ({ id: "classification", code: "TEMP_FIXED_QA", name: "Despesa Fixa QA", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE", active: true }) : ({ id: "classification", active: false })) },
    accountPayable: { create },
  };
  return { db: { $transaction: vi.fn(async (callback) => callback(tx)) }, create };
}

const input = { companyId: "company", payeeName: "Energia QA", description: "Energia elétrica", classificationId: "classification", competenceYear: 2026, competenceMonth: 9, dueDate: new Date("2026-10-10T00:00:00Z"), originalAmount: "1000.0000" };

describe("Conta a Pagar manual", () => {
  it("exige classificação", async () => await expect(createManualAccountPayable(fixture().db as never, { ...input, classificationId: "" })).rejects.toThrow("classificação"));
  it("rejeita classificação inativa", async () => await expect(createManualAccountPayable(fixture(false).db as never, input)).rejects.toThrow("classificação ativa"));
  it("exige beneficiário", async () => await expect(createManualAccountPayable(fixture().db as never, { ...input, payeeName: " " })).rejects.toThrow("beneficiário"));
  it.each(["0", "-1"])("exige valor positivo: %s", async (originalAmount) => await expect(createManualAccountPayable(fixture().db as never, { ...input, originalAmount })).rejects.toThrow("maior que zero"));
  it("grava origem manual, competência e snapshots sem criar pagamento", async () => {
    const item = fixture();
    await createManualAccountPayable(item.db as never, input);
    expect(item.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      source: "MANUAL",
      contractorSettlementId: null,
      classificationCodeSnapshot: "TEMP_FIXED_QA",
      classificationNameSnapshot: "Despesa Fixa QA",
      financialNatureSnapshot: "OPERATING_EXPENSE",
      dreGroupSnapshot: "FIXED_COST_EXPENSE",
      payeeName: "Energia QA",
      competenceDate: new Date("2026-09-01T00:00:00.000Z"),
      originalAmount: expect.objectContaining({}),
    }) });
    expect(item.create.mock.calls[0][0].data).not.toHaveProperty("payments");
  });
  it("aceita classificação NON_DRE e copia snapshots coerentes", async () => {
    const item = fixture();
    item.db.$transaction = vi.fn(async (callback) => callback({
      company: { findUnique: vi.fn(async () => ({ id: "company", active: true })) },
      financialClassification: { findUnique: vi.fn(async () => ({ id: "classification", code: "TEMP_NON_DRE_QA", name: "Movimento fora da DRE QA", financialNature: "NON_DRE", dreGroup: null, active: true })) },
      accountPayable: { create: item.create },
    })) as never;
    await createManualAccountPayable(item.db as never, input);
    expect(item.create).toHaveBeenCalledWith({ data: expect.objectContaining({ financialNatureSnapshot: "NON_DRE", dreGroupSnapshot: null }) });
  });
  it("rejeita classificação de receita financeira", async () => {
    const item = fixture();
    item.db.$transaction = vi.fn(async (callback) => callback({
      company: { findUnique: vi.fn(async () => ({ id: "company", active: true })) },
      financialClassification: { findUnique: vi.fn(async () => ({ id: "classification", code: "FINANCIAL_REVENUE_QA", name: "Receita financeira", financialNature: "DRE_POST_OPERATING", dreGroup: "FINANCIAL_REVENUE", active: true })) },
      accountPayable: { create: item.create },
    })) as never;
    await expect(createManualAccountPayable(item.db as never, input)).rejects.toThrow("receita financeira");
  });
});
