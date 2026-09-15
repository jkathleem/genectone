import type { Prisma, PrismaClient } from "@/generated/prisma";
import { adjustedProductPrice, type BulkPriceMode } from "./domain";

type DB = Pick<PrismaClient, "$transaction">;

export async function updateProductPrices(db: DB, ids: string[], mode: BulkPriceMode, adjustment: Prisma.Decimal) {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) throw new Error("Selecione ao menos um produto.");
  return db.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, currentUnitPrice: true } });
    if (products.length !== uniqueIds.length) throw new Error("Um dos produtos selecionados não existe.");
    const updates = products.map((product) => ({ id: product.id, price: adjustedProductPrice(product.currentUnitPrice, mode, adjustment) }));
    for (const item of updates) await tx.product.update({ where: { id: item.id }, data: { currentUnitPrice: item.price } });
    return updates;
  });
}
