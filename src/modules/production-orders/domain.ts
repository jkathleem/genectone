import { Prisma } from "@/generated/prisma";

export type ProductionOrderLifecycleStatus = "EM_PRODUCAO" | "CONCLUIDA" | "FATURADA" | "RECEBIDA";

type LifecycleFacts = {
  completedAt?: Date | null;
  billing?: null | {
    accountReceivable?: null | {
      originalAmount: Prisma.Decimal | string;
      allocations: { amount: Prisma.Decimal | string }[];
    };
  };
};

export function productionOrderLifecycleStatus(facts: LifecycleFacts): ProductionOrderLifecycleStatus {
  if (facts.billing) {
    const receivable = facts.billing.accountReceivable;
    if (receivable) {
      const received = receivable.allocations.reduce(
        (sum, allocation) => sum.add(allocation.amount),
        new Prisma.Decimal(0),
      );
      if (received.gte(receivable.originalAmount)) return "RECEBIDA";
    }
    return "FATURADA";
  }
  return facts.completedAt ? "CONCLUIDA" : "EM_PRODUCAO";
}
