import { Prisma, PrismaClient } from "@/generated/prisma";
import { plannedSupplyQuantity } from "./domain";

type DB = Pick<PrismaClient, "$transaction">;

export type CreateProductionOrderInput = {
  number: string;
  entryDate: Date;
  companyId: string;
  customerId?: string | null;
  productId: string;
  quantity: number;
  isUrgent: boolean;
  expectedCompletionDate?: Date | null;
  notes?: string | null;
  createdByUserId?: string | null;
};

export async function createProductionOrderWorkspace(db: DB, input: CreateProductionOrderInput) {
  return db.$transaction(async (tx) => {
    const [company, product] = await Promise.all([
      tx.company.findFirst({ where: { id: input.companyId, active: true }, select: { id: true } }),
      tx.product.findFirst({
        where: { id: input.productId, active: true },
        include: { customer: { select: { id: true, active: true } }, supplies: { include: { supply: true } } },
      }),
    ]);
    if (!company) throw new Error("A empresa selecionada não está disponível.");
    if (!product) throw new Error("O Produto selecionado não está disponível.");
    if (product.currentUnitPrice === null) throw new Error("Configure o preço atual do Produto antes de criar a OP.");
    const customerId = input.customerId || product.customerId;
    if (!customerId) throw new Error("O Produto não possui Cliente padrão. Selecione o Cliente efetivo da OP.");
    const customer = await tx.customer.findFirst({ where: { id: customerId, active: true }, select: { id: true } });
    if (!customer) throw new Error("O Cliente selecionado não está disponível.");

    return tx.productionOrder.create({
      data: {
        number: input.number,
        entryDate: input.entryDate,
        companyId: input.companyId,
        customerId,
        productId: input.productId,
        quantity: input.quantity,
        unitPrice: product.currentUnitPrice,
        isUrgent: input.isUrgent,
        expectedCompletionDate: input.expectedCompletionDate || null,
        notes: input.notes?.trim() || null,
        createdByUserId: input.createdByUserId || null,
        supplies: {
          create: product.supplies.map((item) => ({
            supplyId: item.supplyId,
            supplyNameSnapshot: item.supply.name,
            unitSnapshot: item.supply.unit,
            quantityPerBaseSnapshot: item.quantityPerBase,
            baseQuantitySnapshot: item.baseQuantity,
            plannedQuantity: plannedSupplyQuantity(input.quantity, item.quantityPerBase, item.baseQuantity),
            notes: item.notes,
          })),
        },
      },
      include: { supplies: true },
    });
  });
}

export async function updateOrderSupplyPlan(db: DB, orderId: string, itemId: string, plannedQuantity: Prisma.Decimal) {
  if (!plannedQuantity.gt(0)) throw new Error("A quantidade prevista do insumo deve ser maior que zero.");
  return db.$transaction(async (tx) => {
    const item = await tx.productionOrderSupply.findFirst({ where: { id: itemId, productionOrderId: orderId } });
    if (!item) throw new Error("Insumo da OP não encontrado.");
    return tx.productionOrderSupply.update({ where: { id: item.id }, data: { plannedQuantity } });
  });
}

export async function completeProductionOrderRecord(db: DB, orderId: string, completionDate: Date, completedByUserId?: string | null) {
  if (Number.isNaN(completionDate.getTime())) throw new Error("Informe uma data de conclusão válida.");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "ProductionOrder" WHERE "id" = ${orderId} FOR UPDATE`;
    const order = await tx.productionOrder.findUnique({ where: { id: orderId }, select: { completedAt: true } });
    if (!order) throw new Error("OP não encontrada.");
    if (order.completedAt) throw new Error("A OP já está concluída e não pode ser reaberta nesta etapa.");
    return tx.productionOrder.update({ where: { id: orderId }, data: { completedAt: completionDate, completedByUserId: completedByUserId || null } });
  });
}
