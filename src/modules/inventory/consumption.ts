import { Prisma } from "@/generated/prisma";

export type SupplyConsumptionStatus = "NOT_STARTED" | "PARTIAL" | "AS_PLANNED" | "ABOVE_PLANNED" | "UNPLANNED";

export type ConsumptionQuantity = {
  quantity: Prisma.Decimal | string;
};

export const supplyConsumptionStatusLabels: Record<SupplyConsumptionStatus, string> = {
  NOT_STARTED: "Não iniciado",
  PARTIAL: "Parcial",
  AS_PLANNED: "Conforme previsto",
  ABOVE_PLANNED: "Acima do previsto",
  UNPLANNED: "Sem previsão",
};

export const supplyConsumptionStatusVariants = {
  NOT_STARTED: "neutral",
  PARTIAL: "info",
  AS_PLANNED: "success",
  ABOVE_PLANNED: "warning",
  UNPLANNED: "warning",
} as const;

export function sumSupplyConsumptions(consumptions: ConsumptionQuantity[]) {
  return consumptions.reduce((sum, item) => sum.plus(item.quantity), new Prisma.Decimal(0));
}

export function supplyConsumptionDifference(plannedQuantity: Prisma.Decimal | string | null | undefined, consumedQuantity: Prisma.Decimal | string) {
  if (!plannedQuantity) return null;
  return new Prisma.Decimal(plannedQuantity).minus(consumedQuantity);
}

export function supplyConsumptionStatus(plannedQuantity: Prisma.Decimal | string | null | undefined, consumedQuantity: Prisma.Decimal | string): SupplyConsumptionStatus {
  const consumed = new Prisma.Decimal(consumedQuantity);
  if (!plannedQuantity) return consumed.gt(0) ? "UNPLANNED" : "NOT_STARTED";
  const planned = new Prisma.Decimal(plannedQuantity);
  if (consumed.eq(0)) return "NOT_STARTED";
  if (consumed.lt(planned)) return "PARTIAL";
  if (consumed.eq(planned)) return "AS_PLANNED";
  return "ABOVE_PLANNED";
}
