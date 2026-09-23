import { Prisma, PrismaClient, type StockMovementDirection, type UserRole } from "@/generated/prisma";
import { hasPermission, type Permission } from "@/modules/auth/permissions";
import {
  calculateSupplyBalanceFromMovements,
  competenceFromDate,
  negativeStockWarning,
  positiveDecimal,
  requiredInventoryText,
  validInventoryDate,
  type DecimalInput,
  type InventoryWarning,
} from "./domain";

type DB = Pick<PrismaClient, "$transaction">;
type Tx = Prisma.TransactionClient;

type InventoryActor = {
  userId?: string | null;
  role: UserRole;
};

export type RegisterSupplyPurchaseInput = {
  companyId: string;
  supplierNameSnapshot: string;
  purchaseDate: Date;
  dueDate?: Date | null;
  documentNumber?: string | null;
  notes?: string | null;
  financialClassificationId: string;
  items: {
    supplyId: string;
    quantity: DecimalInput;
    unitPrice: DecimalInput;
    notes?: string | null;
  }[];
};

export type RegisterProductionOrderSupplyConsumptionInput = {
  productionOrderId: string;
  supplyId: string;
  productionOrderSupplyId?: string | null;
  quantity: DecimalInput;
  consumptionDate: Date;
  notes?: string | null;
};

export type RegisterStockAdjustmentInput = {
  supplyId: string;
  direction: StockMovementDirection;
  quantity: DecimalInput;
  movementDate: Date;
  reason: string;
  notes?: string | null;
};

function requireInventoryPermission(actor: InventoryActor, permission: Permission) {
  if (!hasPermission(actor.role, permission)) throw new Error("Usuário sem permissão para esta operação de estoque.");
}

function dueDateForPurchase(input: RegisterSupplyPurchaseInput) {
  return validInventoryDate(input.dueDate ?? input.purchaseDate, "Informe um vencimento válido.");
}

