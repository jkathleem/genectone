import { Prisma } from "@/generated/prisma";

export type ProductionOrderLifecycleStatus = "EM_PRODUCAO" | "CONCLUIDA" | "FATURADA" | "RECEBIDA";

type LifecycleFacts = {
  completedAt?: Date | null;
  billing?: null | {
    accountReceivable?: null | {
      originalAmount: Prisma.Decimal | string;
      allocations: { amount: Prisma.Decimal | string; receipt?: { reversal?: object | null } }[];
    };
  };
};

export function productionOrderLifecycleStatus(facts: LifecycleFacts): ProductionOrderLifecycleStatus {
  if (facts.billing) {
    const receivable = facts.billing.accountReceivable;
    if (receivable) {
      const received = receivable.allocations.filter((allocation) => !allocation.receipt?.reversal).reduce(
        (sum, allocation) => sum.add(allocation.amount),
        new Prisma.Decimal(0),
      );
      if (received.gte(receivable.originalAmount)) return "RECEBIDA";
    }
    return "FATURADA";
  }
  return facts.completedAt ? "CONCLUIDA" : "EM_PRODUCAO";
}

export type ServiceProgressStatus = "PENDENTE" | "PARCIAL" | "CONCLUIDO";

export function externalServiceProgress(sent: number, returned: number): ServiceProgressStatus {
  if (sent <= 0 || returned <= 0) return "PENDENTE";
  return returned >= sent ? "CONCLUIDO" : "PARCIAL";
}

export function plannedSupplyQuantity(
  orderQuantity: number,
  quantityPerBase: Prisma.Decimal | string | null,
  baseQuantity: number | null,
) {
  if (!quantityPerBase || !baseQuantity || baseQuantity <= 0) return null;
  return new Prisma.Decimal(orderQuantity).mul(quantityPerBase).div(baseQuantity);
}

export function isOutsourcedServiceLate(
  expectedReturnDate: Date | null,
  sent: number,
  returned: number,
  today = new Date(),
) {
  if (!expectedReturnDate || sent <= returned) return false;
  const expected = expectedReturnDate.toISOString().slice(0, 10);
  const current = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(today);
  return expected < current;
}

export function serviceProgressSummary(statuses: ServiceProgressStatus[]) {
  return { completed: statuses.filter((status) => status === "CONCLUIDO").length, total: statuses.length };
}
