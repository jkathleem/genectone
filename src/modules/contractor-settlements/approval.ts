import { Prisma, PrismaClient } from "@/generated/prisma";
import { eligibleQuantity, validSettlementQuantity } from "./domain";

type Database = Pick<PrismaClient, "$transaction">;

export function assertDraft(status: "DRAFT" | "APPROVED") {
  if (status !== "DRAFT") throw new Error("Este fechamento já foi aprovado e não pode mais ser alterado.");
}

export async function approveSettlementById(db: Database, id: string) {
  return db.$transaction(async (tx) => {
    const settlement = await tx.contractorSettlement.findUnique({ where: { id }, include: { items: true } });
    if (!settlement) throw new Error("Fechamento não encontrado.");
    assertDraft(settlement.status);
    if (!settlement.items.length) throw new Error("O fechamento precisa possuir pelo menos um item antes de ser aprovado.");
    const ids = [...new Set(settlement.items.map((item) => item.outsourcedServiceId))].sort();
    await tx.$queryRaw`SELECT "id" FROM "OutsourcedService" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`;
    const services = await tx.outsourcedService.findMany({ where: { id: { in: ids } }, include: { settlementItems: { where: { settlement: { status: "APPROVED" } }, select: { approvedQuantityIncluded: true } } } });
    for (const item of settlement.items) {
      const service = services.find((candidate) => candidate.id === item.outsourcedServiceId);
      if (!service || service.contractorId !== settlement.contractorId) throw new Error("O serviço não pertence ao terceirizado deste fechamento.");
      const used = service.settlementItems.reduce((sum, settledItem) => sum + settledItem.approvedQuantityIncluded, 0);
      if (!validSettlementQuantity(item.approvedQuantityIncluded, eligibleQuantity(service.approvedQuantity, used))) throw new Error("A quantidade informada ultrapassa o saldo disponível para fechamento.");
    }
    return tx.contractorSettlement.update({ where: { id }, data: { status: "APPROVED", approvedAt: new Date() } });
  });
}