function documentOrNull(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

async function calculateSupplyBalance(tx: Tx, supplyId: string) {
  const movements = await tx.stockMovement.findMany({
    where: { supplyId },
    select: { direction: true, quantity: true },
  });
  return calculateSupplyBalanceFromMovements(movements);
}

export async function registerSupplyPurchase(db: DB, input: RegisterSupplyPurchaseInput, actor: InventoryActor) {
  requireInventoryPermission(actor, "STOCK_PURCHASE");
  if (!input.companyId) throw new Error("Selecione a empresa.");
  if (!input.financialClassificationId) throw new Error("Selecione a classificação financeira.");
  const supplierNameSnapshot = requiredInventoryText(input.supplierNameSnapshot, "Informe o fornecedor.");
  const purchaseDate = validInventoryDate(input.purchaseDate, "Informe uma data de compra válida.");
  const dueDate = dueDateForPurchase(input);
  if (!input.items.length) throw new Error("Informe ao menos um item da compra.");

  const normalizedItems = input.items.map((item) => ({
    ...item,
    quantity: positiveDecimal(item.quantity, "A quantidade do item deve ser maior que zero."),
    unitPrice: positiveDecimal(item.unitPrice, "O preço unitário do item deve ser maior que zero."),
  }));

  return db.$transaction(async (tx) => {
    const [company, classification, supplies] = await Promise.all([
      tx.company.findUnique({ where: { id: input.companyId }, select: { id: true, active: true } }),
      tx.financialClassification.findUnique({ where: { id: input.financialClassificationId } }),
      tx.supply.findMany({
        where: { id: { in: normalizedItems.map((item) => item.supplyId) } },
        select: { id: true, name: true, unit: true, active: true },
      }),
    ]);

    if (!company?.active) throw new Error("Selecione uma empresa ativa.");
    if (!classification?.active) throw new Error("Selecione uma classificação financeira ativa.");
    if (classification.dreGroup === "FINANCIAL_REVENUE") throw new Error("Compra de insumos não pode usar classificação de receita financeira.");
    if (classification.financialNature === "NON_DRE") throw new Error("Compra de insumos deve usar classificação que afeta a DRE.");

    const suppliesById = new Map(supplies.map((supply) => [supply.id, supply]));
    for (const item of normalizedItems) {
      const supply = suppliesById.get(item.supplyId);
      if (!supply?.active) throw new Error("Todos os insumos da compra devem estar ativos.");
    }

    const total = normalizedItems.reduce((sum, item) => sum.plus(item.quantity.mul(item.unitPrice)), new Prisma.Decimal(0));
    const purchase = await tx.supplyPurchase.create({
      data: {
        companyId: company.id,
        supplierNameSnapshot,
        purchaseDate,
        dueDate,
        documentNumber: documentOrNull(input.documentNumber),
        notes: input.notes ?? null,
        createdByUserId: actor.userId ?? null,
      },
    });

    const items = [];
    const stockMovements = [];
    for (const item of normalizedItems) {
      const supply = suppliesById.get(item.supplyId);
      if (!supply) throw new Error("Insumo não encontrado.");
      const purchaseItem = await tx.supplyPurchaseItem.create({
        data: {
          supplyPurchaseId: purchase.id,
          supplyId: supply.id,
          supplyNameSnapshot: supply.name,
          unitSnapshot: supply.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes ?? null,
        },
      });
      items.push(purchaseItem);
      stockMovements.push(await tx.stockMovement.create({
        data: {
          supplyId: supply.id,
          type: "PURCHASE",
          direction: "IN",
          quantity: item.quantity,
          movementDate: purchaseDate,
          supplyPurchaseItemId: purchaseItem.id,
          createdByUserId: actor.userId ?? null,
          notes: item.notes ?? null,
        },
      }));
    }

    const accountPayable = await tx.accountPayable.create({
      data: {
        companyId: company.id,
        supplyPurchaseId: purchase.id,
        contractorSettlementId: null,
        source: "SUPPLY_PURCHASE",
        classificationId: classification.id,
        classificationCodeSnapshot: classification.code,
        classificationNameSnapshot: classification.name,
        financialNatureSnapshot: classification.financialNature,
        dreGroupSnapshot: classification.dreGroup,
        payeeName: supplierNameSnapshot,
        description: `Compra de insumos — ${supplierNameSnapshot}${input.documentNumber ? ` — Doc. ${input.documentNumber.trim()}` : ""}`,
        competenceDate: competenceFromDate(purchaseDate),
        dueDate,
        originalAmount: total,
        createdByUserId: actor.userId ?? null,
      },
    });

    return { purchase, items, stockMovements, accountPayable };
  });
}

export async function registerProductionOrderSupplyConsumption(
  db: DB,
  input: RegisterProductionOrderSupplyConsumptionInput,
  actor: InventoryActor,
) {
  requireInventoryPermission(actor, "STOCK_CONSUME");
  if (!input.productionOrderId) throw new Error("Selecione a OP.");
  if (!input.supplyId) throw new Error("Selecione o insumo.");
  const quantity = positiveDecimal(input.quantity, "A quantidade consumida deve ser maior que zero.");
  const consumptionDate = validInventoryDate(input.consumptionDate, "Informe uma data de consumo válida.");

  return db.$transaction(async (tx) => {
    const [productionOrder, supply] = await Promise.all([
      tx.productionOrder.findUnique({ where: { id: input.productionOrderId }, select: { id: true } }),
      tx.supply.findUnique({ where: { id: input.supplyId }, select: { id: true, name: true, unit: true } }),
    ]);
    if (!productionOrder) throw new Error("OP não encontrada.");
    if (!supply) throw new Error("Insumo não encontrado.");

    if (input.productionOrderSupplyId) {
      const orderSupply = await tx.productionOrderSupply.findFirst({
        where: {
          id: input.productionOrderSupplyId,
          productionOrderId: productionOrder.id,
          supplyId: supply.id,
        },
        select: { id: true },
      });
      if (!orderSupply) throw new Error("O insumo previsto informado não pertence à OP e ao insumo selecionados.");
    }

    const balanceBefore = await calculateSupplyBalance(tx, supply.id);
    const projectedBalance = balanceBefore.minus(quantity);
    const warning = negativeStockWarning(supply.id, projectedBalance);

    const consumption = await tx.productionOrderSupplyConsumption.create({
      data: {
        productionOrderId: productionOrder.id,
        productionOrderSupplyId: input.productionOrderSupplyId ?? null,
        supplyId: supply.id,
        supplyNameSnapshot: supply.name,
        unitSnapshot: supply.unit,
        quantity,
        consumptionDate,
        notes: input.notes ?? null,
        createdByUserId: actor.userId ?? null,
      },
    });

    const stockMovement = await tx.stockMovement.create({
      data: {
        supplyId: supply.id,
        type: "OP_CONSUMPTION",
        direction: "OUT",
        quantity,
        movementDate: consumptionDate,
        productionOrderId: productionOrder.id,
        productionOrderSupplyId: input.productionOrderSupplyId ?? null,
        createdByUserId: actor.userId ?? null,
        notes: input.notes ?? null,
      },
    });

    const updatedConsumption = await tx.productionOrderSupplyConsumption.update({
      where: { id: consumption.id },
      data: { stockMovementId: stockMovement.id },
    });

    const warnings: InventoryWarning[] = warning ? [warning] : [];
    return { consumption: updatedConsumption, stockMovement, warnings };
  });
}

export async function registerStockAdjustment(db: DB, input: RegisterStockAdjustmentInput, actor: InventoryActor) {
  requireInventoryPermission(actor, "STOCK_ADJUST");
  if (!input.supplyId) throw new Error("Selecione o insumo.");
  const quantity = positiveDecimal(input.quantity, "A quantidade do ajuste deve ser maior que zero.");
  const movementDate = validInventoryDate(input.movementDate, "Informe uma data de ajuste válida.");
  const reason = requiredInventoryText(input.reason, "Informe o motivo do ajuste.");
  const type = input.direction === "IN" ? "POSITIVE_ADJUSTMENT" : "NEGATIVE_ADJUSTMENT";

  return db.$transaction(async (tx) => {
    const supply = await tx.supply.findUnique({ where: { id: input.supplyId }, select: { id: true } });
    if (!supply) throw new Error("Insumo não encontrado.");
    const balanceBefore = await calculateSupplyBalance(tx, supply.id);
    const projectedBalance = input.direction === "IN" ? balanceBefore.plus(quantity) : balanceBefore.minus(quantity);
    const warning = negativeStockWarning(supply.id, projectedBalance);
    const stockMovement = await tx.stockMovement.create({
      data: {
        supplyId: supply.id,
        type,
        direction: input.direction,
        quantity,
        movementDate,
        reason,
        notes: input.notes ?? null,
        createdByUserId: actor.userId ?? null,
      },
    });
    const warnings: InventoryWarning[] = warning ? [warning] : [];
    return { stockMovement, warnings };
  });
}
