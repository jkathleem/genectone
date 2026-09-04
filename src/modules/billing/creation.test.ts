import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma";
import { createBillingAndReceivable } from "./creation";
function fixture(receivableFails = false) {
  const billingCreate = vi.fn(async ({ data }) => ({ id: "billing", ...data }));
  const receivableCreate = vi.fn(async ({ data }) => { if (receivableFails) throw new Error("falha controlada"); return { id: "receivable", ...data }; });
  const tx = { $queryRaw: vi.fn(), productionOrder: { findUnique: vi.fn(async () => ({ id: "op", number: "123", companyId: "company", customerId: "customer", company: {}, customer: { name: "Cliente" }, billing: null })) }, billing: { findUnique: vi.fn(async () => null), create: billingCreate }, accountReceivable: { create: receivableCreate } };
  const client = { $transaction: async (callback: (value: object) => unknown) => callback(tx) };
  return { client, billingCreate, receivableCreate };
}
const input = { invoiceNumber: "12345", issueDate: new Date("2026-09-30T00:00:00Z"), amount: new Prisma.Decimal("10450.0000"), competenceYear: 2026, competenceMonth: 9, dueDate: new Date("2026-10-15T00:00:00Z") };
describe("criação de faturamento e conta", () => {
  it.each(["0", "-1"])("rejeita valor não positivo: %s", async amount => await expect(createBillingAndReceivable(fixture().client as never, "op", { ...input, amount })).rejects.toThrow("maior que zero"));
  it("copia Company, Customer, valor e competência da origem", async () => { const f = fixture(); const result = await createBillingAndReceivable(f.client as never, "op", input); expect(f.billingCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ companyId: "company", amount: input.amount }) })); expect(f.receivableCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ companyId: "company", customerId: "customer", originalAmount: input.amount, competenceDate: new Date("2026-09-01T00:00:00.000Z") }) })); expect(result.accountReceivable.id).toBe("receivable"); });
  it("propaga falha da Conta a Receber dentro da mesma transação", async () => { const f = fixture(true); await expect(createBillingAndReceivable(f.client as never, "op", input)).rejects.toThrow("falha controlada"); expect(f.billingCreate).toHaveBeenCalled(); expect(f.receivableCreate).toHaveBeenCalled(); });
});
