import { Prisma, PrismaClient, type StockMovementType } from "@/generated/prisma";
import { financialStatus } from "@/modules/accounts-payable/domain";
import { calculateSupplyBalanceFromMovements } from "./domain";

type InventoryReadDB = Pick<PrismaClient, "supply" | "stockMovement" | "supplyPurchase">;

export type ListStockMovementsFilters = {
  supplyId?: string;
  type?: StockMovementType;
  productionOrderId?: string;
  purchaseId?: string;
  supplyPurchaseItemId?: string;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  take?: number;
};

export async function getSupplyBalance(db: InventoryReadDB, supplyId: string) {
  const movements = await db.stockMovement.findMany({
    where: { supplyId },
    select: { direction: true, quantity: true },
  });
  return calculateSupplyBalanceFromMovements(movements);
}

export async function getSupplyBalances(db: InventoryReadDB, supplyIds: string[]) {
  const movements = await db.stockMovement.findMany({
    where: { supplyId: { in: supplyIds } },
    select: { supplyId: true, direction: true, quantity: true },
  });
  const balances = new Map(supplyIds.map((supplyId) => [supplyId, new Prisma.Decimal(0)]));
  for (const movement of movements) {
    const current = balances.get(movement.supplyId) ?? new Prisma.Decimal(0);
    balances.set(movement.supplyId, movement.direction === "IN" ? current.plus(movement.quantity) : current.minus(movement.quantity));
  }
  return balances;
}

export async function listSupplyBalances(db: InventoryReadDB) {
  const supplies = await db.supply.findMany({
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true, unit: true, minimumStock: true, active: true },
  });
  const balances = await getSupplyBalances(db, supplies.map((supply) => supply.id));
  return supplies.map((supply) => {
    const currentBalance = balances.get(supply.id) ?? new Prisma.Decimal(0);
    return {
      ...supply,
      currentBalance,
      belowMinimum: supply.minimumStock ? currentBalance.lt(supply.minimumStock) : false,
    };
  });
}

export async function listStockMovements(db: InventoryReadDB, filters: ListStockMovementsFilters = {}) {
  return db.stockMovement.findMany({
    where: {
      supplyId: filters.supplyId,
      type: filters.type,
      productionOrderId: filters.productionOrderId,
      supplyPurchaseItemId: filters.supplyPurchaseItemId,
      supplyPurchaseItem: filters.purchaseId ? { supplyPurchaseId: filters.purchaseId } : undefined,
      movementDate: filters.startDate || filters.endDate ? { gte: filters.startDate, lte: filters.endDate } : undefined,
    },
    include: {
      supply: { select: { id: true, code: true, name: true, unit: true } },
      productionOrder: { select: { id: true, number: true } },
      productionOrderSupply: { select: { id: true, supplyNameSnapshot: true, unitSnapshot: true } },
      supplyPurchaseItem: {
        select: {
          id: true,
          supplyPurchaseId: true,
          supplyPurchase: { select: { id: true, supplierNameSnapshot: true, documentNumber: true, purchaseDate: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
    skip: filters.skip,
    take: filters.take ?? 50,
  });
}

function payableSummary(accountPayable: {
  id: string;
  dueDate: Date;
  originalAmount: Prisma.Decimal;
  payments: { amount: Prisma.Decimal; reversal?: unknown | null }[];
} | null) {
  if (!accountPayable) return null;
  return {
    id: accountPayable.id,
    dueDate: accountPayable.dueDate,
    originalAmount: accountPayable.originalAmount,
    status: financialStatus(accountPayable.originalAmount, accountPayable.dueDate, accountPayable.payments),
  };
}

export async function listSupplyPurchases(db: InventoryReadDB) {
  const purchases = await db.supplyPurchase.findMany({
    include: {
      company: { select: { id: true, name: true } },
      items: { select: { id: true, supplyId: true, supplyNameSnapshot: true, unitSnapshot: true, quantity: true, unitPrice: true } },
      accountPayable: { include: { payments: { include: { reversal: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
  });
  return purchases.map((purchase) => ({
    ...purchase,
    total: purchase.items.reduce((sum, item) => sum.plus(item.quantity.mul(item.unitPrice)), new Prisma.Decimal(0)),
    accountPayableStatus: payableSummary(purchase.accountPayable),
  }));
}

export async function getSupplyPurchaseById(db: InventoryReadDB, id: string) {
  const purchase = await db.supplyPurchase.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      items: {
        include: {
          supply: { select: { id: true, code: true, name: true, unit: true } },
          stockMovements: true,
        },
      },
      accountPayable: { include: { payments: { include: { reversal: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!purchase) return null;
  return {
    ...purchase,
    total: purchase.items.reduce((sum, item) => sum.plus(item.quantity.mul(item.unitPrice)), new Prisma.Decimal(0)),
    accountPayableStatus: payableSummary(purchase.accountPayable),
  };
}
