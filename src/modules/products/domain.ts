import { Prisma } from "@/generated/prisma";

export function expectedSupplyQuantity(
  productionOrderQuantity: number,
  quantityPerBase: Prisma.Decimal | string | null,
  baseQuantity: number | null,
) {
  if (quantityPerBase === null && baseQuantity === null) return null;
  if (quantityPerBase === null || baseQuantity === null) throw new Error("Informe quantidade e base de consumo em conjunto.");
  if (!Number.isInteger(productionOrderQuantity) || productionOrderQuantity <= 0) throw new Error("A quantidade da OP deve ser inteira e positiva.");
  if (!Number.isInteger(baseQuantity) || baseQuantity <= 0) throw new Error("A quantidade base deve ser inteira e positiva.");
  const perBase = new Prisma.Decimal(quantityPerBase);
  if (!perBase.gt(0)) throw new Error("O consumo por base deve ser positivo.");
  return perBase.mul(productionOrderQuantity).div(baseQuantity);
}
