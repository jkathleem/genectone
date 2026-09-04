import { describe, expect, it, vi } from "vitest";
import { createPayment } from "./payments";
import { Prisma } from "@/generated/prisma";
function db(original = "100", existing: string[] = []) {
  const create = vi.fn(async ({ data }) => data);
  const tx = { $queryRaw: vi.fn(async () => [{ id: "account" }]), accountPayable: { findUnique: vi.fn(async () => ({ originalAmount: new Prisma.Decimal(original), payments: existing.map(amount => ({ amount: new Prisma.Decimal(amount) })) })) }, payment: { create } };
  return { client: { $transaction: async (callback: (value: typeof tx) => unknown) => callback(tx) }, create };
}
describe("registro de pagamento", () => {
  it.each(["0", "-1"])("rejeita valor não positivo: %s", async amount => { const fixture = db(); await expect(createPayment(fixture.client as never, "account", { paymentDate: new Date(), amount })).rejects.toThrow("maior que zero"); });
  it("aceita pagamento parcial e exato", async () => { const partial = db("784"); await createPayment(partial.client as never, "account", { paymentDate: new Date(), amount: "500.0000" }); expect(partial.create).toHaveBeenCalled(); const exact = db("784", ["500"]); await createPayment(exact.client as never, "account", { paymentDate: new Date(), amount: "284.0000" }); expect(exact.create).toHaveBeenCalled(); });
  it("rejeita pagamento acima do saldo e conta paga", async () => { await expect(createPayment(db("100", ["60"]).client as never, "account", { paymentDate: new Date(), amount: "41" })).rejects.toThrow("ultrapassar"); await expect(createPayment(db("100", ["100"]).client as never, "account", { paymentDate: new Date(), amount: "1" })).rejects.toThrow("já está paga"); });
});
