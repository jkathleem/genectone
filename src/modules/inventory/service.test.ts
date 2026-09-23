import { Prisma } from "@/generated/prisma";
import { describe, expect, it, vi } from "vitest";
import {
  registerProductionOrderSupplyConsumption,
  registerStockAdjustment,
  registerSupplyPurchase,
} from "./service";

function transactionDb(tx: object) {
  return {
    $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)),
  };
}

describe("serviços transacionais de estoque", () => {
  it("registra compra com itens, movimentos de entrada e Conta a Pagar vinculada", async () => {
    const tx = {
      company: { findUnique: vi.fn().mockResolvedValue({ id: "company-1", active: true }) },
      financialClassification: {
        findUnique: vi.fn().mockResolvedValue({
          id: "class-1",
          code: "PRODUCTION_MATERIALS",
          name: "Materiais produtivos",
          financialNature: "OPERATING_EXPENSE",
          dreGroup: "VARIABLE_COST_EXPENSE",
          active: true,
        }),
      },
      supply: {
        findMany: vi.fn().mockResolvedValue([
          { id: "supply-1", name: "Linha", unit: "cone", active: true },
          { id: "supply-2", name: "Etiqueta", unit: "un", active: true },
        ]),
      },
      supplyPurchase: { create: vi.fn().mockResolvedValue({ id: "purchase-1" }) },
      supplyPurchaseItem: {
        create: vi.fn()
          .mockResolvedValueOnce({ id: "item-1" })
          .mockResolvedValueOnce({ id: "item-2" }),
      },
      stockMovement: {
        create: vi.fn()
          .mockResolvedValueOnce({ id: "movement-1" })
          .mockResolvedValueOnce({ id: "movement-2" }),
      },
      accountPayable: { create: vi.fn().mockResolvedValue({ id: "payable-1" }) },
    };

    await registerSupplyPurchase(transactionDb(tx) as never, {
      companyId: "company-1",
      supplierNameSnapshot: "Fornecedor QA",
      purchaseDate: new Date("2026-09-10T00:00:00.000Z"),
      dueDate: new Date("2026-09-20T00:00:00.000Z"),
      documentNumber: "NF-1",
      financialClassificationId: "class-1",
      items: [
        { supplyId: "supply-1", quantity: "2", unitPrice: "10.50" },
        { supplyId: "supply-2", quantity: "3", unitPrice: "2.00" },
      ],
    }, { role: "FINANCE", userId: "user-1" });

    expect(tx.supplyPurchase.create).toHaveBeenCalledTimes(1);
    expect(tx.supplyPurchaseItem.create).toHaveBeenCalledTimes(2);
    expect(tx.stockMovement.create).toHaveBeenCalledTimes(2);
    expect(tx.stockMovement.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ type: "PURCHASE", direction: "IN", supplyPurchaseItemId: "item-1" }),
    }));
    expect(tx.accountPayable.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        source: "SUPPLY_PURCHASE",
        supplyPurchaseId: "purchase-1",
        classificationCodeSnapshot: "PRODUCTION_MATERIALS",
      }),
    }));
    expect(tx.accountPayable.create.mock.calls[0][0].data.originalAmount.toString()).toBe("27");
  });

  it("não aceita compra com classificação NON_DRE", async () => {
    const tx = {
      company: { findUnique: vi.fn().mockResolvedValue({ id: "company-1", active: true }) },
      financialClassification: {
        findUnique: vi.fn().mockResolvedValue({
          id: "class-1",
          code: "NON_DRE",
          name: "Fora da DRE",
          financialNature: "NON_DRE",
          dreGroup: null,
          active: true,
        }),
      },
      supply: { findMany: vi.fn().mockResolvedValue([{ id: "supply-1", name: "Linha", unit: "cone", active: true }]) },
      supplyPurchase: { create: vi.fn() },
      supplyPurchaseItem: { create: vi.fn() },
      stockMovement: { create: vi.fn() },
      accountPayable: { create: vi.fn() },
    };

    await expect(registerSupplyPurchase(transactionDb(tx) as never, {
      companyId: "company-1",
      supplierNameSnapshot: "Fornecedor QA",
      purchaseDate: new Date("2026-09-10T00:00:00.000Z"),
      financialClassificationId: "class-1",
      items: [{ supplyId: "supply-1", quantity: "1", unitPrice: "1" }],
    }, { role: "FINANCE", userId: "user-1" })).rejects.toThrow("afeta a DRE");

    expect(tx.supplyPurchase.create).not.toHaveBeenCalled();
  });

  it("não persiste Conta a Pagar se falhar antes do fim da transação da compra", async () => {
    const tx = {
      company: { findUnique: vi.fn().mockResolvedValue({ id: "company-1", active: true }) },
      financialClassification: {
        findUnique: vi.fn().mockResolvedValue({
          id: "class-1",
          code: "PRODUCTION_SUPPLIES",
          name: "Suprimentos",
          financialNature: "OPERATING_EXPENSE",
          dreGroup: "VARIABLE_COST_EXPENSE",
          active: true,
        }),
      },
      supply: { findMany: vi.fn().mockResolvedValue([{ id: "supply-1", name: "Linha", unit: "cone", active: true }]) },
      supplyPurchase: { create: vi.fn().mockResolvedValue({ id: "purchase-1" }) },
      supplyPurchaseItem: { create: vi.fn().mockResolvedValue({ id: "item-1" }) },
      stockMovement: { create: vi.fn().mockRejectedValue(new Error("falha no movimento")) },
      accountPayable: { create: vi.fn() },
    };

    await expect(registerSupplyPurchase(transactionDb(tx) as never, {
      companyId: "company-1",
      supplierNameSnapshot: "Fornecedor QA",
      purchaseDate: new Date("2026-09-10T00:00:00.000Z"),
      financialClassificationId: "class-1",
      items: [{ supplyId: "supply-1", quantity: "1", unitPrice: "1" }],
    }, { role: "FINANCE", userId: "user-1" })).rejects.toThrow("falha no movimento");

    expect(tx.accountPayable.create).not.toHaveBeenCalled();
  });

  it("registra consumo real de OP sem alterar o planejado e sem Conta a Pagar", async () => {
    const tx = {
      productionOrder: { findUnique: vi.fn().mockResolvedValue({ id: "op-1" }) },
      supply: { findUnique: vi.fn().mockResolvedValue({ id: "supply-1", name: "Linha", unit: "cone" }) },
      productionOrderSupply: { findFirst: vi.fn().mockResolvedValue({ id: "pos-1" }) },
      stockMovement: {
        findMany: vi.fn().mockResolvedValue([{ direction: "IN", quantity: new Prisma.Decimal(10) }]),
        create: vi.fn().mockResolvedValue({ id: "movement-1" }),
      },
      productionOrderSupplyConsumption: {
        create: vi.fn().mockResolvedValue({ id: "consumption-1" }),
        update: vi.fn().mockResolvedValue({ id: "consumption-1", stockMovementId: "movement-1" }),
      },
      accountPayable: { create: vi.fn() },
    };

    const result = await registerProductionOrderSupplyConsumption(transactionDb(tx) as never, {
      productionOrderId: "op-1",
      productionOrderSupplyId: "pos-1",
      supplyId: "supply-1",
      quantity: "4",
      consumptionDate: new Date("2026-09-11T00:00:00.000Z"),
    }, { role: "OPERATIONS", userId: "user-1" });

    expect(result.warnings).toHaveLength(0);
    expect(tx.productionOrderSupply.findFirst).toHaveBeenCalled();
    expect(tx.stockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: "OP_CONSUMPTION",
        direction: "OUT",
        productionOrderId: "op-1",
        productionOrderSupplyId: "pos-1",
      }),
    }));
    expect(tx.accountPayable.create).not.toHaveBeenCalled();
  });

  it("permite estoque negativo e retorna aviso de domínio", async () => {
    const tx = {
      productionOrder: { findUnique: vi.fn().mockResolvedValue({ id: "op-1" }) },
      supply: { findUnique: vi.fn().mockResolvedValue({ id: "supply-1", name: "Linha", unit: "cone" }) },
      stockMovement: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: "movement-1" }),
      },
      productionOrderSupplyConsumption: {
        create: vi.fn().mockResolvedValue({ id: "consumption-1" }),
        update: vi.fn().mockResolvedValue({ id: "consumption-1", stockMovementId: "movement-1" }),
      },
    };

    const result = await registerProductionOrderSupplyConsumption(transactionDb(tx) as never, {
      productionOrderId: "op-1",
      supplyId: "supply-1",
      quantity: "5",
      consumptionDate: new Date("2026-09-11T00:00:00.000Z"),
    }, { role: "OPERATIONS", userId: "user-1" });

    expect(result.warnings[0]).toMatchObject({ code: "NEGATIVE_STOCK", supplyId: "supply-1" });
    expect(result.warnings[0].balance.toString()).toBe("-5");
  });

  it("registra ajuste manual somente para ADMIN", async () => {
    const tx = {
      supply: { findUnique: vi.fn().mockResolvedValue({ id: "supply-1" }) },
      stockMovement: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: "movement-1" }),
      },
    };

    await expect(registerStockAdjustment(transactionDb(tx) as never, {
      supplyId: "supply-1",
      direction: "IN",
      quantity: "1",
      movementDate: new Date("2026-09-12T00:00:00.000Z"),
      reason: "Inventário",
    }, { role: "OPERATIONS", userId: "user-1" })).rejects.toThrow("sem permissão");

    await registerStockAdjustment(transactionDb(tx) as never, {
      supplyId: "supply-1",
      direction: "OUT",
      quantity: "1",
      movementDate: new Date("2026-09-12T00:00:00.000Z"),
      reason: "Inventário",
    }, { role: "ADMIN", userId: "user-1" });

    expect(tx.stockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "NEGATIVE_ADJUSTMENT", direction: "OUT", reason: "Inventário" }),
    }));
  });
});
