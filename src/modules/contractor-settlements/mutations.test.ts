import { describe, expect, it, vi } from "vitest";
import { addDraftItem, removeDraftItem, updateDraft, updateDraftItem } from "./mutations";

type Database = Parameters<typeof updateDraft>[0];
type Transaction = Record<string, Record<string, ReturnType<typeof vi.fn>>>;
function database(transaction: Transaction): Database {
  return { $transaction: (callback: (tx: Transaction) => unknown) => Promise.resolve(callback(transaction)) } as unknown as Database;
}

describe("mutações de fechamento", () => {
  it("altera competência, observações e terceirizado quando vazio", async () => {
    const update = vi.fn().mockResolvedValue({ id: "s" });
    const tx = { contractorSettlement: { findUnique: vi.fn().mockResolvedValue({ status: "DRAFT", contractorId: "a", _count: { items: 0 } }), update }, contractor: { findUnique: vi.fn().mockResolvedValue({ id: "b" }) } };
    await updateDraft(database(tx), "s", { contractorId: "b", periodMonth: 10, periodYear: 2026, notes: "Revisado" });
    expect(update).toHaveBeenCalledWith({ where: { id: "s" }, data: { contractorId: "b", periodMonth: 10, periodYear: 2026, notes: "Revisado" } });
  });

  it("rejeita troca de terceirizado quando existem itens", async () => {
    const tx = { contractorSettlement: { findUnique: vi.fn().mockResolvedValue({ status: "DRAFT", contractorId: "a", _count: { items: 1 } }), update: vi.fn() }, contractor: { findUnique: vi.fn() } };
    await expect(updateDraft(database(tx), "s", { contractorId: "b", periodMonth: 9, periodYear: 2026, notes: null })).rejects.toThrow("Remova os itens");
  });

  it("adiciona item com snapshot de preço", async () => {
    const create = vi.fn().mockResolvedValue({ id: "i" });
    const tx = { contractorSettlement: { findUnique: vi.fn().mockResolvedValue({ status: "DRAFT", contractorId: "a" }) }, outsourcedService: { findUnique: vi.fn().mockResolvedValue({ contractorId: "a", approvedQuantity: 10, appliedUnitPrice: "1.10", settlementItems: [] }) }, contractorSettlementItem: { findUnique: vi.fn().mockResolvedValue(null), create } };
    await addDraftItem(database(tx), "s", "os", 10);
    expect(create).toHaveBeenCalledWith({ data: { settlementId: "s", outsourcedServiceId: "os", approvedQuantityIncluded: 10, appliedUnitPriceSnapshot: "1.10" } });
  });

  it("rejeita item de outro terceirizado e item duplicado", async () => {
    const base = { contractorSettlement: { findUnique: vi.fn().mockResolvedValue({ status: "DRAFT", contractorId: "a" }) }, contractorSettlementItem: { findUnique: vi.fn(), create: vi.fn() } };
    await expect(addDraftItem(database({ ...base, outsourcedService: { findUnique: vi.fn().mockResolvedValue({ contractorId: "b", approvedQuantity: 1, appliedUnitPrice: "1", settlementItems: [] }) } }), "s", "os", 1)).rejects.toThrow("outro terceirizado");
    base.contractorSettlementItem.findUnique.mockResolvedValue({ id: "existing" });
    await expect(addDraftItem(database({ ...base, outsourcedService: { findUnique: vi.fn().mockResolvedValue({ contractorId: "a", approvedQuantity: 1, appliedUnitPrice: "1", settlementItems: [] }) } }), "s", "os", 1)).rejects.toThrow("já está no fechamento");
  });

  it("altera quantidade e remove item em DRAFT", async () => {
    const update = vi.fn().mockResolvedValue({ id: "i" }); const remove = vi.fn().mockResolvedValue({ id: "i" });
    const tx = { contractorSettlementItem: { findUnique: vi.fn().mockResolvedValue({ id: "i", settlement: { status: "DRAFT" }, outsourcedService: { approvedQuantity: 20, settlementItems: [] } }), update, delete: remove } };
    await updateDraftItem(database(tx), "i", 20); await removeDraftItem(database(tx), "i");
    expect(update).toHaveBeenCalledWith({ where: { id: "i" }, data: { approvedQuantityIncluded: 20 } }); expect(remove).toHaveBeenCalledWith({ where: { id: "i" } });
  });

  it("rejeita quantidades zero e negativa", async () => {
    const db = database({});
    await expect(addDraftItem(db, "s", "os", 0)).rejects.toThrow("maior que zero");
    await expect(updateDraftItem(db, "i", -1)).rejects.toThrow("maior que zero");
  });

  it("rejeita todas as mutações em APPROVED", async () => {
    const tx = { contractorSettlement: { findUnique: vi.fn().mockResolvedValue({ status: "APPROVED", contractorId: "a", _count: { items: 0 } }), update: vi.fn() }, contractor: { findUnique: vi.fn() }, outsourcedService: { findUnique: vi.fn() }, contractorSettlementItem: { findUnique: vi.fn().mockResolvedValue({ settlement: { status: "APPROVED" }, outsourcedService: { approvedQuantity: 1, settlementItems: [] } }), update: vi.fn(), delete: vi.fn(), create: vi.fn() } };
    const db = database(tx);
    await expect(updateDraft(db, "s", { contractorId: "a", periodMonth: 9, periodYear: 2026, notes: null })).rejects.toThrow("já foi aprovado");
    await expect(addDraftItem(db, "s", "os", 1)).rejects.toThrow("já foi aprovado");
    await expect(updateDraftItem(db, "i", 1)).rejects.toThrow("já foi aprovado");
    await expect(removeDraftItem(db, "i")).rejects.toThrow("já foi aprovado");
  });
});
